import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useParams } from "react-router-dom";
import { useSearchParams } from "react-router-dom";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

// Componentes
import { PictureFrame } from "../../shared/constants/PictureFrame/page";
import {
  appendChatMessage,
  getChatMessages,
  type ChatMessage,
} from "../../shared/utils/chatStorage";

// Icons
import {
  MdClose,
  MdCropSquare,
  MdMinimize,
  MdOutlineVideoChat,
  MdVoiceChat,
} from "react-icons/md";
import { FaMicrophoneAlt, FaHeadphonesAlt } from "react-icons/fa";

// Imagens e Sons
import NudgeIconComparison from "../../assets/images/msn-nudge-icon-2.png";
import SmileIcon from "../../assets/images/regular-smile-transparent.png";
import WinkSmileIcon from "../../assets/images/wink-smile.png";
import WritingEyesIcon from "../../assets/images/writing-eyes-brown.png";
import AngrySmileIcon from "../../assets/images/angry-smile.png";
import NerdSmileIcon from "../../assets/images/nerd-smile.png";
import NeutralSmileIcon from "../../assets/images/neutral-smile.png";
import SurpriseSmileIcon from "../../assets/images/surprise-smile.png";
import SickSmileIcon from "../../assets/images/sick-smile.png";
import SuspectSmileIcon from "../../assets/images/suspect-smile.png";
import BoredSmileIcon from "../../assets/images/bored-smile.png";
import AnnoyedSmileIcon from "../../assets/images/annoyed-smile.png";
import AngelSmileIcon from "../../assets/images/angel-smile.png";
import OmgSmileIcon from "../../assets/images/omg-smile.png";
import RedSmileIcon from "../../assets/images/red-smile.png";
import SadSmileIcon from "../../assets/images/sad-smile.png";
import ShadesSmileIcon from "../../assets/images/shades-smile.png";
import TeethSmileIcon from "../../assets/images/teeth-smile.png";
import ConfusedSmileIcon from "../../assets/images/confused-smile.png";
import TongueSmileIcon from "../../assets/images/tongue-smile.png";
import WhatFaceIcon from "../../assets/images/what-face.png";
import DevilSmileIcon from "../../assets/images/devil-smile.png";
import DarkSmileIcon from "../../assets/images/dark-smile.jpg";
import DarkAngryIcon from "../../assets/images/dark-angry.jpg";
import nudgeSound from "../../assets/sounds/nudge.mp3";

const EMOTICONS = [
  { code: ":)", src: SmileIcon, alt: "Smile" },
  { code: ";)", src: WinkSmileIcon, alt: "Wink" },
  { code: ":-#", src: WritingEyesIcon, alt: "Don't tell anyone" },
  { code: ":-D", src: TeethSmileIcon, alt: "Open Mouthed" },
  { code: "8-|", src: NerdSmileIcon, alt: "Nerd" },
  { code: "^o)", src: NeutralSmileIcon, alt: "Sarcstic" },
  { code: "+o(", src: SickSmileIcon, alt: "Sick" },
  { code: ":@", src: AngrySmileIcon, alt: "Angry" },
  { code: ":^)", src: SuspectSmileIcon, alt: "I don't know" },
  { code: "*-)", src: BoredSmileIcon, alt: "Thinking" },
  { code: "|-)", src: AnnoyedSmileIcon, alt: "Sleepy" },
  { code: ":o", src: OmgSmileIcon, alt: "Surprised" },
  { code: ":$", src: RedSmileIcon, alt: "Embarassed" },
  { code: ":(", src: SadSmileIcon, alt: "Sad" },
  { code: "(H)", src: ShadesSmileIcon, alt: "Hot" },
  { code: ":s", src: ConfusedSmileIcon, alt: "Confused" },
  {
    code: ":p",
    src: TongueSmileIcon,
    alt: "Tongue out",
  },
  { code: ":|", src: WhatFaceIcon, alt: "Dissapointed" },
  { code: "(6)", src: DevilSmileIcon, alt: "Devil" },
  { code: ":-*", src: SurpriseSmileIcon, alt: "Secret Telling" },
  { code: "(A)", src: AngelSmileIcon, alt: "Angel" },
  { code: "(darksmile)", src: DarkSmileIcon, alt: "Dark smile" },
  { code: "(darkangry)", src: DarkAngryIcon, alt: "Dark angry" },
] as const;

