import { invoke } from "@tauri-apps/api/core";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import {
  availableMonitors,
  currentMonitor,
  primaryMonitor,
  type Monitor,
} from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { MessengerNotificationData } from "../components/MessengerNotification";

const NOTIFICATION_WIDTH = 310;
const NOTIFICATION_HEIGHT = 170;
const NOTIFICATION_MARGIN = 12;
const NOTIFICATION_WINDOW_HEIGHT = NOTIFICATION_HEIGHT + NOTIFICATION_MARGIN;
const NOTIFICATION_STACK_GAP = 6;
const NOTIFICATION_ANIMATION_STEPS = 10;
const NOTIFICATION_ANIMATION_INTERVAL_MS = 24;
const NOTIFICATION_SLOT_LIFETIME_MS = 6_000;
const activeNotificationSlots = new Set<number>();
let notificationCreationQueue: Promise<unknown> = Promise.resolve();

function reserveNotificationSlot() {
  let slot = 0;
  while (activeNotificationSlots.has(slot)) slot += 1;
  activeNotificationSlots.add(slot);
  return slot;
}

function wait(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

async function getNotificationMonitor(): Promise<Monitor | null> {
  try {
    const monitor = await currentMonitor();
    if (monitor) return monitor;
  } catch (error) {
    console.error("Não foi possível obter o monitor atual:", error);
  }

  try {
    const monitor = await primaryMonitor();
    if (monitor) return monitor;
  } catch (error) {
    console.error("Não foi possível obter o monitor principal:", error);
  }

  try {
    return (await availableMonitors())[0] ?? null;
  } catch (error) {
    console.error("Não foi possível listar os monitores:", error);
    return null;
  }
}

async function createStyledNotificationWindow(
  notification: MessengerNotificationData,
) {
  const usesWayland = await invoke<boolean>("uses_wayland");
  const monitor = await getNotificationMonitor();
  if (!monitor) {
    throw new Error("Não foi possível identificar o monitor atual.");
  }

  const notificationSlot = reserveNotificationSlot();
  let slotReleased = false;
  const releaseSlot = () => {
    if (slotReleased) return;
    slotReleased = true;
    activeNotificationSlots.delete(notificationSlot);
  };
  const slotReleaseTimer = window.setTimeout(
    releaseSlot,
    NOTIFICATION_SLOT_LIFETIME_MS,
  );

  const workAreaX = monitor.workArea.position.x;
  const workAreaY = monitor.workArea.position.y;
  const workAreaWidth = monitor.workArea.size.width;
  const workAreaHeight = monitor.workArea.size.height;
  const notificationWidth = Math.round(
    NOTIFICATION_WIDTH * monitor.scaleFactor,
  );
  const notificationHeight = Math.round(
    NOTIFICATION_WINDOW_HEIGHT * monitor.scaleFactor,
  );
  const notificationMargin = Math.round(
    NOTIFICATION_MARGIN * monitor.scaleFactor,
  );
  const searchParams = new URLSearchParams({
    id: String(notification.id),
    contactId: String(notification.contactId),
    contactName: notification.contactName,
    avatarUrl: notification.avatarUrl ?? "",
    profileFrame: notification.profileFrame ?? "status",
    nameEffect: notification.nameEffect ?? "default",
    status: notification.status ?? "online",
    kind: notification.kind,
    text: notification.text,
    animateContent: String(usesWayland),
  });

  const finalX =
    workAreaX + workAreaWidth - notificationWidth - notificationMargin;
  const baseFinalY = workAreaY + workAreaHeight - notificationHeight;
  const stackStep = Math.round(
    (NOTIFICATION_HEIGHT + NOTIFICATION_STACK_GAP) * monitor.scaleFactor,
  );
  const finalY = baseFinalY - notificationSlot * stackStep;
  const initialY = workAreaY + workAreaHeight;
  const notificationWindow = new WebviewWindow(
    `msn-notification-${notification.id}`,
    {
      url: `index.html#/notification?${searchParams.toString()}`,
      title: "MSN Messenger",
      width: NOTIFICATION_WIDTH,
      height: NOTIFICATION_WINDOW_HEIGHT,
      decorations: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      closable: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focus: false,
      shadow: false,
      visible: false,
      transparent: true,
      backgroundColor: [0, 0, 0, 0],
    },
  );

  return new Promise<boolean>((resolve) => {
    let isSettled = false;
    let isRevealRunning = false;
    let recoveryAttempts = 0;
    let recoveryTimer: number | undefined;

    const finish = (result: boolean) => {
      if (isSettled) return;
      isSettled = true;
      if (recoveryTimer !== undefined) window.clearTimeout(recoveryTimer);
      resolve(result);
    };

    const reveal = async () => {
      if (isSettled || isRevealRunning) return;
      isRevealRunning = true;

      try {
        if (!usesWayland) {
          await notificationWindow.setPosition(
            new PhysicalPosition(finalX, initialY),
          );
        }

        await notificationWindow.show();

        if (usesWayland) {
          finish(true);
          return;
        }

        for (let step = 1; step <= NOTIFICATION_ANIMATION_STEPS; step += 1) {
          const progress = step / NOTIFICATION_ANIMATION_STEPS;
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          const y = initialY + (finalY - initialY) * easedProgress;
          await notificationWindow.setPosition(
            new PhysicalPosition(finalX, Math.round(y)),
          );
          await wait(NOTIFICATION_ANIMATION_INTERVAL_MS);
        }

        await notificationWindow.setPosition(
          new PhysicalPosition(finalX, finalY),
        );
        finish(true);
      } catch (error) {
        isRevealRunning = false;
        recoveryAttempts += 1;
        console.error("Erro ao revelar a janela de notificação:", error);

        if (recoveryAttempts >= 4) {
          window.clearTimeout(slotReleaseTimer);
          releaseSlot();
          void notificationWindow.close();
          finish(false);
          return;
        }

        recoveryTimer = window.setTimeout(() => void reveal(), 500);
      }
    };

    void notificationWindow.once("tauri://created", () => void reveal());

    // Recuperação para o caso de o evento de criação não chegar ao WebView
    // principal. A janela continua oculta até esta tentativa, evitando flashes.
    recoveryTimer = window.setTimeout(() => void reveal(), 750);

    void notificationWindow.once("tauri://error", (event) => {
      console.error("Erro ao criar a janela de notificação:", event.payload);
      window.clearTimeout(slotReleaseTimer);
      releaseSlot();
      finish(false);
    });
  });
}

export function showStyledNotificationWindow(
  notification: MessengerNotificationData,
): Promise<boolean> {
  const creation = notificationCreationQueue.then(() =>
    createStyledNotificationWindow(notification),
  );
  notificationCreationQueue = creation.catch(() => undefined);
  return creation;
}
