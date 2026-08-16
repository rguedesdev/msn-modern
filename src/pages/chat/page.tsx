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
import { UserAttentionType } from "@tauri-apps/api/window";

// Componentes
import { PictureFrame } from "../../shared/constants/PictureFrame/page";
import {
  appendChatMessage,
  getChatMessages,
  saveChatMessages,
  type ChatMessage,
} from "../../shared/utils/chatStorage";
import { useAuth } from "../../shared/auth/AuthContext";
import { decryptEnvelope, encryptForDevice, listPublicKeys, registerCurrentDevice } from "../../shared/api/e2ee";
import { listEncryptedMessages, sendEncryptedMessage, type ApiEncryptedMessage } from "../../shared/api/messages";
import { connectRealtime } from "../../shared/api/realtime";

// Icons
import {
  MdClose,
  MdCropSquare,
  MdKeyboardArrowDown,
  MdMinimize,
  MdOutlineVideoChat,
  MdVoiceChat,
} from "react-icons/md";
import { FaMicrophoneAlt, FaHeadphonesAlt } from "react-icons/fa";

// Imagens e Sons
import NudgeIconComparison from "../../assets/images/msn-nudge-icon-2.png";
import SmileIcon from "../../assets/images/emoticons/defaulty/regular-smile-transparent.png";
import WinkSmileIcon from "../../assets/images/emoticons/defaulty/wink-smile.png";
import WritingEyesIcon from "../../assets/images/emoticons/defaulty/writing-eyes-brown.png";
import AngrySmileIcon from "../../assets/images/emoticons/defaulty/angry-smile.png";
import NerdSmileIcon from "../../assets/images/emoticons/defaulty/nerd-smile.png";
import NeutralSmileIcon from "../../assets/images/emoticons/defaulty/neutral-smile.png";
import SurpriseSmileIcon from "../../assets/images/emoticons/defaulty/surprise-smile.png";
import SickSmileIcon from "../../assets/images/emoticons/defaulty/sick-smile.png";
import SuspectSmileIcon from "../../assets/images/emoticons/defaulty/suspect-smile.png";
import BoredSmileIcon from "../../assets/images/emoticons/defaulty/bored-smile.png";
import AnnoyedSmileIcon from "../../assets/images/emoticons/defaulty/annoyed-smile.png";
import AngelSmileIcon from "../../assets/images/emoticons/defaulty/angel-smile.png";
import OmgSmileIcon from "../../assets/images/emoticons/defaulty/omg-smile.png";
import RedSmileIcon from "../../assets/images/emoticons/defaulty/red-smile.png";
import SadSmileIcon from "../../assets/images/emoticons/defaulty/sad-smile.png";
import ShadesSmileIcon from "../../assets/images/emoticons/defaulty/shades-smile.png";
import TeethSmileIcon from "../../assets/images/emoticons/defaulty/teeth-smile.png";
import ConfusedSmileIcon from "../../assets/images/emoticons/defaulty/confused-smile.png";
import TongueSmileIcon from "../../assets/images/emoticons/defaulty/tongue-smile.png";
import WhatFaceIcon from "../../assets/images/emoticons/defaulty/what-face.png";
import DevilSmileIcon from "../../assets/images/emoticons/defaulty/devil-smile.png";
import DarkSmileIcon from "../../assets/images/emoticons/dark/dark-smile.jpg";
import DarkAngryIcon from "../../assets/images/emoticons/dark/dark-angry.jpg";
import Dark02Icon from "../../assets/images/emoticons/dark/02.jpg";
import Dark03Icon from "../../assets/images/emoticons/dark/03.jpg";
import Dark04Icon from "../../assets/images/emoticons/dark/04.jpg";
import Dark05Icon from "../../assets/images/emoticons/dark/05.jpg";
import Dark06Icon from "../../assets/images/emoticons/dark/06.jpg";
import Dark08Icon from "../../assets/images/emoticons/dark/08.jpg";
import Dark09Icon from "../../assets/images/emoticons/dark/09.jpg";
import Dark10Icon from "../../assets/images/emoticons/dark/10.jpg";
import Dark11Icon from "../../assets/images/emoticons/dark/11.jpg";
import Dark12Icon from "../../assets/images/emoticons/dark/12.jpg";
import Dark13Icon from "../../assets/images/emoticons/dark/13.jpg";
import Dark14Icon from "../../assets/images/emoticons/dark/14.jpg";
import Dark15Icon from "../../assets/images/emoticons/dark/15.jpg";
import Dark16Icon from "../../assets/images/emoticons/dark/16.jpg";
import Dark17Icon from "../../assets/images/emoticons/dark/17.jpg";
import Dark18Icon from "../../assets/images/emoticons/dark/18.jpg";
import Dark19Icon from "../../assets/images/emoticons/dark/19.jpg";
import Dark20Icon from "../../assets/images/emoticons/dark/20.jpg";
import Dark21Icon from "../../assets/images/emoticons/dark/21.jpg";
import Dark22Icon from "../../assets/images/emoticons/dark/22.jpg";
import Dark27Icon from "../../assets/images/emoticons/dark/27.jpg";
import OnionHeadInsultedIcon from "../../assets/images/emoticons/onion-head/insultedplz.gif";
import OnionHeadComeAtMeIcon from "../../assets/images/emoticons/onion-head/comeatmeplz.gif";
import OnionHeadHandsomeIcon from "../../assets/images/emoticons/onion-head/handsomeonionplz.gif";
import OnionHeadHeroTimeIcon from "../../assets/images/emoticons/onion-head/herotimeplz.gif";
import OnionHeadKaminaIcon from "../../assets/images/emoticons/onion-head/kaminaonionplz.gif";
import OnionHeadRaceIcon from "../../assets/images/emoticons/onion-head/onionraceplz.gif";
import OnionHeadSoccerIcon from "../../assets/images/emoticons/onion-head/onionsoccer1plz.gif";
import OnionHeadSoccerRageIcon from "../../assets/images/emoticons/onion-head/soccerrageplz.gif";
import OnionHeadSuperIcon from "../../assets/images/emoticons/onion-head/superonionplz.gif";
import OnionHeadWhipIcon from "../../assets/images/emoticons/onion-head/whipplz.gif";
import nudgeSound from "../../assets/sounds/nudge.mp3";