type EmoticonCode = (typeof EMOTICONS)[number]["code"];

const EMOTICON_PATTERN = new RegExp(
  `(${EMOTICONS.map((emoticon) =>
    emoticon.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|")})`,
  "g",
);

function MessageContent({ text }: { text: string }) {
  return text.split(EMOTICON_PATTERN).map((part, index) => {
    const emoticon = EMOTICONS.find((item) => item.code === part);

    return emoticon ? (
      <img
        key={`${part}-${index}`}
        src={emoticon.src}
        alt={emoticon.alt}
        className="mx-0.5 inline-block h-7 w-7 align-middle object-contain"
      />
    ) : (
      part
    );
  });
}

function createEditorEmoticon(code: EmoticonCode) {
  const emoticon = EMOTICONS.find((item) => item.code === code)!;
  const image = document.createElement("img");
  image.src = emoticon.src;
  image.alt = emoticon.alt;
  image.dataset.emoticon = emoticon.code;
  image.contentEditable = "false";
  image.className =
    "mx-0.5 inline-block h-7 w-7 align-middle object-contain select-none";
  return image;
}

function serializeEditorContent(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.replaceAll("\u200B", "") ?? "";
  }

  if (node instanceof HTMLImageElement && node.dataset.emoticon) {
    return node.dataset.emoticon;
  }

  if (node instanceof HTMLBRElement) {
    return "\n";
  }

  return Array.from(node.childNodes).map(serializeEditorContent).join("");
}

function hasTypedEmoticon(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return EMOTICONS.some((emoticon) =>
      node.textContent?.includes(emoticon.code),
    );
  }

  if (node instanceof HTMLImageElement) return false;

  return Array.from(node.childNodes).some(hasTypedEmoticon);
}

function renderEditorContent(editor: HTMLDivElement, value: string) {
  const content = value.split(EMOTICON_PATTERN).map((part) => {
    const emoticon = EMOTICONS.find((item) => item.code === part);
    return emoticon
      ? createEditorEmoticon(emoticon.code)
      : document.createTextNode(part);
  });

  editor.replaceChildren(...content);
}

