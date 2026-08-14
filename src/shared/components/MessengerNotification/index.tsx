import { MdClose } from "react-icons/md";

export interface MessengerNotificationData {
  id: number;
  contactId: number;
  contactName: string;
  kind: "online" | "message";
  text: string;
}

interface MessengerNotificationProps {
  notification: MessengerNotificationData;
  onClose: () => void;
  animate?: boolean;
  showCloseButton?: boolean;
}

function MessengerNotification({
  notification,
  onClose,
  animate = true,
  showCloseButton = true,
}: MessengerNotificationProps) {
  return (
    <aside
      role="status"
      aria-live="polite"
      className={`${animate ? "animate-msn-toast" : ""} h-full w-full overflow-hidden rounded-[12px] border border-[#6694ad] bg-gradient-to-b from-[#f8fcfe] via-[#edf7fb] to-[#d8edf6] font-sans text-[#213a52] antialiased shadow-[0_5px_16px_rgba(30,66,91,0.38)] [text-rendering:geometricPrecision]`}
    >
      <div className="flex h-8 items-center gap-2 border-b border-[#7fa9bf] bg-gradient-to-r from-[#8fcbe8] via-[#d4eefb] to-[#f4fbfe] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <span className="flex items-end" aria-hidden="true">
          <span className="h-3.5 w-3.5 rounded-full bg-[#71bf45] ring-1 ring-white" />
          <span className="-ml-1 h-3 w-3 rounded-full bg-[#43a9d7] ring-1 ring-white" />
        </span>
        <span className="flex-1 text-xs font-semibold text-[#315b72]">
          MSN Messenger
        </span>
        {showCloseButton && (
          <button
            type="button"
            aria-label="Fechar notificação"
            onClick={onClose}
            className="rounded p-0.5 text-[#51758a] transition-colors hover:bg-white/60 hover:text-[#27495e]"
          >
            <MdClose size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 px-3 py-3 text-left">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[#5596ae] bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,0.25)]">
          <div className="flex h-full w-full items-center justify-center rounded bg-gradient-to-b from-[#e5f3f9] to-[#9cc9dc] text-2xl font-semibold text-[#567b8c]">
            {notification.contactName.charAt(0).toUpperCase()}
          </div>
          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#17364d]">
            {notification.contactName}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-4 text-[#34556c]">
            {notification.kind === "message"
              ? `enviou uma mensagem: “${notification.text}”`
              : notification.text}
          </p>
        </div>
      </div>

      <div className="px-3 pb-2 text-right text-[11px] font-medium text-[#1670c5]">
        {notification.kind === "message"
          ? "Nova mensagem recebida"
          : "Contato disponível"}
      </div>
    </aside>
  );
}

export { MessengerNotification };
