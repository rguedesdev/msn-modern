import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  MessengerNotification,
  type MessengerNotificationData,
} from "../../shared/components/MessengerNotification";

function NotificationWindow() {
  const [searchParams] = useSearchParams();
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const notification: MessengerNotificationData = {
    id: Number(searchParams.get("id")) || 0,
    contactId: searchParams.get("contactId") || "",
    contactName: searchParams.get("contactName") || "Contato",
    kind: searchParams.get("kind") === "message" ? "message" : "online",
    text: searchParams.get("text") || "",
  };
  const shouldAnimateContent = searchParams.get("animateContent") === "true";

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
    <main className="h-screen w-screen bg-transparent pb-3">
      <div className="h-full w-full overflow-hidden rounded-[12px] bg-transparent">
        <MessengerNotification
          notification={notification}
          onClose={() => void appWindow.close()}
          animate={shouldAnimateContent}
        />
      </div>
    </main>
  );
}

export default NotificationWindow;