function placeCaretAtEnd(editor: HTMLDivElement) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function formatReceivedAt(receivedAt: number) {
  const date = new Date(receivedAt);
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const formattedTime = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${formattedDate} às ${formattedTime} hs`;
}

function ChatWindow() {
  const { id } = useParams();
  const [isNudging, setIsNudging] = useState(false);
  const [isEmoticonPickerOpen, setIsEmoticonPickerOpen] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isVideoCallExpanded, setIsVideoCallExpanded] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "requesting" | "active" | "error"
  >("idle");
  const [cameraError, setCameraError] = useState("");
  const [nativeCameraStreamUrl, setNativeCameraStreamUrl] = useState("");
  const [videoCallBounds, setVideoCallBounds] = useState<{
    top: number;
    height: number;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    id ? getChatMessages(id) : [],
  );
  const messageInputRef = useRef<HTMLDivElement>(null);
  const editorSelectionRef = useRef<Range | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatSurfaceRef = useRef<HTMLDivElement>(null);
  const messageComposerRef = useRef<HTMLDivElement>(null);
  const hasPositionedInitialMessagesRef = useRef(false);
  const nudgeAudioRef = useRef<HTMLAudioElement | null>(null);
  const appWindow = useMemo(() => getCurrentWebviewWindow(), []);

  useEffect(() => {
    const previousHtmlBackground = document.documentElement.style.background;
    const previousBodyBackground = document.body.style.background;
    let revealTimer: number | undefined;
    let isDisposed = false;

    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";

    void document.fonts.ready.then(() => {
      if (isDisposed) return;

      revealTimer = window.setTimeout(() => {
        if (isDisposed) return;
        void appWindow.show().then(() => appWindow.setFocus());
      }, 32);
    });

    return () => {
      isDisposed = true;
      if (revealTimer !== undefined) {
        window.clearTimeout(revealTimer);
      }
      document.documentElement.style.background = previousHtmlBackground;
      document.body.style.background = previousBodyBackground;
    };
  }, [appWindow]);

  const [searchParams] = useSearchParams();
  const contactStatus = searchParams.get("status");
  const contactName = searchParams.get("name") || `Contato ${id}`;
  const contactMessage = searchParams.get("message") || "";

  const contactStatusLabel =
    {
      online: "Online",
      ocupado: "Ocupado",
      ausente: "Ausente",
      invisivel: "Invisível",
      offline: "Offline",
    }[contactStatus || "offline"] ?? "Offline";

  const contactStatusColor = {
    online: "bg-green-500",
    ocupado: "bg-red-500",
    ausente: "bg-yellow-400",
    invisivel: "bg-zinc-200",
    offline: "bg-zinc-300",
  }[contactStatus || "offline"];

  const lastReceivedAt = useMemo(() => {
    const lastReceivedMessage = messages.findLast(
      (chatMessage) => chatMessage.author === "contact",
    );

    return lastReceivedMessage?.receivedAt
      ? formatReceivedAt(lastReceivedMessage.receivedAt)
      : null;
  }, [messages]);

  useEffect(() => {
    if (!isVideoCallOpen) {
      setIsVideoCallExpanded(false);
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      setIsVideoCallExpanded(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isVideoCallOpen]);

  useLayoutEffect(() => {
    if (!isVideoCallOpen) {
      setVideoCallBounds(null);
      return;
    }

    const chatSurface = chatSurfaceRef.current;
    const messagesContainer = messagesContainerRef.current;
    const messageComposer = messageComposerRef.current;

    if (!chatSurface || !messagesContainer || !messageComposer) return;

    const updateVideoCallBounds = () => {
      const surfaceRect = chatSurface.getBoundingClientRect();
      const messagesRect = messagesContainer.getBoundingClientRect();
      const composerRect = messageComposer.getBoundingClientRect();

      setVideoCallBounds({
        top: messagesRect.top - surfaceRect.top,
        height: composerRect.bottom - messagesRect.top,
      });
    };

    updateVideoCallBounds();

    const resizeObserver = new ResizeObserver(updateVideoCallBounds);
    resizeObserver.observe(chatSurface);
    resizeObserver.observe(messagesContainer);
    resizeObserver.observe(messageComposer);
    window.addEventListener("resize", updateVideoCallBounds);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateVideoCallBounds);
    };
  }, [isVideoCallOpen]);

  useEffect(() => {
    if (!isVideoCallOpen) {
      setCameraStatus("idle");
      setNativeCameraStreamUrl("");
      return;
    }

    let isDisposed = false;
    let cameraStartDelayId: number | undefined;
    setCameraStatus("requesting");
    setCameraError("");
    setNativeCameraStreamUrl("");

    async function startCamera() {
      try {
        const streamUrl = await invoke<string>("start_native_camera");
        if (isDisposed) {
          void invoke("stop_native_camera");
          return;
        }

        setNativeCameraStreamUrl(`${streamUrl}?session=${Date.now()}`);
        setCameraStatus("active");
      } catch (error) {
        if (isDisposed) return;
        console.error("Não foi possível iniciar a câmera:", error);
        setCameraError(error instanceof Error ? error.message : String(error));
        setCameraStatus("error");
      }
    }

    cameraStartDelayId = window.setTimeout(() => {
      void startCamera();
    }, 220);

    return () => {
      isDisposed = true;
      if (cameraStartDelayId !== undefined) {
        window.clearTimeout(cameraStartDelayId);
      }
      setNativeCameraStreamUrl("");
      void invoke("stop_native_camera");
    };
  }, [isVideoCallOpen]);

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) return;

    const sentMessage: ChatMessage = {
      id: Date.now(),
      author: "me",
      text: trimmedMessage,
    };

    setMessages((currentMessages) =>
      id
        ? appendChatMessage(id, sentMessage)
        : [...currentMessages, sentMessage],
    );
    setMessage("");
    messageInputRef.current?.replaceChildren();
  };

  const saveEditorSelection = () => {
    const editor = messageInputRef.current;
    const selection = window.getSelection();

    if (
      editor &&
      selection?.rangeCount &&
      editor.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      editorSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const handleSelectEmoticon = (code: EmoticonCode) => {
    const editor = messageInputRef.current;
    if (!editor) return;

    editor.focus();

    const selection = window.getSelection();
    const range = editorSelectionRef.current ?? document.createRange();

    if (!editorSelectionRef.current) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    const emoticon = createEditorEmoticon(code);
    range.deleteContents();
    range.insertNode(emoticon);
    range.setStartAfter(emoticon);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    editorSelectionRef.current = range.cloneRange();

    setMessage(serializeEditorContent(editor));
    setIsEmoticonPickerOpen(false);
  };

  useLayoutEffect(() => {
    const messagesContainer = messagesContainerRef.current;

    if (!messagesContainer) return;

    if (!hasPositionedInitialMessagesRef.current) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      hasPositionedInitialMessagesRef.current = true;
      return;
    }

    messagesContainer.scrollTo({
      behavior: "smooth",
      top: messagesContainer.scrollHeight,
    });
  }, [messages]);

  useEffect(() => {
    const audio = new Audio(nudgeSound);
    audio.preload = "auto";
    audio.volume = 1;
    audio.load();
    nudgeAudioRef.current = audio;

    return () => {
      audio.pause();
      nudgeAudioRef.current = null;
    };
  }, []);

  // Guarda o estado em um Ref para o useEffect ler o valor atualizado sem precisar se reiniciar
  const isNudgingRef = useRef(isNudging);
  useEffect(() => {
    isNudgingRef.current = isNudging;
  }, [isNudging]);

  // EFEITO VISUAL E SONORO
  const triggerNudgeEffect = useCallback(async () => {
    if (isNudgingRef.current) return;
    isNudgingRef.current = true;
    setIsNudging(true);

    try {
      // Primeiro acorda a WebView para que o áudio volte a ser processado.
      await appWindow.unminimize();
      await appWindow.show();
      await appWindow.setFocus();
    } catch (error) {
      console.error("Erro ao focar janela nativa:", error);
    }

    try {
      const audio = nudgeAudioRef.current;

      if (!audio) {
        throw new Error("O áudio de chamar atenção ainda não foi carregado.");
      }

      audio.pause();
      audio.currentTime = 0;
      await audio.play();
    } catch (audioError) {
      console.error("Erro ao reproduzir o som:", audioError);
    }

    setTimeout(() => {
      isNudgingRef.current = false;
      setIsNudging(false);
    }, 500);
  }, [appWindow]);

  // AÇÃO DO REMETENTE
  // const handleSendNudge = async () => {
  //   // Treme a sua própria tela (feedback local)
  //   await triggerNudgeEffect();

  //   // Dispara o evento passando o label da janela atual
  //   await emit("msn-nudge-received", {
  //     chatId: id,
  //     senderLabel: appWindow.label,
  //   });
  // };
  const handleSendNudge = async () => {
    // Status permitidos no MSN clássico
    const allowedNudgeStatus = ["online", "ocupado", "ausente"];

    // bloqueia invisível/offline
    if (!contactStatus || !allowedNudgeStatus.includes(contactStatus)) {
      console.log("Nudge bloqueado.");
      return;
    }

    // efeito local
    await triggerNudgeEffect();

    // envia para outra janela
    await emit("msn-nudge-received", {
      chatId: id,
      senderLabel: appWindow.label,
    });
  };

  // OUVINTE DO DESTINATÁRIO
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupListener() {
      unlisten = await listen("msn-nudge-received", (event) => {
        const payload = event.payload as {
          chatId: string;
          senderLabel: string;
        };

        // ignora evento vindo da própria janela
        if (payload && payload.senderLabel === appWindow.label) {
          return;
        }

        // ignora chats diferentes
        if (payload.chatId !== id) {
          return;
        }

        console.log("Nudge interceptado da outra janela!");

        triggerNudgeEffect();
      });
    }

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [appWindow.label, id, triggerNudgeEffect]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupMessageListener() {
      unlisten = await listen("msn-message-received", (event) => {
        const payload = event.payload as {
          chatId: string;
          message: ChatMessage;
        };

        if (payload.chatId !== id) return;

        setMessages((currentMessages) => {
          const existingMessageIndex = currentMessages.findIndex(
            (message) => message.id === payload.message.id,
          );

          if (existingMessageIndex === -1) {
            return [...currentMessages, payload.message];
          }

          const existingMessage = currentMessages[existingMessageIndex];
          if (existingMessage.receivedAt || !payload.message.receivedAt) {
            return currentMessages;
          }

          const updatedMessages = [...currentMessages];
          updatedMessages[existingMessageIndex] = {
            ...payload.message,
            ...existingMessage,
            receivedAt: payload.message.receivedAt,
          };
          return updatedMessages;
        });
      });
    }

    setupMessageListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [id]);

  return (
    <main
      className={`relative flex h-screen w-screen flex-col overflow-hidden bg-transparent p-2.5 transition-transform ${
        isNudging ? "animate-nudge" : ""
      }`}
    >
      <button
        type="button"
        aria-label="Redimensionar pela borda superior"
        className="absolute inset-x-3 top-0 z-50 h-1 cursor-n-resize"
        onMouseDown={() => void appWindow.startResizeDragging("North")}
      />
      <button
        type="button"
        aria-label="Redimensionar pela borda inferior"
        className="absolute inset-x-3 bottom-0 z-50 h-1 cursor-s-resize"
        onMouseDown={() => void appWindow.startResizeDragging("South")}
      />
      <button
        type="button"
        aria-label="Redimensionar pela borda esquerda"
        className="absolute inset-y-3 left-0 z-50 w-1 cursor-w-resize"
        onMouseDown={() => void appWindow.startResizeDragging("West")}
      />
      <button
        type="button"
        aria-label="Redimensionar pela borda direita"
        className="absolute inset-y-3 right-0 z-50 w-1 cursor-e-resize"
        onMouseDown={() => void appWindow.startResizeDragging("East")}
      />

      <div
        ref={chatSurfaceRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[#6694ad] bg-gradient-to-b from-[#f8fcfe] via-[#edf7fb] to-[#d8edf6] font-sans antialiased [text-rendering:geometricPrecision]"
      >
        <span className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/50 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#70c9ec]/20 blur-3xl" />

        {isVideoCallOpen && videoCallBounds && (
          <aside
            aria-label="Vídeos da chamada"
            className={`absolute left-3 z-30 flex flex-col gap-2.5 transition-[width] duration-200 ease-out ${
              isVideoCallExpanded ? "w-[300px]" : "w-28"
            }`}
            style={{
              top: videoCallBounds.top,
              height: videoCallBounds.height,
            }}
          >
            <div
              className="relative w-full shrink-0 overflow-hidden rounded-[10px] border border-[#6f9db4] bg-[#14242c] shadow-[0_3px_10px_rgba(25,57,72,0.28)] ring-1 ring-white/70 transition-[height] duration-200 ease-out"
              style={{
                height: isVideoCallExpanded
                  ? (videoCallBounds.height - 10) / 2
                  : 84,
              }}
            >
              <video
                autoPlay
                playsInline
                aria-label={`Vídeo de ${contactName}`}
                className="h-full w-full object-cover"
              />
            </div>

            <div
              className="relative w-full shrink-0 overflow-hidden rounded-[10px] border border-[#6f9db4] bg-[#14242c] shadow-[0_3px_10px_rgba(25,57,72,0.28)] ring-1 ring-white/70 transition-[height] duration-200 ease-out"
              style={{
                height: isVideoCallExpanded
                  ? (videoCallBounds.height - 10) / 2
                  : 84,
              }}
            >
              <img
                src={nativeCameraStreamUrl || undefined}
                aria-label="Meu vídeo"
                className={`h-full w-full object-cover ${
                  nativeCameraStreamUrl ? "opacity-100" : "opacity-0"
                }`}
              />
              <span className="pointer-events-none absolute inset-0 grid place-items-center text-[10px] font-medium text-white/75">
                {cameraStatus === "requesting" && "Liberando câmera..."}
                {cameraStatus === "error" && (
                  <span className="px-2" title={cameraError}>
                    Não foi possível acessar a câmera
                    {cameraError && (
                      <small className="mt-1 block text-[8px] text-white/55">
                        {cameraError}
                      </small>
                    )}
                  </span>
                )}
                {cameraStatus === "idle" && "Meu vídeo"}
              </span>
            </div>
          </aside>
        )}

        <div
          data-tauri-drag-region
          className="relative flex h-9 shrink-0 select-none items-center gap-2 border-b border-[#7fa9bf] bg-gradient-to-r from-[#8fcbe8] via-[#d4eefb] to-[#f4fbfe] pl-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        >
          <span className="flex items-end" aria-hidden="true">
            <span className="h-3.5 w-3.5 rounded-full bg-[#71bf45] ring-1 ring-white" />
            <span className="-ml-1 h-3 w-3 rounded-full bg-[#43a9d7] ring-1 ring-white" />
          </span>
          <span
            data-tauri-drag-region
            className="min-w-0 flex-1 truncate text-xs font-semibold text-[#315b72]"
          >
            Conversa com {contactName}
          </span>
          <span className="rounded-full border border-white/80 bg-white/45 px-2 py-0.5 text-[10px] font-medium text-[#47748c]">
            {contactStatusLabel}
          </span>
          <div className="ml-1 flex h-full items-stretch">
            <button
              type="button"
              aria-label="Minimizar conversa"
              title="Minimizar"
              onClick={() => void appWindow.minimize()}
              className="grid w-9 place-items-center text-[#426b81] transition-colors hover:bg-white/50"
            >
              <MdMinimize size={17} />
            </button>
            <button
              type="button"
              aria-label="Maximizar ou restaurar conversa"
              title="Maximizar ou restaurar"
              onClick={() => void appWindow.toggleMaximize()}
              className="grid w-9 place-items-center text-[#426b81] transition-colors hover:bg-white/50"
            >
              <MdCropSquare size={13} />
            </button>
            <button
              type="button"
              aria-label="Fechar conversa"
              title="Fechar"
              onClick={() => void appWindow.close()}
              className="grid w-10 place-items-center rounded-tr-[11px] text-[#426b81] transition-colors hover:bg-[#d86161] hover:text-white"
            >
              <MdClose size={18} />
            </button>
          </div>
        </div>

        {/* Avatar do contato + histórico da conversa */}
        <section className="flex min-h-0 flex-1 gap-2.5 px-3 pt-3">
          <aside
            className={`flex shrink-0 items-start justify-center pt-3 transition-[width] duration-200 ${
              isVideoCallOpen
                ? `invisible ${isVideoCallExpanded ? "w-[300px]" : "w-28"}`
                : "w-28"
            }`}
          >
            <div className="relative">
              <div className="rounded-[13px] border-[6px] border-[#8adbbd] bg-white shadow-[0_3px_10px_rgba(38,94,78,0.24)] ring-1 ring-[#559a82]">
                <div className="flex h-24 w-24 items-center justify-center rounded-[6px] bg-gradient-to-br from-[#eefaf6] via-[#d3eee8] to-[#afd6e7] text-4xl font-bold text-[#438d73] shadow-inner">
                  {contactName.charAt(0).toUpperCase()}
                </div>
              </div>
              <span
                className={`absolute bottom-0 right-0 z-30 h-4 w-4 rounded-full border-2 border-white shadow-sm ${contactStatusColor}`}
              />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <header className="flex items-start justify-between border-b border-[#b9d3df] px-1 pb-2.5">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-[#284f65]">
                  {contactName}{" "}
                  <span className="text-sm font-normal italic text-[#67899a]">
                    ({contactStatusLabel})
                  </span>
                </h1>
                {contactMessage && (
                  <p className="truncate text-xs italic text-[#527589]">
                    {contactMessage}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-[#91aeba]">ID: {id}</span>
            </header>

            <div
              ref={messagesContainerRef}
              aria-live="polite"
              className="min-h-0 flex-1 overflow-y-auto rounded-[10px] border border-[#9dbdcc] bg-gradient-to-b from-white/95 to-[#f3f9fc]/95 p-3 text-sm shadow-[inset_0_2px_5px_rgba(47,91,113,0.1),0_1px_0_white]"
            >
              {messages.length === 0 ? (
                <div className="flex h-full min-h-24 items-center justify-center">
                  <p className="rounded-full border border-[#d4e5ed] bg-white/70 px-4 py-1.5 text-center text-xs italic text-[#7893a0]">
                    Início da conversa com {contactName}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((chatMessage) => (
                    <div
                      key={chatMessage.id}
                      className={`flex flex-col ${
                        chatMessage.author === "me"
                          ? "items-end"
                          : "items-start"
                      }`}
                    >
                      <span className="mb-1 px-1 text-xs font-medium text-[#5f7f90]">
                        {chatMessage.author === "me" ? "Você" : contactName}
                      </span>
                      <p className="max-w-[78%] whitespace-pre-wrap break-words rounded-[9px] border border-[#c4dbe5] bg-white px-3 py-2 text-[#375567] shadow-[0_1px_3px_rgba(42,83,104,0.1)]">
                        <MessageContent text={chatMessage.text} />
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Foto do usuário + área de composição */}
        <section className="flex h-[132px] shrink-0 gap-2.5 px-3 pb-3 pt-2.5">
          <aside
            className={`flex shrink-0 items-end justify-center transition-[width] duration-200 ${
              isVideoCallOpen
                ? `invisible ${isVideoCallExpanded ? "w-[300px]" : "w-28"}`
                : "w-28"
            }`}
          >
            <PictureFrame frame="frias" imageAlt="Minha foto de perfil" />
          </aside>

          <div
            ref={messageComposerRef}
            className="flex min-w-0 flex-1 flex-col rounded-[10px] border border-[#7faec4] bg-white/95 shadow-[0_2px_7px_rgba(40,85,108,0.16)] transition focus-within:border-[#4d9fc4] focus-within:ring-2 focus-within:ring-[#70b9d8]/25"
          >
            <div className="relative min-h-0 flex-1 rounded-t-[9px] bg-gradient-to-b from-white to-[#fbfdfe]">
              {!message && (
                <span className="pointer-events-none absolute left-3 top-3 text-sm font-normal text-[#829aa6]">
                  Digite uma mensagem...
                </span>
              )}
              <div
                ref={messageInputRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Mensagem"
                aria-multiline="true"
                onInput={(event) => {
                  const editor = event.currentTarget;
                  const nextMessage = serializeEditorContent(editor);
                  setMessage(nextMessage);

                  if (hasTypedEmoticon(editor)) {
                    renderEditorContent(editor, nextMessage);
                    placeCaretAtEnd(editor);
                  }

                  saveEditorSelection();
                }}
                onSelect={saveEditorSelection}
                onKeyUp={saveEditorSelection}
                onMouseUp={saveEditorSelection}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="h-full overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm text-[#304f60] outline-none"
              />
            </div>

            <div className="flex min-h-11 items-center justify-between rounded-b-[9px] border-t border-[#b9d5e1] bg-gradient-to-b from-[#f4fbfe] to-[#dceef6] px-2 shadow-[inset_0_1px_0_white]">
              {/* Caixa de Ações */}
              <div className="flex items-center">
                <div
                  className="relative"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setIsEmoticonPickerOpen(false);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setIsEmoticonPickerOpen(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    aria-label="Abrir emoticons"
                    aria-expanded={isEmoticonPickerOpen}
                    aria-haspopup="dialog"
                    onMouseDown={saveEditorSelection}
                    onClick={() => setIsEmoticonPickerOpen((isOpen) => !isOpen)}
                    className={`rounded-md border border-transparent p-1.5 transition-colors hover:border-white hover:bg-white/70 ${
                      isEmoticonPickerOpen ? "border-white bg-white/80" : ""
                    }`}
                    title="Emoticons"
                  >
                    <img
                      src={SmileIcon}
                      alt=""
                      className="h-6 w-6 object-contain"
                    />
                  </button>

                  {isEmoticonPickerOpen && (
                    <div
                      role="dialog"
                      aria-label="Selecionar emoticon"
                      className="absolute bottom-full left-0 z-40 mb-2 w-max rounded-[10px] border border-[#7faec4] bg-gradient-to-b from-[#f8fdff] to-[#e3f3fa] p-2 shadow-[0_10px_30px_rgba(35,76,98,0.24)]"
                    >
                      <p className="mb-2 border-b border-[#c8dfe9] px-1 pb-1.5 text-xs font-semibold text-[#52758a]">
                        Emoticons
                      </p>
                      <div className="grid grid-flow-col grid-rows-3 gap-1">
                        {EMOTICONS.map((emoticon) => (
                          <button
                            key={emoticon.code}
                            type="button"
                            aria-label={`Inserir ${emoticon.alt.toLowerCase()}`}
                            onClick={() => handleSelectEmoticon(emoticon.code)}
                            className="flex h-11 w-11 items-center justify-center rounded-md border border-transparent transition-colors hover:border-white hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#65afd0]/50"
                          >
                            <img
                              src={emoticon.src}
                              alt={emoticon.alt}
                              className="h-[30px] w-[30px] object-contain"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  aria-label="Ação do emoticon piscando"
                  title="Ação especial (em breve)"
                  className="rounded-md border border-transparent p-1.5 transition-colors hover:border-white hover:bg-white/70"
                >
                  <img
                    src={WinkSmileIcon}
                    alt="Emoticon piscando"
                    className="h-6 w-6 object-contain"
                  />
                </button>

                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent transition-colors hover:border-white hover:bg-white/70 disabled:opacity-50"
                  onClick={handleSendNudge}
                  disabled={isNudging}
                  title="Chamar a atenção"
                >
                  <img
                    src={NudgeIconComparison}
                    alt="Chamar a atenção"
                    className="h-auto w-[34px] max-w-none object-contain"
                  />
                </button>

                <button
                  type="button"
                  title="Iniciar conversa por voz"
                  className="rounded-md border border-transparent p-2 transition-colors hover:border-white hover:bg-white/70"
                >
                  <MdVoiceChat className="text-[#527b90]" size={20} />
                </button>
                <button
                  type="button"
                  title="Ativar microfone"
                  className="rounded-md border border-transparent p-2 transition-colors hover:border-white hover:bg-white/70"
                >
                  <FaMicrophoneAlt className="text-[#527b90]" size={18} />
                </button>
                <button
                  type="button"
                  title="Configurar áudio"
                  className="rounded-md border border-transparent p-2 transition-colors hover:border-white hover:bg-white/70"
                >
                  <FaHeadphonesAlt className="text-[#527b90]" size={18} />
                </button>
                <button
                  type="button"
                  title={
                    isVideoCallOpen
                      ? "Encerrar exibição de vídeo"
                      : "Iniciar conversa por vídeo"
                  }
                  aria-pressed={isVideoCallOpen}
                  onClick={() => setIsVideoCallOpen((isOpen) => !isOpen)}
                  className="rounded-md border border-transparent p-2 transition-colors hover:border-white hover:bg-white/70"
                >
                  <MdOutlineVideoChat className="text-[#527b90]" size={20} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="rounded-md border border-[#3989b1] bg-gradient-to-b from-[#78c5e5] to-[#3295c2] px-4 py-1.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_1px_2px_rgba(31,82,108,0.24)] transition hover:from-[#8bd1ec] hover:to-[#3aa2cf] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Enviar
              </button>
            </div>
          </div>
        </section>

        <footer className="flex min-h-6 shrink-0 items-center px-3 pb-1 text-[10px] text-[#67899a]">
          <p>
            {lastReceivedAt
              ? `Última mensagem recebida em ${lastReceivedAt}`
              : "Nenhuma mensagem recebida nesta conversa"}
          </p>
        </footer>
      </div>
    </main>
  );
}

export default ChatWindow;