const STANDARD_EMOTICONS = [
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
] as const;

const DARK_EMOTICONS = [
  { code: "(darksmile)", src: DarkSmileIcon, alt: "Dark smile" },
  { code: "(darkangry)", src: DarkAngryIcon, alt: "Dark angry" },
  { code: "(dark02)", src: Dark02Icon, alt: "Dark smile 02" },
  { code: "(dark03)", src: Dark03Icon, alt: "Dark wink" },
  { code: "(dark04)", src: Dark04Icon, alt: "Dark surprised" },
  { code: "(dark05)", src: Dark05Icon, alt: "Dark tongue out" },
  { code: "(dark06)", src: Dark06Icon, alt: "Dark cool" },
  { code: "(dark08)", src: Dark08Icon, alt: "Dark worried" },
  { code: "(dark09)", src: Dark09Icon, alt: "Dark blushing" },
  { code: "(dark10)", src: Dark10Icon, alt: "Dark sad" },
  { code: "(dark11)", src: Dark11Icon, alt: "Dark crying" },
  { code: "(dark12)", src: Dark12Icon, alt: "Dark neutral" },
  { code: "(dark13)", src: Dark13Icon, alt: "Dark angel" },
  { code: "(dark14)", src: Dark14Icon, alt: "Dark furious" },
  { code: "(dark15)", src: Dark15Icon, alt: "Dark sarcastic" },
  { code: "(dark16)", src: Dark16Icon, alt: "Dark party" },
  { code: "(dark17)", src: Dark17Icon, alt: "Dark sleepy" },
  { code: "(dark18)", src: Dark18Icon, alt: "Dark confused" },
  { code: "(dark19)", src: Dark19Icon, alt: "Dark nervous" },
  { code: "(dark20)", src: Dark20Icon, alt: "Dark scared" },
  { code: "(dark21)", src: Dark21Icon, alt: "Dark questioning" },
  { code: "(dark22)", src: Dark22Icon, alt: "Dark side glance" },
  { code: "(dark27)", src: Dark27Icon, alt: "Dark devil" },
] as const;

const ONION_HEAD_DISPLAY_SIZE = {
  displayWidth: 50,
  displayHeight: 50,
} as const;

