import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  MessengerNotification,
  type MessengerNotificationData,
} from "../../shared/components/MessengerNotification";
import { toContactStatus } from "../../shared/constants/ContactStatusFrame/page";
import {
  isNameEffect,
  isProfileFrame,
} from "../../shared/constants/ProfileStyle/page";
import {
  OPEN_CONVERSATION_FROM_NOTIFICATION_EVENT,
  type OpenConversationFromNotificationPayload,
} from "../../shared/constants/NotificationEvents";

function NotificationWindow() {
  const [searchParams] = useSearchParams();
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const profileFrameParam = searchParams.get("profileFrame");
  const nameEffectParam = searchParams.get("nameEffect");
  const notification: MessengerNotificationData = {
    id: Number(searchParams.get("id")) || 0,
    contactId: searchParams.get("contactId") || "",
    contactName: searchParams.get("contactName") || "Contato",
    avatarUrl: searchParams.get("avatarUrl") || "",
    profileFrame: isProfileFrame(profileFrameParam) ? profileFrameParam : "status",
    nameEffect: isNameEffect(nameEffectParam) ? nameEffectParam : "default",
    status: toContactStatus(searchParams.get("status") || "online"),
    kind: searchParams.get("kind") === "message" ? "message" : "online",
    text: searchParams.get("text") || "",
  };
  const shouldAnimateContent = searchParams.get("animateContent") === "true";

  const openConversation = async () => {
    try {
      await emitTo<OpenConversationFromNotificationPayload>(
        "main",
        OPEN_CONVERSATION_FROM_NOTIFICATION_EVENT,
        { conversationId: notification.contactId },
      );
    } catch (error) {
      console.error("Erro ao abrir conversa pela notificação:", error);
    } finally {
      await appWindow.close();
    }
  };

  useEffect(() => {
    const previousHtmlBackground = document.documentElement.style.background;
    const previousBodyBackground = document.body.style.background;

    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    void appWindow.setShadow(false);

    const closeTimer = window.setTimeout(() => {
      void appWindow.close();
    }, 5_000);

    return () => {
      window.clearTimeout(closeTimer);
      document.documentElement.style.background = previousHtmlBackground;
      document.body.style.background = previousBodyBackground;
    };
  }, [appWindow]);

  return (
    <main className="flex h-screen w-screen items-end bg-transparent pb-[15px]">
      <div className="overflow-hidden rounded-[12px] bg-transparent">
        <MessengerNotification
          notification={notification}
          onClose={() => void appWindow.close()}
          onActivate={() => void openConversation()}
          animate={shouldAnimateContent}
        />
      </div>
    </main>
  );
}

export default NotificationWindow;
