import { MdClose } from "react-icons/md";
import { PictureFrame } from "../../constants/PictureFrame/page";
import type {
  NameEffect,
  ProfileFrame,
} from "../../constants/ProfileStyle/page";
import type { ContactStatus } from "../../constants/ContactStatusFrame/page";
import { resolveApiAssetUrl } from "../../api/client";

export interface MessengerNotificationData {
  id: number;
  contactId: string;
  contactName: string;
  avatarUrl?: string;
  profileFrame?: ProfileFrame;
  nameEffect?: NameEffect;
  status?: ContactStatus;
  kind: "online" | "message";
  text: string;
}

interface MessengerNotificationProps {
  notification: MessengerNotificationData;
  onClose: () => void;
  onActivate?: () => void;
  animate?: boolean;
  showCloseButton?: boolean;
}

function MessengerNotification({
  notification,
  onClose,
  onActivate,
  animate = true,
  showCloseButton = true,
}: MessengerNotificationProps) {
  return (
    <aside
      role="status"
      aria-live="polite"
      onClick={onActivate}
      className={`${animate ? "animate-msn-toast" : ""} ${onActivate ? "cursor-pointer" : ""} flex h-[170px] w-[310px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-[#6694ad] bg-gradient-to-b from-[#f8fcfe] via-[#edf7fb] to-[#d8edf6] font-sans text-[#213a52] antialiased shadow-[0_5px_16px_rgba(30,66,91,0.38)] [text-rendering:geometricPrecision]`}
    >
      <div className="msn-titlebar flex h-8 items-center gap-2 border-b border-[#7fa9bf] bg-gradient-to-r from-[#8fcbe8] via-[#d4eefb] to-[#f4fbfe] px-3">
        <span className="msn-title-orbs flex items-center" aria-hidden="true">
          <span className="msn-title-orb msn-title-orb--blue h-2.5 w-2.5 -translate-x-[0.5px]" />
          <span className="msn-title-orb msn-title-orb--green z-10 -ml-1 h-3.5 w-3.5" />
        </span>
        <span className="flex-1 text-xs font-semibold text-[#315b72]">
          MSN Messenger
        </span>
        {showCloseButton && (
          <button
            type="button"
            aria-label="Fechar notificação"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="rounded p-0.5 text-[#51758a] transition-colors hover:bg-white/60 hover:text-[#27495e]"
          >
            <MdClose size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 px-3 py-3 text-left">
        <div className="h-20 w-20 shrink-0">
          <PictureFrame
            frame="status"
            status={notification.kind === "online"
              ? "online"
              : (notification.status ?? "online")}
            imageSrc={resolveApiAssetUrl(notification.avatarUrl) || undefined}
            imageAlt={`Foto de perfil de ${notification.contactName}`}
            displayName={notification.contactName}
            imageSize={68}
          />
        </div>

        <div className="min-w-0 flex-1">
          {notification.kind === "message" ? (
            <>
              <p
                className="truncate text-sm font-semibold text-[#17364d]"
              >
                {notification.contactName} diz:
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-[#34556c]">
                {notification.text}
              </p>
            </>
          ) : (
            <>
              <p
                className="truncate text-sm font-semibold text-[#17364d]"
              >
                {notification.contactName}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-[#34556c]">
                {notification.text}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-auto px-3 pb-2 text-right text-[11px] font-medium">
        <button
          type="button"
          className="cursor-pointer text-[#1670c5] hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Opções
        </button>
      </div>
    </aside>
  );
}

export { MessengerNotification };
