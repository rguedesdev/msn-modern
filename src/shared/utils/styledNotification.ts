import { invoke } from "@tauri-apps/api/core";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { currentMonitor } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { MessengerNotificationData } from "../components/MessengerNotification";

const NOTIFICATION_WIDTH = 310;
const NOTIFICATION_HEIGHT = 160;
const NOTIFICATION_MARGIN = 12;
const NOTIFICATION_WINDOW_HEIGHT = NOTIFICATION_HEIGHT + NOTIFICATION_MARGIN;
const NOTIFICATION_ANIMATION_STEPS = 10;
const NOTIFICATION_ANIMATION_INTERVAL_MS = 24;

function wait(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

export async function showStyledNotificationWindow(
  notification: MessengerNotificationData,
) {
  const usesWayland = await invoke<boolean>("uses_wayland");
  const monitor = await currentMonitor();
  if (!monitor) {
    throw new Error("Não foi possível identificar o monitor atual.");
  }

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
    kind: notification.kind,
    text: notification.text,
    animateContent: String(usesWayland),
  });

  const finalX =
    workAreaX + workAreaWidth - notificationWidth - notificationMargin;
  const finalY = workAreaY + workAreaHeight - notificationHeight;
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
    void notificationWindow.once("tauri://created", async () => {
      try {
        if (!usesWayland) {
          await notificationWindow.setPosition(
            new PhysicalPosition(finalX, initialY),
          );
        }

        await notificationWindow.show();

        if (usesWayland) {
          resolve(true);
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
        resolve(true);
      } catch (error) {
        console.error("Erro ao animar a janela de notificação:", error);
        void notificationWindow.close();
        resolve(false);
      }
    });

    void notificationWindow.once("tauri://error", (event) => {
      console.error("Erro ao criar a janela de notificação:", event.payload);
      resolve(false);
    });
  });
}