const ONION_HEAD_EMOTICONS = [
  {
    code: "(onioninsulted)",
    src: OnionHeadInsultedIcon,
    alt: "Onion Head insultado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioncomeatme)",
    src: OnionHeadComeAtMeIcon,
    alt: "Onion Head venha me enfrentar",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionhandsome)",
    src: OnionHeadHandsomeIcon,
    alt: "Onion Head charmoso",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionherotime)",
    src: OnionHeadHeroTimeIcon,
    alt: "Onion Head herói",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionkamina)",
    src: OnionHeadKaminaIcon,
    alt: "Onion Head Kamina",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionrace)",
    src: OnionHeadRaceIcon,
    alt: "Onion Head corrida",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsoccer)",
    src: OnionHeadSoccerIcon,
    alt: "Onion Head futebol",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsoccerrage)",
    src: OnionHeadSoccerRageIcon,
    alt: "Onion Head futebol furioso",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsuper)",
    src: OnionHeadSuperIcon,
    alt: "Super Onion Head",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionwhip)",
    src: OnionHeadWhipIcon,
    alt: "Onion Head chicote",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
] as const;

const EXCLUSIVE_EMOTICON_PACKS = [
  {
    id: "dark",
    name: "Dark",
    emoticons: DARK_EMOTICONS,
  },
  {
    id: "onion-head",
    name: "Onion Head",
    emoticons: ONION_HEAD_EMOTICONS,
  },
] as const;

const EMOTICONS = [
  ...STANDARD_EMOTICONS,
  ...DARK_EMOTICONS,
  ...ONION_HEAD_EMOTICONS,
] as const;

type EmoticonCode = (typeof EMOTICONS)[number]["code"];
type EmoticonPickerTab = "standard" | "exclusive";

const EDITOR_CARET_ANCHOR = "\u200B";

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
        width={"displayWidth" in emoticon ? emoticon.displayWidth : 28}
        height={"displayHeight" in emoticon ? emoticon.displayHeight : 28}
        className="mx-0.5 inline-block max-w-none align-middle object-contain"
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
  image.width = "displayWidth" in emoticon ? emoticon.displayWidth : 28;
  image.height = "displayHeight" in emoticon ? emoticon.displayHeight : 28;
  image.className =
    "mx-0.5 inline-block max-w-none align-middle object-contain select-none";
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

function placeCaretAfterNode(node: Node) {
  const parent = node.parentNode;
  if (!parent) return null;

  let caretNode = node.nextSibling;

  if (caretNode?.nodeType !== Node.TEXT_NODE) {
    caretNode = document.createTextNode(EDITOR_CARET_ANCHOR);
    parent.insertBefore(caretNode, node.nextSibling);
  } else if (!caretNode.textContent) {
    caretNode.textContent = EDITOR_CARET_ANCHOR;
  }

  const range = document.createRange();
  range.setStart(caretNode, 0);
  range.collapse(true);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  return range;
}

