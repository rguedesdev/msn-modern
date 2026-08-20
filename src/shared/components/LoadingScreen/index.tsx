import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauri } from "@tauri-apps/api/core";
import { MdClose, MdCropSquare, MdMinimize } from "react-icons/md";

import MSNLogo3 from "../../../assets/images/msn3.jpg";
import MessengerLogo from "../../../assets/images/messenger.png";

interface LoadingScreenProps {
  frameTop?: number;
}

function LoadingScreen({ frameTop }: LoadingScreenProps) {
  const appWindow = isTauri() ? getCurrentWebviewWindow() : null;
  const alignedWithLogin = frameTop !== undefined;

  const loadingContent = (
    <>
      <div className="relative rounded-[18px] border border-[#6694ad] bg-white p-2 shadow-[0_4px_12px_rgba(38,79,103,0.2)]">
        <img
          src={MSNLogo3}
          className="h-[118px] w-[118px] rounded-[12px] object-contain"
          alt="MSN Messenger"
        />
      </div>

      <img
        src={MessengerLogo}
        className="relative mt-10 h-auto w-[235px] object-contain"
        alt="MSN Messenger"
      />

      <div className="relative mt-8 h-1.5 w-full overflow-hidden rounded-full border border-white/80 bg-[#9abaca]/45 shadow-inner">
        <div className="absolute left-[-40%] top-0 h-full w-[40%] rounded-full bg-gradient-to-r from-[#72c8e8] to-[#3195c2] animate-[loading_1.2s_linear_infinite]" />
      </div>

      <p className="relative mt-3 text-xs text-[#67899a]">Entrando...</p>
    </>
  );

  return (
    <section className="h-screen w-screen bg-transparent font-sans antialiased">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[14px] border border-[#6694ad] bg-gradient-to-b from-[#f8fcfe] via-[#edf7fb] to-[#d8edf6]">
        <header
          data-tauri-drag-region
          className="msn-titlebar flex h-9 shrink-0 select-none items-center gap-2 border-b border-[#7fa9bf] bg-gradient-to-r from-[#8fcbe8] via-[#d4eefb] to-[#f4fbfe] pl-3"
        >
          <span className="msn-title-orbs flex items-center" aria-hidden="true">
            <span className="msn-title-orb msn-title-orb--blue h-2.5 w-2.5 -translate-x-[0.5px]" />
            <span className="msn-title-orb msn-title-orb--green z-10 -ml-1 h-3.5 w-3.5" />
          </span>
          <span
            data-tauri-drag-region
            className="min-w-0 flex-1 text-xs font-semibold text-[#315b72]"
          >
            MSN Messenger
          </span>
          <div className="flex h-full items-stretch">
            <button
              type="button"
              aria-label="Minimizar"
              onClick={() => void appWindow?.minimize()}
              className="grid w-9 place-items-center text-[#426b81] transition-colors hover:bg-white/50"
            >
              <MdMinimize size={17} />
            </button>
            <button
              type="button"
              aria-label="Maximizar ou restaurar"
              onClick={() => void appWindow?.toggleMaximize()}
              className="grid w-9 place-items-center text-[#426b81] transition-colors hover:bg-white/50"
            >
              <MdCropSquare size={13} />
            </button>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => void appWindow?.close()}
              className="grid w-10 place-items-center rounded-tr-[13px] text-[#426b81] transition-colors hover:bg-[#d86161] hover:text-white"
            >
              <MdClose size={18} />
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-10">
          <span className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/60 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#67c0e6]/20 blur-3xl" />

          {alignedWithLogin ? (
            <div
              className="fixed left-10 right-10 flex flex-col items-center"
              style={{ top: frameTop }}
            >
              {loadingContent}
            </div>
          ) : loadingContent}
        </div>

        <style>{`
          @keyframes loading {
            0% { left: -40%; }
            100% { left: 100%; }
          }
        `}</style>
      </div>
    </section>
  );
}

export { LoadingScreen };