function isEditorEmoticon(node: Node | null): node is HTMLImageElement {
  return node instanceof HTMLImageElement && Boolean(node.dataset.emoticon);
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
  const { user } = useAuth();
  const [isNudging, setIsNudging] = useState(false);
  const [isEmoticonPickerOpen, setIsEmoticonPickerOpen] = useState(false);
  const [activeEmoticonTab, setActiveEmoticonTab] =
    useState<EmoticonPickerTab>("standard");
  const [activeExclusivePackId, setActiveExclusivePackId] = useState<string>(
    EXCLUSIVE_EMOTICON_PACKS[0]?.id ?? "",
  );
  const [isExclusivePackMenuOpen, setIsExclusivePackMenuOpen] =
    useState(false);
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
  const [sendError, setSendError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    id ? getChatMessages(id) : [],
  );
  const messageInputRef = useRef<HTMLDivElement>(null);
  const emoticonPickerRef = useRef<HTMLDivElement>(null);
  const editorSelectionRef = useRef<Range | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatSurfaceRef = useRef<HTMLDivElement>(null);
  const messageComposerRef = useRef<HTMLDivElement>(null);
  const hasPositionedInitialMessagesRef = useRef(false);
  const nudgeAudioRef = useRef<HTMLAudioElement | null>(null);
  const appWindow = useMemo(() => getCurrentWebviewWindow(), []);
  const activeExclusivePack =
    EXCLUSIVE_EMOTICON_PACKS.find(
      (pack) => pack.id === activeExclusivePackId,
    ) ?? EXCLUSIVE_EMOTICON_PACKS[0];

  useEffect(() => {
    if (!isEmoticonPickerOpen) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !emoticonPickerRef.current?.contains(target)
      ) {
        setIsEmoticonPickerOpen(false);
        setIsExclusivePackMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, [isEmoticonPickerOpen]);

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
  const contactUserId = searchParams.get("userId") || "";
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
    if (!isVideoCallOpen) return;

    const animationFrame = window.requestAnimationFrame(() => {
      setIsVideoCallExpanded(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isVideoCallOpen]);

  useLayoutEffect(() => {
    if (!isVideoCallOpen) return;

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
    if (!isVideoCallOpen) return;

    let isDisposed = false;

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

    const cameraStartDelayId = window.setTimeout(() => {
      setCameraStatus("requesting");
      setCameraError("");
      setNativeCameraStreamUrl("");
      void startCamera();
    }, 220);

    return () => {
      isDisposed = true;
      window.clearTimeout(cameraStartDelayId);
      void invoke("stop_native_camera");
    };
  }, [isVideoCallOpen]);

  const handleToggleVideoCall = () => {
    if (isVideoCallOpen) {
      setIsVideoCallExpanded(false);
      setVideoCallBounds(null);
      setCameraStatus("idle");
      setNativeCameraStreamUrl("");
    }
    setIsVideoCallOpen((isOpen) => !isOpen);
  };

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || !id || !user || !contactUserId || isSending) return;
    setIsSending(true);
    setSendError("");
    try {
      const identity = await registerCurrentDevice(user.id);
      const [recipientKeys, ownKeys] = await Promise.all([
        listPublicKeys(contactUserId),
        listPublicKeys(user.id),
      ]);
      if (recipientKeys.length === 0) {
        throw new Error(`${contactName} precisa abrir a versão atualizada do aplicativo uma vez para ativar a criptografia.`);
      }
      const targets = [
        ...recipientKeys.map((key) => ({ userId: contactUserId, key })),
        ...ownKeys.map((key) => ({ userId: user.id, key })),
      ];
      const envelopes = await Promise.all(
        targets.map(({ userId: recipientUserId, key }) =>
          encryptForDevice(trimmedMessage, id, recipientUserId, key),
        ),
      );
      const sent = await sendEncryptedMessage(id, identity.deviceId, envelopes);
      const chatMessage: ChatMessage = { id: sent._id, author: "me", text: trimmedMessage };
      setMessages((current) => {
        const updated = [...current, chatMessage];
        saveChatMessages(id, updated);
        return updated;
      });
      setMessage("");
      if (messageInputRef.current) messageInputRef.current.innerHTML = "";
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Não foi possível enviar a mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const decryptApiMessage = useCallback(async (apiMessage: ApiEncryptedMessage): Promise<ChatMessage | null> => {
    if (!id || !user) return null;
    const identity = await registerCurrentDevice(user.id);
    const envelope = apiMessage.envelopes.find((item) => item.recipientDeviceId === identity.deviceId);
    if (!envelope) return null;
    try {
      return {
        id: apiMessage._id,
        author: apiMessage.senderUserId === user.id ? "me" : "contact",
        text: await decryptEnvelope(user.id, id, envelope.payload),
        receivedAt: apiMessage.senderUserId === user.id ? undefined : new Date(apiMessage.sentAt).getTime(),
      };
    } catch {
      return null;
    }
  }, [id, user]);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    void registerCurrentDevice(user.id)
      .then(() => listEncryptedMessages(id))
      .then((history) => Promise.all(history.map(decryptApiMessage)))
      .then((decrypted) => {
        if (cancelled) return;
        const available = decrypted.filter((item): item is ChatMessage => item !== null);
        setMessages(available);
        saveChatMessages(id, available);
      })
      .catch((error) => {
        if (!cancelled) setSendError(error instanceof Error ? error.message : "Erro ao carregar mensagens");
      });

    const socket = connectRealtime((incoming) => {
      if (incoming.conversationId !== id) return;
      void decryptApiMessage(incoming as ApiEncryptedMessage).then((decrypted) => {
        if (!decrypted || cancelled) return;
        setMessages(appendChatMessage(id, decrypted));
      });
    });
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [decryptApiMessage, id, user]);

  const applyTaskbarHighlight = useCallback(
    (highlighted: boolean) => {
      const attentionType = highlighted
        ? UserAttentionType.Informational
        : null;

      void appWindow.requestUserAttention(attentionType).catch((error) => {
        console.error("Erro ao alterar o destaque da conversa:", error);
      });
      void invoke("set_kwin_window_attention", {
        windowTitle: `Conversa com ${contactName}`,
        attention: highlighted,
      }).catch((error) => {
        console.error("Erro ao alternar o destaque no KWin:", error);
      });
    },
    [appWindow, contactName],
  );

  const clearTaskbarHighlight = useCallback(() => {
    applyTaskbarHighlight(false);
  }, [applyTaskbarHighlight]);

  const handleMinimizeConversation = () => {
    void appWindow.minimize();
  };

  useEffect(() => {
    let unlistenFocusChanged: (() => void) | undefined;

    void appWindow
      .onFocusChanged(({ payload: isFocused }) => {
        if (isFocused) clearTaskbarHighlight();
      })
      .then((unlisten) => {
        unlistenFocusChanged = unlisten;
      });

    return () => {
      unlistenFocusChanged?.();
      clearTaskbarHighlight();
    };
  }, [appWindow, clearTaskbarHighlight]);

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

    const savedRange = editorSelectionRef.current;
    const hasValidSavedRange = Boolean(
      savedRange && editor.contains(savedRange.commonAncestorContainer),
    );
    const range = hasValidSavedRange ? savedRange! : document.createRange();

    if (!hasValidSavedRange) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    const emoticon = createEditorEmoticon(code);
    range.deleteContents();
    range.insertNode(emoticon);
    const caretRange = placeCaretAfterNode(emoticon);
    editorSelectionRef.current = caretRange?.cloneRange() ?? null;

    setMessage(serializeEditorContent(editor));
    setIsEmoticonPickerOpen(false);

    window.requestAnimationFrame(() => {
      const currentRange = editorSelectionRef.current;
      if (!editor.isConnected || !currentRange) return;

      editor.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(currentRange);
    });
  };

  const handleToggleEmoticonPicker = () => {
    if (!isEmoticonPickerOpen) {
      setActiveEmoticonTab("standard");
      setIsExclusivePackMenuOpen(false);
    }

    setIsEmoticonPickerOpen((isOpen) => !isOpen);
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
              onClick={handleMinimizeConversation}
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
                  Digite uma mensagem
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
                    void handleSendMessage();
                    return;
                  }

                  if (event.key !== "Backspace" && event.key !== "Delete") {
                    return;
                  }

                  const editor = event.currentTarget;
                  const selection = window.getSelection();
                  if (!selection?.rangeCount || !selection.isCollapsed) return;

                  const range = selection.getRangeAt(0);
                  const container = range.startContainer;
                  const offset = range.startOffset;
                  let emoticonToDelete: Node | null = null;

                  if (container.nodeType === Node.TEXT_NODE) {
                    const text = container.textContent ?? "";

                    if (event.key === "Backspace") {
                      const textBeforeCaret = text
                        .slice(0, offset)
                        .replaceAll(EDITOR_CARET_ANCHOR, "");
                      if (!textBeforeCaret) {
                        emoticonToDelete = container.previousSibling;
                      }
                    } else {
                      const textAfterCaret = text
                        .slice(offset)
                        .replaceAll(EDITOR_CARET_ANCHOR, "");
                      if (!textAfterCaret) {
                        emoticonToDelete = container.nextSibling;
                      }
                    }
                  } else if (container === editor) {
                    const adjacentIndex =
                      event.key === "Backspace" ? offset - 1 : offset;
                    emoticonToDelete =
                      adjacentIndex >= 0
                        ? editor.childNodes.item(adjacentIndex)
                        : null;
                  }

                  if (!isEditorEmoticon(emoticonToDelete)) return;

                  event.preventDefault();
                  emoticonToDelete.remove();

                  if (container.nodeType === Node.TEXT_NODE) {
                    range.setStart(container, 0);
                  } else {
                    const nextOffset =
                      event.key === "Backspace" ? offset - 1 : offset;
                    range.setStart(
                      editor,
                      Math.max(
                        0,
                        Math.min(nextOffset, editor.childNodes.length),
                      ),
                    );
                  }
                  range.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(range);
                  editorSelectionRef.current = range.cloneRange();
                  setMessage(serializeEditorContent(editor));
                }}
                className="h-full overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm text-[#304f60] outline-none"
              />
            </div>

            <div className="flex min-h-11 items-center justify-between rounded-b-[9px] border-t border-[#b9d5e1] bg-gradient-to-b from-[#f4fbfe] to-[#dceef6] px-2 shadow-[inset_0_1px_0_white]">
              {/* Caixa de Ações */}
              <div className="flex items-center">
                <div
                  ref={emoticonPickerRef}
                  className="relative"
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
                    onClick={handleToggleEmoticonPicker}
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
                      className="absolute bottom-full left-0 z-40 mb-2 h-[198px] w-[380px] rounded-[10px] border border-[#7faec4] bg-gradient-to-b from-[#f8fdff] to-[#e3f3fa] p-2 shadow-[0_10px_30px_rgba(35,76,98,0.24)]"
                    >
                      <div
                        role="tablist"
                        aria-label="Categorias de emoticons"
                        className="relative mb-2 grid grid-cols-2 border-b border-[#b9d5e1] px-1"
                      >
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-1/2 transition-transform duration-300 ease-out"
                          style={{
                            transform: `translateX(${activeEmoticonTab === "exclusive" ? 100 : 0}%)`,
                          }}
                        >
                          <span className="mx-auto block h-full w-[76%] rounded-full bg-[#3295c2]" />
                        </span>

                        <button
                          id="emoticon-tab-standard"
                          type="button"
                          role="tab"
                          aria-selected={activeEmoticonTab === "standard"}
                          aria-controls="emoticon-panel-standard"
                          onClick={() => {
                            setActiveEmoticonTab("standard");
                            setIsExclusivePackMenuOpen(false);
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#65afd0]/50 ${
                            activeEmoticonTab === "standard"
                              ? "text-[#287da5]"
                              : "text-[#7894a2] hover:bg-white/45 hover:text-[#426b81]"
                          }`}
                        >
                          Padrão
                        </button>
                        <button
                          id="emoticon-tab-exclusive"
                          type="button"
                          role="tab"
                          aria-selected={activeEmoticonTab === "exclusive"}
                          aria-controls="emoticon-panel-exclusive"
                          onClick={() => {
                            setActiveEmoticonTab("exclusive");
                            setIsExclusivePackMenuOpen(false);
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#65afd0]/50 ${
                            activeEmoticonTab === "exclusive"
                              ? "text-[#287da5]"
                              : "text-[#7894a2] hover:bg-white/45 hover:text-[#426b81]"
                          }`}
                        >
                          Exclusivos
                        </button>
                      </div>

                      <div className="h-[140px] overflow-hidden">
                        <div
                          className="flex h-full w-[200%] transition-transform duration-300 ease-out"
                          style={{
                            transform: `translateX(${activeEmoticonTab === "exclusive" ? -50 : 0}%)`,
                          }}
                        >
                          <div
                            id="emoticon-panel-standard"
                            role="tabpanel"
                            aria-labelledby="emoticon-tab-standard"
                            aria-hidden={activeEmoticonTab !== "standard"}
                            className="grid h-full w-1/2 shrink-0 grid-cols-7 content-start gap-1"
                          >
                            {STANDARD_EMOTICONS.map((emoticon) => (
                              <button
                                key={emoticon.code}
                                type="button"
                                tabIndex={
                                  activeEmoticonTab === "standard" ? 0 : -1
                                }
                                aria-label={`Inserir ${emoticon.alt.toLowerCase()}`}
                                onClick={() =>
                                  handleSelectEmoticon(emoticon.code)
                                }
                                className="flex h-11 w-11 items-center justify-center rounded-md border border-transparent transition-colors hover:border-white hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#65afd0]/50"
                              >
                                <img
                                  src={emoticon.src}
                                  alt={emoticon.alt}
                                  className="h-[30px] w-[30px] object-contain"
                                />
                              </button>
                            ))}
                          </div>

                          <div
                            id="emoticon-panel-exclusive"
                            role="tabpanel"
                            aria-labelledby="emoticon-tab-exclusive"
                            aria-hidden={activeEmoticonTab !== "exclusive"}
                            className="flex h-full w-1/2 shrink-0 flex-col px-1"
                          >
                            <div className="relative z-10 mb-1.5 shrink-0 px-1">
                              <button
                                type="button"
                                tabIndex={
                                  activeEmoticonTab === "exclusive" ? 0 : -1
                                }
                                aria-haspopup="listbox"
                                aria-expanded={isExclusivePackMenuOpen}
                                onClick={() =>
                                  setIsExclusivePackMenuOpen(
                                    (isOpen) => !isOpen,
                                  )
                                }
                                className={`inline-flex items-center gap-0.5 px-2 py-1 text-left text-xs font-semibold text-[#426b81] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#65afd0]/40 ${
                                  isExclusivePackMenuOpen
                                    ? "rounded-md border border-[#9dbdcc] bg-white/85 shadow-sm"
                                    : "border border-transparent"
                                }`}
                              >
                                <span>{activeExclusivePack.name}</span>
                                <MdKeyboardArrowDown
                                  aria-hidden="true"
                                  size={17}
                                  className={`text-[#6f91a2] transition-transform duration-200 ${
                                    isExclusivePackMenuOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </button>

                              {isExclusivePackMenuOpen && (
                                <div
                                  role="listbox"
                                  aria-label="Selecionar pacote de emoticons"
                                  className="absolute left-1 top-full mt-1 flex min-w-[140px] flex-col gap-1 overflow-hidden rounded-md border border-[#9dbdcc] bg-[#f8fdff] p-1 shadow-[0_6px_16px_rgba(35,76,98,0.2)]"
                                >
                                  {EXCLUSIVE_EMOTICON_PACKS.map((pack) => {
                                    const isSelected =
                                      pack.id === activeExclusivePack.id;

                                    return (
                                      <button
                                        key={pack.id}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => {
                                          setActiveExclusivePackId(pack.id);
                                          setIsExclusivePackMenuOpen(false);
                                        }}
                                        className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                                          isSelected
                                            ? "bg-[#dceef6] font-semibold text-[#287da5]"
                                            : "text-[#52758a] hover:bg-[#e5f3f9] hover:text-[#287da5]"
                                        }`}
                                      >
                                        {pack.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div
                              className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
                              aria-label={`Emoticons do pacote ${activeExclusivePack.name}`}
                            >
                              <div className="grid grid-cols-7 gap-1">
                                {activeExclusivePack.emoticons.map(
                                  (emoticon) => (
                                    <button
                                      key={emoticon.code}
                                      type="button"
                                      tabIndex={
                                        activeEmoticonTab === "exclusive"
                                          ? 0
                                          : -1
                                      }
                                      aria-label={`Inserir ${emoticon.alt.toLowerCase()}`}
                                      onClick={() =>
                                        handleSelectEmoticon(emoticon.code)
                                      }
                                      className="flex h-11 w-11 items-center justify-center rounded-md border border-transparent transition-colors hover:border-white hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#65afd0]/50"
                                    >
                                      <img
                                        src={emoticon.src}
                                        alt={emoticon.alt}
                                        className="h-[30px] w-[30px] object-contain"
                                      />
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
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
                  onClick={handleToggleVideoCall}
                  className="rounded-md border border-transparent p-2 transition-colors hover:border-white hover:bg-white/70"
                >
                  <MdOutlineVideoChat className="text-[#527b90]" size={20} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={!message.trim() || isSending}
                title="Enviar mensagem criptografada"
                className="rounded-md border border-[#3989b1] bg-gradient-to-b from-[#78c5e5] to-[#3295c2] px-4 py-1.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_1px_2px_rgba(31,82,108,0.24)] transition hover:from-[#8bd1ec] hover:to-[#3aa2cf] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </section>

        <footer className="flex min-h-6 shrink-0 items-center px-3 pb-1 text-[10px] text-[#67899a]">
          <p className={sendError ? "text-red-600" : undefined}>
            {sendError || (lastReceivedAt
              ? `Última mensagem recebida em ${lastReceivedAt}`
              : "Nenhuma mensagem recebida nesta conversa")}
          </p>
        </footer>
      </div>
    </main>
  );
}

export default ChatWindow;
