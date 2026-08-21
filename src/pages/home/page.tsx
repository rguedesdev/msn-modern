// Imports Principais
import { useState, useEffect, useRef, useMemo, useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Importa as funções nativas do Tauri para controle de janelas
import { invoke, isTauri } from "@tauri-apps/api/core";
import { emitTo, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"; // Para cria

// Componentes
import { PictureFrame } from "../../shared/constants/PictureFrame/page";
import { Input } from "../../shared/components/Input";
import { MediaSourceIcon } from "../../shared/components/MediaSourceIcon";
import { useTheme } from "../../shared/theme/ThemeContext";

// Constants
import { getTextEffectStyle } from "../../shared/constants/TextEffects/page";
import {
  PROFILE_STYLE_OPTIONS,
  type NameEffect,
  type ProfileFrame,
} from "../../shared/constants/ProfileStyle/page";
import {
  getStatusOptionClassName,
  isUserStatus,
  LOGIN_STATUS_STORAGE_KEY,
  STATUS_CONFIG,
  type UserStatus,
} from "../../shared/constants/StatusConfig/page";
import {
  OPEN_CONVERSATION_FROM_NOTIFICATION_EVENT,
  type OpenConversationFromNotificationPayload,
} from "../../shared/constants/NotificationEvents";
import {
  TYPING_CHANGED_EVENT,
} from "../../shared/constants/TypingEvents";
import { MESSAGE_STATUS_CHANGED_EVENT } from "../../shared/constants/MessageEvents";
import {
  CONTACT_STATUS_FRAMES,
  toContactStatus,
  type ContactStatus,
} from "../../shared/constants/ContactStatusFrame/page";
import {
  MessengerNotification,
  type MessengerNotificationData,
} from "../../shared/components/MessengerNotification";
import { showStyledNotificationWindow } from "../../shared/utils/styledNotification";
import { useAuth } from "../../shared/auth/AuthContext";
import { resolveApiAssetUrl } from "../../shared/api/client";
import { useApiAssetUrl } from "../../shared/hooks/useApiAssetUrl";
import {
  createDirectConversation,
  findUserByEmail,
  listConversations,
} from "../../shared/api/conversations";
import { connectRealtime } from "../../shared/api/realtime";
import { markMessagesStatus } from "../../shared/api/messages";
import type { Socket } from "socket.io-client";
import { decryptEnvelope, registerCurrentDevice } from "../../shared/api/e2ee";
import {
  addContactFormSchema,
  personalMessageFormSchema,
  type AddContactFormData,
  type AddContactFormInput,
  type PersonalMessageFormData,
  type PersonalMessageFormInput,
} from "../../shared/validation/forms";

// Icones
import { TbPhoneCall } from "react-icons/tb";
import { AiOutlineVideoCamera } from "react-icons/ai";
import {
  MdArrowDropDown,
  MdClose,
  MdCropSquare,
  MdDarkMode,
  MdMinimize,
  MdMusicNote,
  MdLockOutline,
  MdOutlineContacts,
  MdOutlineDelete,
  MdOutlinePhotoCamera,
  MdOutlinePersonAddAlt,
  MdOutlinePersonOff,
  MdOutlineGroups,
  MdPalette,
  MdPersonOutline,
  MdSearch,
  MdSettings,
} from "react-icons/md";
import { ImMakeGroup } from "react-icons/im";

// Imagens
import AnimeAds from "../../assets/images/ads-anime.jpg";
import onlineSound from "../../assets/sounds/msn-online.mp3";
import messageSound from "../../assets/sounds/msn-message.mp3";
import { decodeChatPayload } from "../../shared/utils/chatPayload";

interface Contact {
  id: string;
  kind: "direct" | "group";
  userId: string;
  participantUserIds: string[];
  name: string;
  avatarUrl: string;
  profileFrame: ProfileFrame;
  nameEffect: NameEffect;
  status: ContactStatus;
  msg: string;
  musicSource: string;
  group: string;
}

interface BrowserNotificationInstance {
  instanceId: number;
  notification: MessengerNotificationData;
}

let lastNotificationId = 0;

function nextNotificationId() {
  lastNotificationId = Math.max(Date.now(), lastNotificationId + 1);
  return lastNotificationId;
}

function ContactActivity({ contact }: { contact: Contact }) {
  if (!contact.msg) return null;

  return (
    <span className="relative -top-1 flex h-[18px] w-full min-w-0 max-w-full items-end gap-1.5 overflow-hidden text-xs leading-4 italic text-[#7894a2]">
      {contact.musicSource && (
        <span
          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center not-italic ${
            contact.musicSource.toLowerCase().includes("spotify")
              ? "text-[14px]"
              : "text-[16px]"
          } ${
            contact.musicSource.toLowerCase().includes("deezer")
              ? "scale-[0.875]"
              : ""
          } ${
            contact.musicSource.toLowerCase().includes("89 a rádio rock")
              ? "scale-[0.7222]"
              : ""
          } ${
            contact.musicSource.toLowerCase().includes("rádio j-hero")
              ? "scale-[0.8889]"
              : ""
          } ${
            contact.musicSource.toLowerCase().includes("asia dream radio")
              ? "scale-[0.8889]"
              : ""
          } ${
            contact.musicSource.toLowerCase().includes("amazon")
              ? "scale-[0.9375]"
              : ""
          } ${
            contact.musicSource.toLowerCase().includes("kiss fm")
              ? "scale-[0.9444]"
              : ""
          } ${
            contact.musicSource.toLowerCase().includes("alpha fm")
              ? "scale-[0.8333]"
              : ""
          }`}
        >
          <MediaSourceIcon source={contact.musicSource} />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{contact.msg}</span>
    </span>
  );
}

function ContactStatusFrame({
  contact,
}: {
  contact: Contact;
}) {
  const frame = CONTACT_STATUS_FRAMES[contact.status];
  const avatarUrl = useApiAssetUrl(contact.avatarUrl);

  return (
    <div
      role="img"
      aria-label={`${contact.name}, ${frame.label}`}
      title={frame.label}
      className="shrink-0 rounded-[7px] p-[3px] shadow-[0_1px_3px_rgba(45,91,113,0.22)]"
      style={{ background: frame.background }}
    >
      <div
        className="h-8 w-8 overflow-hidden rounded-[6px] bg-white shadow-inner"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#e7f6f2] via-[#ccebe5] to-[#a9d3e4] text-sm font-bold text-[#438d73]"
          >
            {contact.name.trim().charAt(0).toLocaleUpperCase("pt-BR") || "U"}
          </span>
        )}
      </div>
    </div>
  );
}

interface MediaInfo {
  title: string;
  artist: string;
  source: string;
}

const UNKNOWN_ARTIST = "Artista desconhecido";
const KISS_FM_NOW_PLAYING_URL =
  "https://np.tritondigital.com/public/nowplaying?mountName=RADIO_KISSFM&numberToFetch=1&eventType=track";
const RADIO_J_HERO_NOW_PLAYING_URL =
  "https://api.radiojhero.com/streaming/np";
const RADIO_89_NOW_PLAYING_URL =
  "https://players.gc2.com.br/cron/89fm/results.json";
const ASIA_DREAM_CHANNELS = [
  [
    "j-pop powerplay kawaii",
    "https://kathy.torontocast.com:2650/api/v2/history/?limit=1&offset=0&server=2",
    "Asia DREAM Radio — J-Pop Powerplay Kawaii",
  ],
  [
    "j-pop powerplay",
    "https://kathy.torontocast.com:2650/api/v2/history/?limit=1&offset=0&server=1",
    "Asia DREAM Radio — J-Pop Powerplay",
  ],
  [
    "j-club powerplay hiphop",
    "https://kathy.torontocast.com:3310/api/v2/history/?limit=1&offset=0&server=5",
    "Asia DREAM Radio — J-Club Powerplay HipHop",
  ],
  [
    "j-rock powerplay",
    "https://kathy.torontocast.com:3310/api/v2/history/?limit=1&offset=0&server=4",
    "Asia DREAM Radio — J-Rock Powerplay",
  ],
  [
    "jazz sakura",
    "https://kathy.torontocast.com:3310/api/v2/history/?limit=1&offset=0&server=1",
    "Asia DREAM Radio — Jazz Sakura",
  ],
  [
    "j-sakura",
    "https://quincy.torontocast.com:1970/api/v2/history/?limit=1&offset=0&server=3",
    "Asia DREAM Radio — J-Sakura",
  ],
  [
    "japan hits",
    "https://quincy.torontocast.com:1970/api/v2/history/?limit=1&offset=0&server=1",
    "Asia DREAM Radio — Japan Hits",
  ],
] as const;
const CANONICAL_UPPERCASE_ARTISTS: Record<string, string> = {
  "AC/DC": "AC/DC",
  ABBA: "ABBA",
  HIM: "HIM",
  INXS: "INXS",
  REM: "R.E.M.",
  "R.E.M.": "R.E.M.",
  U2: "U2",
  UB40: "UB40",
  "ZZ TOP": "ZZ Top",
};
const KISS_FM_LOWERCASE_WORDS = new Set([
  "a",
  "à",
  "ao",
  "aos",
  "an",
  "and",
  "as",
  "às",
  "at",
  "but",
  "by",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "for",
  "from",
  "in",
  "na",
  "nas",
  "no",
  "nos",
  "nor",
  "o",
  "of",
  "on",
  "or",
  "os",
  "ou",
  "per",
  "para",
  "por",
  "sem",
  "the",
  "to",
  "um",
  "uma",
  "umas",
  "uns",
  "via",
  "with",
]);

function normalizeKissFmText(value: string) {
  const canonicalValue =
    CANONICAL_UPPERCASE_ARTISTS[value.toLocaleUpperCase("pt-BR")];
  if (canonicalValue) return canonicalValue;

  return value
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const canonicalWord =
        CANONICAL_UPPERCASE_ARTISTS[word.toLocaleUpperCase("pt-BR")];
      if (canonicalWord) return canonicalWord;

      const lowercaseWord = word.toLocaleLowerCase("pt-BR");
      const comparableWord = lowercaseWord.replace(
        /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,
        "",
      );
      if (index > 0 && KISS_FM_LOWERCASE_WORDS.has(comparableWord)) {
        return lowercaseWord;
      }

      return lowercaseWord.replace(
        /(^|[-/])([^\p{L}]*)(\p{L})/gu,
        (_, separator, prefix, initial) =>
          `${separator}${prefix}${initial.toLocaleUpperCase("pt-BR")}`,
      );
    })
    .join(" ");
}

async function getKissFmTrack() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2_500);

  try {
    const response = await fetch(KISS_FM_NOW_PLAYING_URL, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const document = new DOMParser().parseFromString(
      await response.text(),
      "text/xml",
    );
    if (document.querySelector("parsererror")) return null;

    const properties = Array.from(document.querySelectorAll("property"));
    const getProperty = (name: string) =>
      properties
        .find((property) => property.getAttribute("name") === name)
        ?.textContent?.trim();
    const kissFmTitle = getProperty("cue_title");
    const artist = getProperty("track_artist_name");

    if (!kissFmTitle) return null;

    return {
      title: normalizeKissFmText(kissFmTitle),
      artist: artist ? normalizeKissFmText(artist) : UNKNOWN_ARTIST,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function getAsiaDreamTrackFromChannel(
  channel: (typeof ASIA_DREAM_CHANNELS)[number],
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2_500);

  try {
    const response = await fetch(channel[1], {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      results?: Array<{
        author?: string | null;
        title?: string | null;
        metadata?: string | null;
      }>;
    };
    const currentTrack = data.results?.[0];
    const metadata = currentTrack?.metadata?.trim() || "";
    const metadataSeparator = metadata.indexOf(" - ");
    const title =
      currentTrack?.title?.trim() ||
      (metadataSeparator >= 0
        ? metadata.slice(metadataSeparator + 3).trim()
        : metadata);
    if (!title) return null;

    return {
      title,
      artist:
        currentTrack?.author?.trim() ||
        (metadataSeparator >= 0
          ? metadata.slice(0, metadataSeparator).trim()
          : UNKNOWN_ARTIST),
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function getAsiaDreamTrack(source: string) {
  const normalizedSource = source.toLowerCase();
  const channel = ASIA_DREAM_CHANNELS.find(([name]) =>
    normalizedSource.includes(name),
  );

  return channel ? getAsiaDreamTrackFromChannel(channel) : null;
}

function normalizeTrackIdentity(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function trackMatches(
  media: MediaInfo,
  track: Pick<MediaInfo, "title" | "artist">,
) {
  const mediaTitle = normalizeTrackIdentity(media.title);
  const trackTitle = normalizeTrackIdentity(track.title);
  if (
    !mediaTitle ||
    !trackTitle ||
    (mediaTitle !== trackTitle &&
      !mediaTitle.includes(trackTitle) &&
      !trackTitle.includes(mediaTitle))
  ) {
    return false;
  }

  const mediaArtist = normalizeTrackIdentity(media.artist);
  const trackArtist = normalizeTrackIdentity(track.artist);
  return (
    media.artist === UNKNOWN_ARTIST ||
    track.artist === UNKNOWN_ARTIST ||
    !mediaArtist ||
    !trackArtist ||
    mediaArtist === trackArtist ||
    mediaArtist.includes(trackArtist) ||
    trackArtist.includes(mediaArtist)
  );
}

async function getRadioJHeroTrack() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2_500);

  try {
    const response = await fetch(RADIO_J_HERO_NOW_PLAYING_URL, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      song_history?: Array<{
        artist?: string | null;
        title?: string | null;
      }>;
    };
    const currentTrack = data.song_history?.[0];
    const title = currentTrack?.title?.trim();
    if (!title) return null;

    return {
      title,
      artist: currentTrack?.artist?.trim() || UNKNOWN_ARTIST,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function getRadio89Track() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2_500);

  try {
    const response = await fetch(RADIO_89_NOW_PLAYING_URL, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      musicas?: {
        tocando?: {
          singer?: string | null;
          song?: string | null;
        };
      };
    };
    const currentTrack = data.musicas?.tocando;
    const title = currentTrack?.song?.trim();
    if (!title) return null;

    return {
      title,
      artist: currentTrack?.singer?.trim() || UNKNOWN_ARTIST,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function formatMediaDescription(media: MediaInfo) {
  const normalizedSource = media.source.toLowerCase();

  if (
    normalizedSource.includes("kiss fm") &&
    media.artist === UNKNOWN_ARTIST
  ) {
    return "Rádio Kiss FM ♫";
  }

  if (normalizedSource.includes("kiss fm")) {
    return `${normalizeKissFmText(media.artist)} — ${normalizeKissFmText(media.title)} ♫`;
  }

  if (
    normalizedSource.includes("asia dream radio") &&
    media.artist === UNKNOWN_ARTIST
  ) {
    return `${media.source} ♫`;
  }

  if (
    normalizedSource.includes("rádio j-hero") &&
    media.artist === UNKNOWN_ARTIST
  ) {
    return "Rádio J-Hero ♫";
  }

  if (
    normalizedSource.includes("89 a rádio rock") &&
    (media.artist === UNKNOWN_ARTIST ||
      (media.artist.toLowerCase() === "a rádio rock" &&
        media.title.toLowerCase() === "89fm ao vivo"))
  ) {
    return "89 FM — A Rádio Rock ♫";
  }

  if (
    normalizedSource.includes("soundcloud") ||
    normalizedSource === "youtube"
  ) {
    return `${media.title} ♫`;
  }

  return `${media.artist} — ${media.title} ♫`;
}

const INITIAL_CONTACTS: Contact[] = [];
const ENABLE_LISTENING_ACTIVITY = true;
const SHARE_LISTENING_ACTIVITY_KEY = "msn-share-listening-activity";

function shareListeningActivityKey(userId: string): string {
  return `${SHARE_LISTENING_ACTIVITY_KEY}:${userId}`;
}

async function prepareProfileImage(file: File): Promise<File> {
  if (!/^image\/(?:jpeg|png|webp)$/.test(file.type)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WebP");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("A imagem original deve ter no máximo 5 MB");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível abrir a imagem"));
      image.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    const outputSize = 320;
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível processar a imagem");
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize,
    );
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("Não foi possível processar a imagem")),
        "image/jpeg",
        0.86,
      );
    });
    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function initialUserStatus(): UserStatus {
  const storedStatus = sessionStorage.getItem(LOGIN_STATUS_STORAGE_KEY);
  return isUserStatus(storedStatus) ? storedStatus : "online";
}

function HomePage() {
  const { theme, setTheme } = useTheme();
  const {
    user,
    signOut,
    removeAvatar,
    updateAvatar,
    updatePassword,
    updatePersonalMessage,
    updateProfile,
  } = useAuth();
  const navigate = useNavigate();
  const appWindow = useMemo(() => (isTauri() ? getCurrentWindow() : null), []);
  const [contatos, setContatos] = useState<Contact[]>(INITIAL_CONTACTS);
  const contatosRef = useRef<Contact[]>(INITIAL_CONTACTS);
  const onlineUserIdsRef = useRef(new Set<string>());
  const realtimeProfilesRef = useRef(new Map<string, {
    personalMessage: string;
    music: string;
    musicSource: string;
  }>());
  const ownRealtimeProfileRef = useRef({
    personalMessage: "",
    music: "",
    musicSource: "",
  });
  const realtimeSocketRef = useRef<Socket | null>(null);
  const [browserNotifications, setBrowserNotifications] =
    useState<BrowserNotificationInstance[]>([]);
  const browserNotificationSequenceRef = useRef(0);
  const browserNotificationTimersRef = useRef(new Set<number>());
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [isAddingContact, setIsAddingContact] = useState(false);
  const onlineAudioRef = useRef<HTMLAudioElement | null>(null);
  const messageAudioRef = useRef<HTMLAudioElement | null>(null);
  const onlineNotificationTimesRef = useRef(new Map<string, number>());

  const [status, setStatus] = useState<UserStatus>(initialUserStatus);
  const statusRef = useRef<UserStatus>(status);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [displayNameDraft, setDisplayNameDraft] = useState(() => user?.displayName ?? "");
  const [avatarDraft, setAvatarDraft] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [isAvatarRemovalPending, setIsAvatarRemovalPending] = useState(false);
  const [profileFrameDraft, setProfileFrameDraft] = useState<ProfileFrame>(
    () => user?.profileFrame ?? "status",
  );
  const [nameEffectDraft, setNameEffectDraft] = useState<NameEffect>(
    () => user?.nameEffect ?? "default",
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileSettingsMessage, setProfileSettingsMessage] = useState("");
  const [profileSettingsError, setProfileSettingsError] = useState("");
  const [passwordSettingsMessage, setPasswordSettingsMessage] = useState("");
  const [passwordSettingsError, setPasswordSettingsError] = useState("");
  const [isSavingProfileSettings, setIsSavingProfileSettings] = useState(false);
  const [isPreparingProfileImage, setIsPreparingProfileImage] = useState(false);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [personalMessage, setPersonalMessage] = useState(
    () => user?.personalMessage ?? "",
  );
  const [isEditingPersonalMessage, setIsEditingPersonalMessage] =
    useState(false);
  const [shareListeningActivity, setShareListeningActivity] = useState(
    () =>
      ENABLE_LISTENING_ACTIVITY &&
      Boolean(user?.id) &&
      localStorage.getItem(shareListeningActivityKey(user!.id)) === "true",
  );
  const [currentMedia, setCurrentMedia] = useState<MediaInfo | null>(null);

  useEffect(() => {
    if (!isSettingsOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !settingsRef.current?.contains(target)) {
        setIsSettingsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSettingsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSettingsOpen]);

  const {
    register: registerAddContact,
    handleSubmit: submitAddContact,
    reset: resetAddContact,
    clearErrors: clearAddContactErrors,
    setError: setAddContactError,
    formState: {
      errors: addContactErrors,
      isSubmitting: isAddingContactPending,
    },
  } = useForm<AddContactFormInput, unknown, AddContactFormData>({
    resolver: zodResolver(addContactFormSchema),
    defaultValues: { email: "" },
  });
  const {
    register: registerPersonalMessage,
    handleSubmit: submitPersonalMessage,
    setValue: setPersonalMessageValue,
    clearErrors: clearPersonalMessageErrors,
    setError: setPersonalMessageError,
    formState: {
      errors: personalMessageErrors,
      isSubmitting: isSavingPersonalMessage,
    },
  } = useForm<PersonalMessageFormInput, unknown, PersonalMessageFormData>({
    resolver: zodResolver(personalMessageFormSchema),
    defaultValues: { personalMessage: "" },
  });

  const loadContacts = useCallback(async () => {
    if (!user) return;
    setContactsError("");
    try {
      const conversations = await listConversations();
      const mappedContacts = conversations.flatMap<Contact>((conversation) => {
        const otherParticipants = conversation.participants.filter(
          (candidate) => candidate._id !== user.id,
        );
        const participant = otherParticipants[0];
        if (!participant) return [];
        const isGroup = conversation.kind === "group";
        return [{
          id: conversation._id,
          kind: conversation.kind,
          userId: participant._id,
          participantUserIds: otherParticipants.map((candidate) => candidate._id),
          name: isGroup
            ? conversation.name?.trim() || otherParticipants.map((candidate) => candidate.displayName).join(", ")
            : participant.displayName,
          avatarUrl: isGroup
            ? conversation.avatarUrl || participant.avatarUrl || ""
            : participant.avatarUrl ?? "",
          profileFrame: participant.profileFrame ?? "status",
          nameEffect: participant.nameEffect ?? "default",
          status: otherParticipants.some((candidate) => onlineUserIdsRef.current.has(candidate._id))
            ? "online"
            : "offline",
          msg: (() => {
            if (isGroup) return `${conversation.participants.length} participantes`;
            const profile = realtimeProfilesRef.current.get(participant._id);
            return profile
              ? profile.music || profile.personalMessage
              : participant.personalMessage || "";
          })(),
          musicSource: (() => {
            const profile = realtimeProfilesRef.current.get(participant._id);
            return profile?.music ? profile.musicSource : "";
          })(),
          group: isGroup ? "Conversas em grupo" : "Geral",
        }];
      });
      contatosRef.current = mappedContacts;
      setContatos(mappedContacts);
    } catch (error) {
      setContactsError(error instanceof Error ? error.message : "Erro ao carregar contatos");
    } finally {
      setIsLoadingContacts(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadContacts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadContacts]);

  useEffect(() => {
    contatosRef.current = contatos;
  }, [contatos]);

  const showNotification = useCallback((notification: MessengerNotificationData) => {
    if (isTauri()) {
      void showStyledNotificationWindow(notification).catch((error) => {
        console.error("Erro ao exibir notificação:", error);
      });
      return;
    }
    browserNotificationSequenceRef.current += 1;
    const instance: BrowserNotificationInstance = {
      instanceId: browserNotificationSequenceRef.current,
      notification,
    };
    setBrowserNotifications((current) => [...current, instance]);
    const timer = window.setTimeout(() => {
      browserNotificationTimersRef.current.delete(timer);
      setBrowserNotifications((current) =>
        current.filter((item) => item.instanceId !== instance.instanceId),
      );
    }, 5_000);
    browserNotificationTimersRef.current.add(timer);
  }, []);

  const playMessageNotificationSound = useCallback(() => {
    const previousAudio = messageAudioRef.current;
    previousAudio?.pause();

    const audio = new Audio(messageSound);
    audio.preload = "auto";
    audio.volume = 1;
    messageAudioRef.current = audio;

    void audio.play().catch((error) => {
      if (messageAudioRef.current === audio) {
        console.error("Erro ao reproduzir notificação de mensagem:", error);
      }
    });
  }, []);

  const shouldShowMessageNotification = useCallback(async (conversationId: string) => {
    if (!appWindow) return true;

    try {
      const conversationWindow = await WebviewWindow.getByLabel(`chat-${conversationId}`);
      if (!conversationWindow) return true;
      const [isFocused, isMinimized] = await Promise.all([
        conversationWindow.isFocused(),
        conversationWindow.isMinimized(),
      ]);
      return isMinimized || !isFocused;
    } catch (error) {
      console.error("Erro ao verificar o estado da janela de conversa:", error);
      return true;
    }
  }, [appWindow]);

  const notifyContactOnline = useCallback((contact: Contact) => {
    const now = Date.now();
    const lastNotification = onlineNotificationTimesRef.current.get(contact.userId) ?? 0;
    if (now - lastNotification < 1_500) return;
    onlineNotificationTimesRef.current.set(contact.userId, now);

    showNotification({
      id: nextNotificationId(),
      contactId: contact.id,
      contactName: contact.name,
      avatarUrl: contact.avatarUrl,
      profileFrame: contact.profileFrame,
      nameEffect: contact.nameEffect,
      status: "online",
      kind: "online",
      text: "acabou de entrar.",
    });

    const previousAudio = onlineAudioRef.current;
    previousAudio?.pause();

    const audio = new Audio(onlineSound);
    audio.preload = "auto";
    audio.volume = 1;
    onlineAudioRef.current = audio;

    void audio.play().catch((error) => {
      if (onlineAudioRef.current === audio) {
        console.error("Erro ao reproduzir notificação de contato online:", error);
      }
    });
  }, [showNotification]);

  useEffect(() => () => {
    browserNotificationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    browserNotificationTimersRef.current.clear();
  }, []);

  const openConversation = useCallback(async (contact: Contact, nudge = false) => {
    const chatParams = new URLSearchParams({
      status: contact.status,
      name: contact.name,
      message: contact.msg,
      musicSource: contact.musicSource,
      avatarUrl: contact.avatarUrl,
      profileFrame: contact.profileFrame,
      nameEffect: contact.nameEffect,
      ownStatus: statusRef.current,
      ownProfileFrame: user?.profileFrame ?? "status",
      ownNameEffect: user?.nameEffect ?? "default",
      userId: contact.userId,
    });
    if (nudge) chatParams.set("nudge", String(Date.now()));

    if (!appWindow) {
      navigate(`/chat/${contact.id}?${chatParams.toString()}`);
      return;
    }

    const label = `chat-${contact.id}`;
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      if (!nudge) {
        await existing.unminimize();
        await existing.show();
        await existing.setFocus();
      }
      return;
    }

    new WebviewWindow(label, {
      url: `index.html#/chat/${contact.id}?${chatParams.toString()}`,
      title: contact.name,
      width: 900,
      height: 640,
      resizable: true,
      decorations: false,
      transparent: true,
      shadow: false,
      backgroundColor: [0, 0, 0, 0],
      visible: false,
    });
  }, [appWindow, navigate, user?.nameEffect, user?.profileFrame]);

  useEffect(() => {
    if (!appWindow) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<OpenConversationFromNotificationPayload>(
      OPEN_CONVERSATION_FROM_NOTIFICATION_EVENT,
      ({ payload }) => {
        const contact = contatosRef.current.find(
          (item) => item.id === payload.conversationId,
        );
        if (contact) void openConversation(contact);
      },
    ).then((stopListening) => {
      if (disposed) stopListening();
      else unlisten = stopListening;
    }).catch((error) => {
      console.error("Erro ao registrar clique da notificação:", error);
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [appWindow, openConversation]);

  useEffect(() => {
    if (!user || isLoadingContacts) return;
    const socket = connectRealtime((encryptedMessage) => {
      if (encryptedMessage.senderUserId === user.id) return;

      void (async () => {
        let status: "delivered" | "read" = "delivered";
        if (isTauri()) {
          try {
            const conversationWindow = await WebviewWindow.getByLabel(
              `chat-${encryptedMessage.conversationId}`,
            );
            if (conversationWindow) status = "read";
          } catch (error) {
            console.error("Não foi possível verificar se a conversa está aberta:", error);
          }
        }

        await markMessagesStatus(
          encryptedMessage.conversationId,
          [encryptedMessage._id],
          status,
        );
      })().catch((error) => {
        console.error("Não foi possível confirmar o recebimento da mensagem:", error);
      });

      const contact = contatosRef.current.find((item) => item.id === encryptedMessage.conversationId);
      if (!contact) return;
      playMessageNotificationSound();

      void (async () => {
        let text = "Enviou uma mensagem.";
        try {
          const identity = await registerCurrentDevice(user.id);
          const envelope = encryptedMessage.envelopes.find(
            (item) => item.recipientDeviceId === identity.deviceId,
          );
          if (envelope) {
            const decryptedPayload = await decryptEnvelope(
              user.id,
              encryptedMessage.conversationId,
              envelope.payload,
            );
            const decodedPayload = decodeChatPayload(decryptedPayload);
            text = decodedPayload.type === "image"
              ? "Enviou uma imagem."
              : decodedPayload.text;
          }
        } catch (error) {
          console.error("Não foi possível descriptografar a prévia da notificação:", error);
        }

        if (!await shouldShowMessageNotification(contact.id)) return;

        showNotification({
          id: nextNotificationId(),
          contactId: contact.id,
          contactName: contact.name,
          avatarUrl: contact.avatarUrl,
          profileFrame: contact.profileFrame,
          nameEffect: contact.nameEffect,
          status: contact.status,
          kind: "message",
          text,
        });
      })();
    }, (onlineUserIds) => {
      const online = new Set(onlineUserIds);
      onlineUserIdsRef.current = online;
      setContatos((current) => {
        let changed = false;
        const updated = current.map((contact) => {
          const status: ContactStatus = contact.participantUserIds.some((userId) => online.has(userId))
            ? "online"
            : "offline";
          if (contact.status === status) return contact;
          changed = true;
          return { ...contact, status };
        });
        const result = changed ? updated : current;
        contatosRef.current = result;
        return result;
      });
    }, ({ userId, online }) => {
      if (online) onlineUserIdsRef.current.add(userId);
      else onlineUserIdsRef.current.delete(userId);
      setContatos((current) => {
        let changed = false;
        const updated = current.map((contact) => {
          if (!contact.participantUserIds.includes(userId)) return contact;
          const nextStatus: ContactStatus = contact.participantUserIds.some(
            (participantUserId) => onlineUserIdsRef.current.has(participantUserId),
          ) ? "online" : "offline";
          if (contact.status === nextStatus) return contact;
          changed = true;
          return { ...contact, status: nextStatus };
        });
        const result = changed ? updated : current;
        contatosRef.current = result;
        return result;
      });
    }, (nudge) => {
      const contact = contatosRef.current.find(
        (item) => item.id === nudge.conversationId && item.participantUserIds.includes(nudge.senderUserId),
      );
      if (contact) void openConversation(contact, true);
    }, (profiles) => {
      realtimeProfilesRef.current = new Map(
        profiles.map((profile) => [profile.userId, profile]),
      );
      setContatos((current) => current.map((contact) => {
        if (contact.kind === "group") return contact;
        const profile = realtimeProfilesRef.current.get(contact.userId);
        if (!profile) return contact;
        const msg = profile?.music || profile?.personalMessage || "";
        const musicSource = profile?.music ? profile.musicSource : "";
        return contact.msg === msg && contact.musicSource === musicSource
          ? contact
          : { ...contact, msg, musicSource };
      }));
    }, (profile) => {
      realtimeProfilesRef.current.set(profile.userId, profile);
      const msg = profile.music || profile.personalMessage || "";
      const musicSource = profile.music ? profile.musicSource : "";
      setContatos((current) => current.map((contact) =>
        contact.kind === "direct" &&
          contact.userId === profile.userId &&
          (contact.msg !== msg || contact.musicSource !== musicSource)
          ? { ...contact, msg, musicSource }
          : contact,
      ));
    }, (statuses) => {
      const statusByUserId = new Map(
        statuses.map((item) => [item.userId, item.status]),
      );
      onlineUserIdsRef.current = new Set(
        statuses
          .filter((item) => item.status !== "offline")
          .map((item) => item.userId),
      );
      setContatos((current) => {
        const updated = current.map((contact) => {
          if (contact.kind === "direct") {
            return {
              ...contact,
              status: statusByUserId.get(contact.userId) ?? "offline",
            };
          }
          const status: ContactStatus = contact.participantUserIds.some(
            (participantUserId) => (statusByUserId.get(participantUserId) ?? "offline") !== "offline",
          ) ? "online" : "offline";
          return { ...contact, status };
        });
        contatosRef.current = updated;
        return updated;
      });
    }, ({ userId, status: contactStatus }) => {
      if (contactStatus === "offline") onlineUserIdsRef.current.delete(userId);
      else onlineUserIdsRef.current.add(userId);
      const contactBeforeChange = contatosRef.current.find(
        (contact) => contact.kind === "direct" && contact.userId === userId,
      );
      const shouldNotifyOnline = Boolean(
        contactStatus === "online" &&
        contactBeforeChange &&
        contactBeforeChange.status !== "online",
      );
      setContatos((current) => {
        let changed = false;
        const updated = current.map((contact) => {
          if (contact.kind === "direct") {
            if (contact.userId !== userId || contact.status === contactStatus) return contact;
            changed = true;
            return { ...contact, status: contactStatus };
          }
          if (!contact.participantUserIds.includes(userId)) return contact;
          const nextStatus: ContactStatus = contact.participantUserIds.some(
            (participantUserId) => onlineUserIdsRef.current.has(participantUserId),
          ) ? "online" : "offline";
          if (contact.status === nextStatus) return contact;
          changed = true;
          return { ...contact, status: nextStatus };
        });
        const result = changed ? updated : current;
        contatosRef.current = result;
        return result;
      });
      if (shouldNotifyOnline && contactBeforeChange) {
        notifyContactOnline(contactBeforeChange);
      }
    }, statusRef.current, (account) => {
      setContatos((current) => {
        let changed = false;
        const updated = current.map((contact) => {
          if (contact.kind === "group" || contact.userId !== account.userId) return contact;
          if (
            contact.name === account.displayName &&
            contact.avatarUrl === account.avatarUrl &&
            contact.profileFrame === account.profileFrame &&
            contact.nameEffect === account.nameEffect
          ) {
            return contact;
          }
          changed = true;
          return {
            ...contact,
            name: account.displayName,
            avatarUrl: account.avatarUrl,
            profileFrame: account.profileFrame,
            nameEffect: account.nameEffect,
          };
        });
        const result = changed ? updated : current;
        contatosRef.current = result;
        return result;
      });
    }, (typing) => {
      if (!isTauri()) return;
      void emitTo(
        `chat-${typing.conversationId}`,
        TYPING_CHANGED_EVENT,
        typing,
      ).catch((error) => {
        console.error("Erro ao encaminhar indicador de digitação:", error);
      });
    }, (status) => {
      if (!isTauri()) return;
      void emitTo(
        `chat-${status.conversationId}`,
        MESSAGE_STATUS_CHANGED_EVENT,
        status,
      ).catch((error) => {
        console.error("Erro ao encaminhar status da mensagem:", error);
      });
    }, () => {
      void loadContacts();
    });
    realtimeSocketRef.current = socket;
    const publishRealtimeState = () => {
      socket?.emit("profile:update", ownRealtimeProfileRef.current);
      socket?.emit("status:update", { status: statusRef.current });
    };
    socket?.on("connect", publishRealtimeState);
    if (socket?.connected) publishRealtimeState();
    return () => {
      socket?.off("connect", publishRealtimeState);
      realtimeSocketRef.current = null;
      socket?.disconnect();
    };
  }, [
    isLoadingContacts,
    loadContacts,
    notifyContactOnline,
    openConversation,
    playMessageNotificationSound,
    shouldShowMessageNotification,
    showNotification,
    user,
  ]);

  useEffect(() => {
    const profile = {
      personalMessage,
      music: shareListeningActivity && currentMedia
        ? formatMediaDescription(currentMedia)
        : "",
      musicSource: shareListeningActivity && currentMedia ? currentMedia.source : "",
    };
    ownRealtimeProfileRef.current = profile;
    realtimeSocketRef.current?.emit("profile:update", profile);
  }, [currentMedia, personalMessage, shareListeningActivity]);

  const changeStatus = (nextStatus: UserStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    sessionStorage.setItem(LOGIN_STATUS_STORAGE_KEY, nextStatus);
    const socket = realtimeSocketRef.current;
    if (socket && typeof socket.auth !== "function") {
      socket.auth = { ...socket.auth, status: nextStatus };
    }
    socket?.emit("status:update", { status: nextStatus });
    setIsStatusMenuOpen(false);
  };

  const addContact = async ({ email }: AddContactFormData) => {
    try {
      const foundUser = await findUserByEmail(email);
      if (!foundUser) throw new Error("Nenhum usuário encontrado com esse e-mail");
      if (foundUser.id === user?.id) throw new Error("Você não pode adicionar a si mesmo");
      await createDirectConversation(foundUser.id);
      resetAddContact();
      setIsAddingContact(false);
      await loadContacts();
    } catch (error) {
      setAddContactError("root.server", {
        message: error instanceof Error ? error.message : "Erro ao adicionar contato",
      });
    }
  };

  const handleAddContact = (event: FormEvent<HTMLFormElement>) => {
    void submitAddContact(addContact)(event);
  };

  async function handleLogout() {
    await signOut();
    navigate("/", { replace: true });
  }

  const startEditingPersonalMessage = () => {
    setPersonalMessageValue("personalMessage", personalMessage);
    clearPersonalMessageErrors();
    setIsEditingPersonalMessage(true);
  };

  const savePersonalMessage = async ({ personalMessage: value }: PersonalMessageFormData) => {
    try {
      await updatePersonalMessage(value);
      setPersonalMessage(value);
      setIsEditingPersonalMessage(false);
    } catch (error) {
      setPersonalMessageError("root.server", {
        message: error instanceof Error
          ? error.message
          : "Não foi possível salvar a frase de perfil",
      });
    }
  };

  const handleSavePersonalMessage = () => {
    void submitPersonalMessage(savePersonalMessage)();
  };

  useEffect(
    () => () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    },
    [avatarPreviewUrl],
  );

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const displayName = displayNameDraft.trim();
    setProfileSettingsMessage("");
    setProfileSettingsError("");
    if (!displayName) {
      setProfileSettingsError("Informe um nome de exibição");
      return;
    }
    if (displayName.length > 80) {
      setProfileSettingsError("O nome deve ter no máximo 80 caracteres");
      return;
    }

    setIsSavingProfileSettings(true);
    try {
      if (isAvatarRemovalPending) {
        await removeAvatar();
      } else if (avatarDraft) {
        await updateAvatar(avatarDraft);
      }
      if (displayName !== user?.displayName) {
        await updateProfile({ displayName });
      }
      setDisplayNameDraft(displayName);
      setAvatarDraft(null);
      setAvatarPreviewUrl("");
      setIsAvatarRemovalPending(false);
      setProfileSettingsMessage("Perfil atualizado.");
    } catch (error) {
      setProfileSettingsError(
        error instanceof Error ? error.message : "Não foi possível atualizar o perfil",
      );
    } finally {
      setIsSavingProfileSettings(false);
    }
  };

  const saveAppearance = async () => {
    setProfileSettingsMessage("");
    setProfileSettingsError("");
    setIsSavingAppearance(true);
    try {
      await updateProfile({
        profileFrame: profileFrameDraft,
        nameEffect: nameEffectDraft,
      });
      setProfileSettingsMessage("Aparência atualizada.");
    } catch (error) {
      setProfileSettingsError(
        error instanceof Error ? error.message : "Não foi possível atualizar a aparência",
      );
    } finally {
      setIsSavingAppearance(false);
    }
  };

  const changeProfileImage = async (file: File | undefined) => {
    if (!file) return;
    setProfileSettingsMessage("");
    setProfileSettingsError("");
    setIsPreparingProfileImage(true);
    try {
      const avatar = await prepareProfileImage(file);
      setAvatarDraft(avatar);
      setAvatarPreviewUrl(URL.createObjectURL(avatar));
      setIsAvatarRemovalPending(false);
      setProfileSettingsMessage("Imagem selecionada. Salve o perfil para confirmar.");
    } catch (error) {
      setProfileSettingsError(
        error instanceof Error ? error.message : "Não foi possível preparar a imagem",
      );
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      setIsPreparingProfileImage(false);
    }
  };

  const removeProfileImage = () => {
    setProfileSettingsMessage("");
    setProfileSettingsError("");
    setAvatarDraft(null);
    setAvatarPreviewUrl("");
    setIsAvatarRemovalPending(true);
    setProfileSettingsMessage("A imagem será removida ao salvar o perfil.");
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordSettingsMessage("");
    setPasswordSettingsError("");
    if (newPassword.length < 10) {
      setPasswordSettingsError("A nova senha deve ter pelo menos 10 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordSettingsError("A confirmação não corresponde à nova senha");
      return;
    }

    setIsSavingPassword(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSettingsMessage("Senha atualizada.");
    } catch (error) {
      setPasswordSettingsError(
        error instanceof Error ? error.message : "Não foi possível atualizar a senha",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  useEffect(() => {
    if (!ENABLE_LISTENING_ACTIVITY || !user?.id) return;

    localStorage.setItem(
      shareListeningActivityKey(user.id),
      String(shareListeningActivity),
    );

    if (!shareListeningActivity || !isTauri()) return;

    let isDisposed = false;
    let radioTrackCache: {
      source: string;
      track: Pick<MediaInfo, "title" | "artist"> | null;
      expiresAt: number;
    } | null = null;
    let browserRadioCache: {
      mediaKey: string;
      media: MediaInfo;
      expiresAt: number;
    } | null = null;

    const identifyBrowserRadio = async (media: MediaInfo) => {
      const normalizedSource = media.source.toLowerCase();
      const browserSources = [
        "chrome",
        "chromium",
        "edge",
        "firefox",
        "brave",
        "vivaldi",
        "opera",
        "librewolf",
        "waterfox",
        "floorp",
        "zen browser",
        "navegador",
        "player de música",
      ];
      if (
        !browserSources.some((browser) => normalizedSource.includes(browser))
      ) {
        return media;
      }

      const mediaKey = `${media.source}\u0000${media.artist}\u0000${media.title}`;
      if (
        browserRadioCache?.mediaKey === mediaKey &&
        browserRadioCache.expiresAt > Date.now()
      ) {
        return browserRadioCache.media;
      }

      const candidates = await Promise.all([
        getKissFmTrack().then((track) => ({ source: "Kiss FM", track })),
        getRadio89Track().then((track) => ({
          source: "89 A Rádio Rock",
          track,
        })),
        getRadioJHeroTrack().then((track) => ({
          source: "Rádio J-Hero",
          track,
        })),
        ...ASIA_DREAM_CHANNELS.map((channel) =>
          getAsiaDreamTrackFromChannel(channel).then((track) => ({
            source: channel[2],
            track,
          })),
        ),
      ]);
      const match = candidates.find(
        (candidate) => candidate.track && trackMatches(media, candidate.track),
      );
      const identifiedMedia = match?.track
        ? { ...media, ...match.track, source: match.source }
        : media;

      browserRadioCache = {
        mediaKey,
        media: identifiedMedia,
        expiresAt: Date.now() + 15_000,
      };
      return identifiedMedia;
    };

    const enrichRadioMedia = async (rawMedia: MediaInfo) => {
      const media = await identifyBrowserRadio(rawMedia);
      const normalizedSource = media.source.toLowerCase();
      const normalizedArtist = media.artist.toLowerCase();
      const normalizedTitle = media.title.toLowerCase();
      const isKissFm = normalizedSource.includes("kiss fm");
      const isAlphaFm = normalizedSource.includes("alpha fm");
      const isAsiaDreamRadio = normalizedSource.includes("asia dream radio");
      const isRadioJHero = normalizedSource.includes("rádio j-hero");
      const isRadio89 = normalizedSource.includes("89 a rádio rock");
      const isRadio89Placeholder =
        isRadio89 &&
        (["a rádio rock", "89 - a rádio rock", "89 a rádio rock"].includes(
          normalizedArtist,
        ) ||
          ["89fm ao vivo", "89 - a rádio rock", "89 a rádio rock"].includes(
            normalizedTitle,
          ));

      if (isAlphaFm) {
        return {
          ...media,
          title: normalizeKissFmText(media.title),
          artist: media.artist === UNKNOWN_ARTIST
            ? media.artist
            : normalizeKissFmText(media.artist),
        };
      }

      if (
        (!isKissFm && !isAsiaDreamRadio && !isRadioJHero && !isRadio89) ||
        (media.artist !== UNKNOWN_ARTIST && !isRadio89Placeholder)
      ) {
        return media;
      }

      if (
        radioTrackCache?.source === media.source &&
        radioTrackCache.expiresAt > Date.now()
      ) {
        return radioTrackCache.track
          ? { ...media, ...radioTrackCache.track }
          : isRadio89Placeholder
            ? { ...media, artist: UNKNOWN_ARTIST }
            : media;
      }

      let track: Pick<MediaInfo, "title" | "artist"> | null;
      if (isKissFm) {
        track = await getKissFmTrack();
      } else if (isAsiaDreamRadio) {
        track = await getAsiaDreamTrack(media.source);
      } else if (isRadio89) {
        track = await getRadio89Track();
      } else {
        track = await getRadioJHeroTrack();
      }
      radioTrackCache = {
        source: media.source,
        track,
        expiresAt: Date.now() + 15_000,
      };

      return track
        ? { ...media, ...track }
        : isRadio89Placeholder
          ? { ...media, artist: UNKNOWN_ARTIST }
          : media;
    };

    const updateCurrentMedia = async () => {
      try {
        const media = await invoke<MediaInfo | null>("get_current_media");
        const enrichedMedia = media ? await enrichRadioMedia(media) : null;
        if (!isDisposed) setCurrentMedia(enrichedMedia);
      } catch (error) {
        console.error("Erro ao consultar a mídia em reprodução:", error);
        if (!isDisposed) setCurrentMedia(null);
      }
    };

    void updateCurrentMedia();
    const mediaPollTimer = window.setInterval(updateCurrentMedia, 3_000);

    return () => {
      isDisposed = true;
      window.clearInterval(mediaPollTimer);
    };
  }, [shareListeningActivity, user?.id]);

  useEffect(() => {
    if (!appWindow) return;
    const previousHtmlBackground = document.documentElement.style.background;
    const previousBodyBackground = document.body.style.background;

    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    void appWindow.setDecorations(false);
    void appWindow.setShadow(false);

    return () => {
      document.documentElement.style.background = previousHtmlBackground;
      document.body.style.background = previousBodyBackground;
    };
  }, [appWindow]);

  useEffect(() => {
    return () => {
      onlineAudioRef.current?.pause();
      onlineAudioRef.current = null;
      messageAudioRef.current?.pause();
      messageAudioRef.current = null;
    };
  }, []);

  // Lógica do duplo clique no contato
  const handleContactClick = (contato: Contact) => {
    void openConversation(contato);
  };

  // 1. Estado para controlar qual aba está ativa
  const [activeTab, setActiveTab] = useState("geral");

  // 3. Configuração visual e lógica das abas
  const tabsConfig = [
    {
      id: "geral",
      label: "Contatos",
      icon: <MdOutlineContacts size={18} />,
    },
    {
      id: "online",
      label: "Online",
      icon: <MdPersonOutline size={18} />,
    },
    {
      id: "offlines",
      label: "Offline",
      icon: <MdOutlinePersonOff size={18} />,
    },
    { id: "grupos", label: "Grupos", icon: <MdOutlineGroups size={18} /> },
  ];

  // 4. Função que filtra quais contatos aparecem baseando-se na aba ativa
  const getFiltrados = () => {
    const normalizedSearch = contactSearch.trim().toLocaleLowerCase("pt-BR");
    const visibleContacts = activeTab === "grupos"
      ? contatos
      : contatos.filter((contact) => contact.kind === "direct");
    const searched = normalizedSearch
      ? visibleContacts.filter((contact) =>
          `${contact.name} ${contact.msg}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
        )
      : visibleContacts;
    if (activeTab === "online") return searched.filter((c) => c.status !== "offline");
    if (activeTab === "offlines") return searched.filter((c) => c.status === "offline");
    return searched;
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-transparent font-sans antialiased [text-rendering:geometricPrecision]">
      <button
        type="button"
        aria-label="Redimensionar pela borda superior"
        className="absolute inset-x-3 top-0 z-50 h-1 cursor-n-resize"
        onMouseDown={() => void appWindow?.startResizeDragging("North")}
      />
      <button
        type="button"
        aria-label="Redimensionar pela borda inferior"
        className="absolute inset-x-3 bottom-0 z-50 h-1 cursor-s-resize"
        onMouseDown={() => void appWindow?.startResizeDragging("South")}
      />
      <button
        type="button"
        aria-label="Redimensionar pela borda esquerda"
        className="absolute inset-y-3 left-0 z-50 w-1 cursor-w-resize"
        onMouseDown={() => void appWindow?.startResizeDragging("West")}
      />
      <button
        type="button"
        aria-label="Redimensionar pela borda direita"
        className="absolute inset-y-3 right-0 z-50 w-1 cursor-e-resize"
        onMouseDown={() => void appWindow?.startResizeDragging("East")}
      />

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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3">
      {/* 1. SEÇÃO DO SEU PERFIL (MANTIDA NO TOPO) */}
      <aside className="relative flex flex-col gap-3 rounded-[12px] border border-[#8fb2c3] bg-gradient-to-br from-white/90 via-[#edf8fc]/90 to-[#cce7f2]/90 p-3 shadow-[0_3px_12px_rgba(38,79,103,0.16)]">
        <div
          ref={settingsRef}
          className="absolute right-3 top-3 z-40"
        >
          <button
            type="button"
            aria-label="Abrir configurações"
            aria-expanded={isSettingsOpen}
            aria-controls="profile-settings-panel"
            title="Configurações"
            onClick={() => {
              if (!isSettingsOpen) {
                setDisplayNameDraft(user?.displayName ?? "");
                setAvatarDraft(null);
                setAvatarPreviewUrl("");
                setIsAvatarRemovalPending(false);
                setProfileFrameDraft(user?.profileFrame ?? "status");
                setNameEffectDraft(user?.nameEffect ?? "default");
                if (avatarInputRef.current) avatarInputRef.current.value = "";
              }
              setIsSettingsOpen((isOpen) => !isOpen);
            }}
            className={`msn-settings-trigger grid h-8 w-8 place-items-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-[#65afd0]/40 ${
              isSettingsOpen
                ? "border-white bg-white/80 text-[#287da5]"
                : "border-transparent text-[#527b90] hover:border-white hover:bg-white/70"
            }`}
          >
            <MdSettings
              aria-hidden="true"
              size={20}
              className={`transition-transform duration-300 ${isSettingsOpen ? "rotate-45" : ""}`}
            />
          </button>

          {isSettingsOpen && (
            <section
              id="profile-settings-panel"
              aria-label="Configurações do MSN"
              className="absolute right-0 top-10 max-h-[680px] w-[340px] overflow-hidden rounded-[11px] border border-[#79a9bf] bg-gradient-to-b from-[#fafdff] to-[#e2f2f9] shadow-[0_12px_32px_rgba(35,76,98,0.28)]"
            >
              <div className="flex items-center border-b border-[#b9d3df] bg-white/45 px-3 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-[#315f77]">
                  <MdSettings aria-hidden="true" size={18} />
                  <h2 className="text-sm font-semibold">Configurações</h2>
                </div>
                <button
                  type="button"
                  aria-label="Fechar configurações"
                  onClick={() => setIsSettingsOpen(false)}
                  className="grid h-6 w-6 place-items-center rounded text-[#64879a] transition-colors hover:bg-white/80 hover:text-[#315f77]"
                >
                  <MdClose aria-hidden="true" size={16} />
                </button>
              </div>

              <div className="max-h-[630px] space-y-4 overflow-y-auto p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7894a2]">
                  Perfil
                </p>

                <div className="flex items-center gap-3 rounded-lg border border-white/80 bg-white/55 p-3">
                  <PictureFrame
                    imageSrc={
                      isAvatarRemovalPending
                        ? undefined
                        : avatarPreviewUrl ||
                          resolveApiAssetUrl(user?.avatarUrl) ||
                          undefined
                    }
                    imageAlt="Minha imagem de perfil"
                    displayName={user?.displayName}
                    imageSize={58}
                    frame={user?.profileFrame ?? "status"}
                    status={toContactStatus(status)}
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => void changeProfileImage(event.currentTarget.files?.[0])}
                    />
                    <button
                      type="button"
                      disabled={isSavingProfileSettings || isPreparingProfileImage}
                      onClick={() => avatarInputRef.current?.click()}
                      className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#79a9bf] bg-gradient-to-b from-white to-[#e5f3f9] px-2 py-1.5 text-[11px] font-semibold text-[#315f77] shadow-sm transition hover:border-[#4b97b9] hover:from-white hover:to-[#d7edf6] disabled:cursor-wait disabled:opacity-60"
                    >
                      <MdOutlinePhotoCamera aria-hidden="true" size={16} />
                      {isPreparingProfileImage ? "Preparando..." : "Escolher imagem"}
                    </button>
                    {(user?.avatarUrl || avatarDraft) && !isAvatarRemovalPending && (
                      <button
                        type="button"
                        disabled={isSavingProfileSettings || isPreparingProfileImage}
                        onClick={removeProfileImage}
                        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[#6e8998] transition hover:bg-white/70 hover:text-[#b14c4c] disabled:cursor-wait disabled:opacity-60"
                      >
                        <MdOutlineDelete aria-hidden="true" size={15} />
                        Remover imagem
                      </button>
                    )}
                  </div>
                </div>

                <form onSubmit={saveProfile} className="space-y-2">
                  <label className="block text-[11px] font-semibold text-[#52758a]">
                    Nome de exibição
                    <input
                      type="text"
                      value={displayNameDraft}
                      maxLength={80}
                      disabled={isSavingProfileSettings}
                      onChange={(event) => setDisplayNameDraft(event.currentTarget.value)}
                      className="mt-1 h-8 w-full rounded-md border border-[#9dbdcc] bg-white/90 px-2.5 text-xs font-normal text-[#31556a] outline-none shadow-inner transition focus:border-[#4d9fc4] focus:ring-2 focus:ring-[#70b9d8]/25 disabled:opacity-60"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={
                      isSavingProfileSettings ||
                      isPreparingProfileImage ||
                      (displayNameDraft.trim() === user?.displayName &&
                        !avatarDraft &&
                        !isAvatarRemovalPending)
                    }
                    className="w-full cursor-pointer rounded-md border border-[#3989b1] bg-gradient-to-b from-[#54add2] to-[#2788b4] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:from-[#65b8d9] hover:to-[#217da7] disabled:cursor-default disabled:opacity-50"
                  >
                    {isSavingProfileSettings ? "Salvando..." : "Salvar perfil"}
                  </button>
                </form>

                <details className="group overflow-hidden rounded-lg border border-white/80 bg-white/55">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[#315f77] transition hover:bg-white/65 [&::-webkit-details-marker]:hidden">
                    <MdPalette aria-hidden="true" size={17} />
                    <span className="flex-1">Moldura e Fonte</span>
                    <MdArrowDropDown
                      aria-hidden="true"
                      size={18}
                      className="transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>

                  <div className="space-y-4 border-t border-[#c7dce5] px-3 py-3">
                    <fieldset disabled={isSavingAppearance}>
                      <legend className="mb-2 text-[11px] font-semibold text-[#52758a]">
                        Estilo de Moldura
                      </legend>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          aria-pressed={profileFrameDraft === "status"}
                          onClick={() => setProfileFrameDraft("status")}
                          className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-2 text-left text-[11px] transition disabled:cursor-wait disabled:opacity-60 ${
                            profileFrameDraft === "status"
                              ? "border-[#3b96bd] bg-[#dff2fa] text-[#245f7b] shadow-[0_0_0_1px_rgba(59,150,189,0.18)]"
                              : "border-[#b6d0dc] bg-white/75 text-[#52758a] hover:border-[#7eb5ca] hover:bg-white"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="h-5 w-5 shrink-0 rounded border-2 border-white shadow-sm"
                            style={{ background: CONTACT_STATUS_FRAMES[toContactStatus(status)].background }}
                          />
                          Por status
                        </button>
                        {PROFILE_STYLE_OPTIONS.map((option) => {
                          const isOwned = user?.ownedProfileFrames?.includes(option.id) ?? false;
                          const isSelected = profileFrameDraft === option.id;
                          return (
                            <button
                              key={`frame-${option.id}`}
                              type="button"
                              disabled={!isOwned || isSavingAppearance}
                              aria-pressed={isSelected}
                              title={isOwned ? option.label : `${option.label} — não adquirido`}
                              onClick={() => setProfileFrameDraft(option.id)}
                              className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-[11px] transition ${
                                isOwned ? "cursor-pointer" : "cursor-not-allowed opacity-55"
                              } ${
                                isSelected
                                  ? "border-[#3b96bd] bg-[#dff2fa] text-[#245f7b] shadow-[0_0_0_1px_rgba(59,150,189,0.18)]"
                                  : "border-transparent bg-white/75 text-[#52758a] hover:border-[#7eb5ca] hover:bg-white"
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className="h-5 w-5 shrink-0 animate-[gradientMove_4s_linear_infinite] rounded border-2 border-white shadow-sm"
                                style={{
                                  background: option.background,
                                  backgroundSize: "300% 100%",
                                }}
                              />
                              <span className="min-w-0 flex-1 truncate">{option.label}</span>
                              {!isOwned && <MdLockOutline aria-hidden="true" size={13} />}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <fieldset disabled={isSavingAppearance}>
                      <legend className="mb-2 text-[11px] font-semibold text-[#52758a]">
                        Cor da Fonte
                      </legend>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          aria-pressed={nameEffectDraft === "default"}
                          onClick={() => setNameEffectDraft("default")}
                          className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-2 text-left text-[11px] transition disabled:cursor-wait disabled:opacity-60 ${
                            nameEffectDraft === "default"
                              ? "border-[#3b96bd] bg-[#dff2fa] text-[#245f7b] shadow-[0_0_0_1px_rgba(59,150,189,0.18)]"
                              : "border-[#b6d0dc] bg-white/75 text-[#52758a] hover:border-[#7eb5ca] hover:bg-white"
                          }`}
                        >
                          <span className="w-7 shrink-0 text-center text-sm font-extrabold text-[#31556a]">Aa</span>
                          Padrão
                        </button>
                        {PROFILE_STYLE_OPTIONS.map((option) => {
                          const isOwned = user?.ownedNameEffects?.includes(option.id) ?? false;
                          const isSelected = nameEffectDraft === option.id;
                          return (
                            <button
                              key={`name-${option.id}`}
                              type="button"
                              disabled={!isOwned || isSavingAppearance}
                              aria-pressed={isSelected}
                              title={isOwned ? option.label : `${option.label} — não adquirido`}
                              onClick={() => setNameEffectDraft(option.id)}
                              className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-[11px] transition ${
                                isOwned ? "cursor-pointer" : "cursor-not-allowed opacity-55"
                              } ${
                                isSelected
                                  ? "border-[#3b96bd] bg-[#dff2fa] text-[#245f7b] shadow-[0_0_0_1px_rgba(59,150,189,0.18)]"
                                  : "border-[#b6d0dc] bg-white/75 text-[#52758a] hover:border-[#7eb5ca] hover:bg-white"
                              }`}
                            >
                              <span
                                className="w-7 shrink-0 text-center text-sm font-extrabold"
                                style={getTextEffectStyle(option.id)}
                              >
                                Aa
                              </span>
                              <span className="min-w-0 flex-1 truncate">{option.label}</span>
                              {!isOwned && <MdLockOutline aria-hidden="true" size={13} />}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <button
                      type="button"
                      disabled={
                        isSavingAppearance ||
                        (profileFrameDraft === (user?.profileFrame ?? "status") &&
                          nameEffectDraft === (user?.nameEffect ?? "default"))
                      }
                      onClick={() => void saveAppearance()}
                      className="w-full cursor-pointer rounded-md border border-[#3989b1] bg-gradient-to-b from-[#54add2] to-[#2788b4] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:from-[#65b8d9] hover:to-[#217da7] disabled:cursor-default disabled:opacity-50"
                    >
                      {isSavingAppearance ? "Salvando..." : "Salvar aparência"}
                    </button>

                    <p className="flex items-start gap-1.5 text-[10px] leading-4 text-[#7894a2]">
                      <MdLockOutline aria-hidden="true" size={13} className="mt-0.5 shrink-0" />
                      Itens com cadeado ficam disponíveis depois de adquiridos.
                    </p>
                  </div>
                </details>

                <label className="group flex cursor-pointer select-none items-start gap-3 rounded-lg border border-white/80 bg-white/55 p-3 transition-all duration-200 ease-out hover:border-[#9bc7da] hover:bg-white/85 hover:shadow-[0_2px_8px_rgba(50,125,160,0.10)]">
                  <input
                    type="checkbox"
                    checked={theme === "dark"}
                    onChange={(event) => {
                      setTheme(event.currentTarget.checked ? "dark" : "light");
                    }}
                    className="msn-settings-checkbox mt-0.5 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#315f77]">
                      <MdDarkMode aria-hidden="true" size={16} />
                      Tema escuro
                    </span>
                    <span className="mt-1 block text-[11px] leading-4 text-[#64879a]">
                      Usa azul-petróleo, ciano e verde Messenger com contraste suave.
                    </span>
                  </span>
                </label>

                <label className="group flex cursor-pointer select-none items-start gap-3 rounded-lg border border-white/80 bg-white/55 p-3 transition-all duration-200 ease-out hover:border-[#9bc7da] hover:bg-white/85 hover:shadow-[0_2px_8px_rgba(50,125,160,0.10)]">
                  <input
                    type="checkbox"
                    checked={shareListeningActivity}
                    onChange={(event) => {
                      const shouldShare = event.currentTarget.checked;
                      setShareListeningActivity(shouldShare);
                      if (shouldShare) setIsEditingPersonalMessage(false);
                      else setCurrentMedia(null);
                    }}
                    className="msn-settings-checkbox mt-0.5 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#315f77]">
                      <MdMusicNote aria-hidden="true" size={16} />
                      Exibir música no perfil
                    </span>
                    <span className="mt-1 block text-[11px] leading-4 text-[#64879a]">
                      Mostra aos seus contatos o que você está ouvindo no momento.
                    </span>
                  </span>
                </label>

                {(profileSettingsError || profileSettingsMessage) && (
                  <p
                    role={profileSettingsError ? "alert" : "status"}
                    className={`rounded-md px-2.5 py-2 text-[11px] ${
                      profileSettingsError
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {profileSettingsError || profileSettingsMessage}
                  </p>
                )}

                <div className="border-t border-[#b9d3df] pt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7894a2]">
                    <MdLockOutline aria-hidden="true" size={14} />
                    Segurança
                  </p>
                  <form onSubmit={savePassword} className="space-y-2 rounded-lg border border-white/80 bg-white/55 p-3">
                    <label className="block text-[11px] font-semibold text-[#52758a]">
                      Senha atual
                      <input
                        type="password"
                        value={currentPassword}
                        autoComplete="current-password"
                        required
                        disabled={isSavingPassword}
                        onChange={(event) => setCurrentPassword(event.currentTarget.value)}
                        className="mt-1 h-8 w-full rounded-md border border-[#9dbdcc] bg-white/90 px-2.5 text-xs font-normal text-[#31556a] outline-none shadow-inner transition focus:border-[#4d9fc4] focus:ring-2 focus:ring-[#70b9d8]/25 disabled:opacity-60"
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-[#52758a]">
                      Nova senha
                      <input
                        type="password"
                        value={newPassword}
                        autoComplete="new-password"
                        minLength={10}
                        required
                        disabled={isSavingPassword}
                        onChange={(event) => setNewPassword(event.currentTarget.value)}
                        className="mt-1 h-8 w-full rounded-md border border-[#9dbdcc] bg-white/90 px-2.5 text-xs font-normal text-[#31556a] outline-none shadow-inner transition focus:border-[#4d9fc4] focus:ring-2 focus:ring-[#70b9d8]/25 disabled:opacity-60"
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-[#52758a]">
                      Confirmar nova senha
                      <input
                        type="password"
                        value={confirmPassword}
                        autoComplete="new-password"
                        minLength={10}
                        required
                        disabled={isSavingPassword}
                        onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                        className="mt-1 h-8 w-full rounded-md border border-[#9dbdcc] bg-white/90 px-2.5 text-xs font-normal text-[#31556a] outline-none shadow-inner transition focus:border-[#4d9fc4] focus:ring-2 focus:ring-[#70b9d8]/25 disabled:opacity-60"
                      />
                    </label>
                    {(passwordSettingsError || passwordSettingsMessage) && (
                      <p
                        role={passwordSettingsError ? "alert" : "status"}
                        className={`rounded-md px-2.5 py-2 text-[11px] ${
                          passwordSettingsError
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {passwordSettingsError || passwordSettingsMessage}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="w-full cursor-pointer rounded-md border border-[#3989b1] bg-gradient-to-b from-[#54add2] to-[#2788b4] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:from-[#65b8d9] hover:to-[#217da7] disabled:cursor-default disabled:opacity-50"
                    >
                      {isSavingPassword ? "Alterando..." : "Alterar senha"}
                    </button>
                  </form>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="flex max-h-[140px] flex-row gap-2">
          <PictureFrame
            imageSrc={resolveApiAssetUrl(user?.avatarUrl) || undefined}
            imageAlt="Minha imagem de perfil"
            displayName={user?.displayName}
            frame={user?.profileFrame ?? "status"}
            status={toContactStatus(status)}
          />
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div className="flex flex-col">
              <div className="flex flex-row items-center gap-2 pr-9">
                <span
                  className={`h-3 w-3 shrink-0 rounded-full border border-white shadow-sm ${STATUS_CONFIG[status].color}`}
                />

                <span
                  className="select-none text-[20px] font-extrabold text-[#31556a]"
                  style={user?.nameEffect && user.nameEffect !== "default"
                    ? getTextEffectStyle(user.nameEffect)
                    : undefined}
                >
                  {user?.displayName ?? "Usuário"}
                </span>

                <div
                  className="msn-status-picker relative"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setIsStatusMenuOpen(false);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setIsStatusMenuOpen(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={isStatusMenuOpen}
                    aria-haspopup="listbox"
                    onClick={() => setIsStatusMenuOpen((isOpen) => !isOpen)}
                    className="group inline-flex items-center rounded-md border border-transparent px-1.5 py-0.5 text-[#47748c] transition-colors hover:border-white hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-[#65afd0]/40"
                  >
                    <span className="text-sm font-normal italic">
                      ({STATUS_CONFIG[status].label})
                    </span>
                    <MdArrowDropDown
                      aria-hidden="true"
                      className={`text-[#527b90] transition-transform duration-200 ${isStatusMenuOpen ? "rotate-180" : ""}`}
                      size={20}
                    />
                  </button>

                  {isStatusMenuOpen && (
                    <div
                      role="listbox"
                      aria-label="Alterar status"
                      className="absolute right-0 top-full z-30 mt-1.5 flex min-w-[175px] flex-col gap-1 overflow-hidden rounded-[10px] border border-[#7faec4] bg-gradient-to-b from-[#f8fdff] to-[#e3f3fa] p-1.5 shadow-[0_10px_30px_rgba(35,76,98,0.24)]"
                    >
                      {Object.entries(STATUS_CONFIG).map(
                        ([statusValue, statusData]) => {
                          const isSelected = statusValue === status;

                          return (
                            <button
                              key={statusValue}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                changeStatus(statusValue as UserStatus);
                              }}
                              className={getStatusOptionClassName(isSelected)}
                            >
                              <span
                                className={`h-3 w-3 rounded-full border border-white shadow-sm ${statusData.color}`}
                              />
                              <span className="flex-1">{statusData.label}</span>
                              {isSelected && (
                                <span
                                  aria-hidden="true"
                                  className="text-xs text-[#3295c2]"
                                >
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!shareListeningActivity && (isEditingPersonalMessage ? (
                <form
                  onSubmit={(event) => void submitPersonalMessage(savePersonalMessage)(event)}
                  noValidate
                  className="w-full"
                >
                  <input
                    autoFocus
                    type="text"
                    aria-label="Mensagem pessoal"
                    placeholder="Insira uma mensagem pessoal"
                    maxLength={160}
                    disabled={isSavingPersonalMessage}
                    aria-invalid={Boolean(
                      personalMessageErrors.personalMessage || personalMessageErrors.root?.server,
                    )}
                    {...registerPersonalMessage("personalMessage")}
                    onBlur={handleSavePersonalMessage}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    className="mt-0.5 h-6 w-full rounded-md border border-[#7faec4] bg-white/80 px-2 text-[13px] italic text-[#436b80] outline-none shadow-inner transition focus:border-[#4d9fc4] focus:ring-2 focus:ring-[#70b9d8]/25"
                  />
                  {(personalMessageErrors.personalMessage?.message ||
                    personalMessageErrors.root?.server?.message) && (
                    <p role="alert" className="mt-1 text-xs text-red-700">
                      {personalMessageErrors.personalMessage?.message ??
                        personalMessageErrors.root?.server?.message}
                    </p>
                  )}
                </form>
              ) : (
                <button
                  type="button"
                  title="Clique para editar sua mensagem pessoal"
                  onClick={startEditingPersonalMessage}
                  className="msn-profile-message mt-0.5 max-w-full truncate rounded px-1 py-0.5 text-left text-[13px] italic transition-colors hover:bg-white/55 hover:text-[#315f77] focus:outline-none focus:ring-2 focus:ring-[#65afd0]/35"
                >
                  {personalMessage || "<Insira uma mensagem pessoal>"}
                </button>
              ))}

              {ENABLE_LISTENING_ACTIVITY && shareListeningActivity && (
                    <div
                      className={`mt-1 flex max-w-full items-center gap-1.5 px-1 text-[13px] italic ${
                        currentMedia ? "text-[#287da5]" : "text-[#7894a2]"
                      }`}
                      title={
                        currentMedia
                          ? `${formatMediaDescription(currentMedia)} (${currentMedia.source})`
                          : "Nenhuma mídia em reprodução"
                      }
                    >
                      <span
                        className={`shrink-0 text-[16px] not-italic ${
                          currentMedia?.source.toLowerCase().includes("asia dream radio")
                            ? "scale-[0.8889]"
                            : ""
                        } ${
                          currentMedia?.source.toLowerCase().includes("spotify")
                            ? "scale-[0.9375]"
                            : ""
                        } ${
                          currentMedia?.source.toLowerCase().includes("deezer")
                            ? "scale-[0.9375]"
                            : ""
                        } ${
                          currentMedia?.source.toLowerCase().includes("amazon")
                            ? "scale-[0.9375]"
                            : ""
                        } ${
                          currentMedia?.source.toLowerCase().includes("kiss fm")
                            ? "scale-[0.9444]"
                            : ""
                        } ${
                          currentMedia?.source.toLowerCase().includes("89 a rádio rock")
                            ? "scale-[0.8333]"
                            : ""
                        } ${
                          currentMedia?.source.toLowerCase().includes("alpha fm")
                            ? "scale-[0.8333]"
                            : ""
                        }`}
                        aria-hidden="false"
                      >
                        {currentMedia ? (
                          <MediaSourceIcon source={currentMedia.source} />
                        ) : (
                          <MdMusicNote aria-hidden="true" />
                        )}
                      </span>
                      <span className="truncate">
                        {currentMedia
                          ? formatMediaDescription(currentMedia)
                          : "Nenhuma mídia em reprodução"}
                      </span>
                    </div>
              )}
            </div>

            <div className="flex w-full flex-row items-center justify-between text-[#527b90]">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Adicionar contato"
                  onClick={() => {
                    if (isAddingContact) resetAddContact();
                    else clearAddContactErrors();
                    setIsAddingContact((current) => !current);
                  }}
                  className="msn-settings-trigger grid h-8 w-8 place-items-center rounded-md border border-transparent transition-colors hover:border-white hover:bg-white/70"
                >
                  <MdOutlinePersonAddAlt size={21} />
                </button>
                {[
                  {
                    label: "Criar grupo (em breve)",
                    icon: <ImMakeGroup aria-hidden="true" size={15} />,
                  },
                  {
                    label: "Iniciar chamada (em breve)",
                    icon: <TbPhoneCall aria-hidden="true" size={19} />,
                  },
                  {
                    label: "Iniciar videochamada (em breve)",
                    icon: <AiOutlineVideoCamera aria-hidden="true" size={19} />,
                  },
                ].map(({ label, icon }) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    aria-label={label}
                    title={label}
                    className="grid h-8 w-8 cursor-not-allowed place-items-center rounded-md border border-transparent opacity-40"
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="msn-settings-trigger rounded-md border border-transparent px-2 py-1 text-xs font-semibold text-[#527b90] transition-colors hover:border-white hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#65afd0]/40"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </aside>

      {isAddingContact && (
        <form
          onSubmit={handleAddContact}
          noValidate
          className="rounded-[10px] border border-[#8fb2c3] bg-white/80 px-3 pb-3 shadow-sm [&_input]:!shadow-none"
        >
          <Input
            inputName="Email do novo contato"
            type="email"
            disabled={isAddingContactPending}
            aria-invalid={Boolean(addContactErrors.email)}
            {...registerAddContact("email")}
          />
          {(addContactErrors.email?.message || addContactErrors.root?.server?.message) && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {addContactErrors.email?.message ?? addContactErrors.root?.server?.message}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetAddContact();
                setIsAddingContact(false);
              }}
              className="rounded border border-transparent px-3 py-1 text-xs text-[#52758a] transition-colors hover:border-red-300 hover:bg-red-50/80 hover:text-red-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isAddingContactPending}
              className="rounded border border-[#3989b1] bg-[#3295c2] px-3 py-1 text-xs font-semibold text-white transition-colors enabled:hover:border-[#28799f] enabled:hover:bg-[#2788b4] disabled:opacity-60"
            >
              {isAddingContactPending ? "Adicionando..." : "Adicionar"}
            </button>
          </div>
        </form>
      )}

      {/* CONTAINER FLEXBOX DIRECIONAL PARA SUPORTAR O CHAT LATERAL */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-row gap-3">
        {/* 2. COLUNA DE CONTATOS (SE ADAPTA AUTOMATICAMENTE) */}
        <section
          className="flex h-full min-w-0 max-w-full flex-1 flex-col gap-3 overflow-hidden rounded-[12px] border border-[#8fb2c3] bg-white/70 p-3 shadow-[0_3px_12px_rgba(38,79,103,0.14)] transition-all duration-300"
        >
          {/* Input de busca mantido no topo */}
          <div className="group relative [&_input]:!shadow-none [&_input]:pr-10">
            <Input
              inputName="Buscar contato"
              value={contactSearch}
              onChange={(event) => setContactSearch(event.currentTarget.value)}
            />
            <MdSearch
              aria-hidden="true"
              size={19}
              className="pointer-events-none absolute bottom-[11px] right-3 text-[#67899a] transition-colors duration-200 group-hover:text-[#328db7] group-focus-within:text-[#328db7]"
            />
          </div>

          {/* BARRA DE ABAS (TABS) */}
          <div className="border-b border-[#b9d3df]">
            <div className="relative mx-auto grid w-full max-w-[420px] grid-cols-4">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-1/4 transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(${tabsConfig.findIndex((tab) => tab.id === activeTab) * 100}%)`,
                }}
              >
                <span className="mx-auto block h-full w-[76%] rounded-full bg-[#3295c2]" />
              </span>

              {tabsConfig.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors duration-300 ${
                      isSelected
                        ? "text-[#287da5]"
                        : "text-[#7894a2] hover:bg-white/45 hover:text-[#426b81]"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LISTAGEM DE CONTATOS FILTRADA COM SCROLL INTERNO */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto pr-1">
            {isLoadingContacts && (
              <p className="py-4 text-center text-xs italic text-[#7894a2]">Carregando contatos...</p>
            )}
            {contactsError && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                {contactsError}
              </p>
            )}
            {!isLoadingContacts && !contactsError && getFiltrados().length === 0 && (
              <p className="py-4 text-center text-xs italic text-[#7894a2]">
                Nenhum contato. Use o botão de adicionar pessoa acima.
              </p>
            )}
            {!isLoadingContacts && !contactsError && (activeTab !== "grupos"
              ? // RENDERIZAÇÃO PADRÃO (GERAL OU OFFLINES)
                getFiltrados().map((contato) => (
                  <div
                    key={contato.id}
                    onDoubleClick={() => handleContactClick(contato)} // 👈 GATILHO DE JANELA (ABAS GERAIS)
                    className="flex min-w-0 max-w-full cursor-pointer select-none flex-row items-center gap-3 overflow-hidden rounded-[8px] border border-transparent p-1.5 transition-all hover:border-[#8ebbd0] hover:bg-gradient-to-r hover:from-[#d9eff9] hover:to-[#f5fbfe] hover:shadow-[0_1px_3px_rgba(45,91,113,0.14)]"
                  >
                    <ContactStatusFrame contact={contato} />
                    {/* Informações do Contato */}
                    <div
                      className={`flex h-[38px] min-w-0 flex-1 flex-col ${
                        contato.msg ? "justify-between" : "justify-center"
                      }`}
                    >
                      <span
                        className={`relative -top-px block min-w-0 max-w-full truncate text-sm font-medium leading-[18px] ${contato.status === "offline" ? "text-[#91a5af]" : "text-[#31556a]"}`}
                      >
                        {contato.name}
                      </span>
                      <ContactActivity contact={contato} />
                    </div>
                  </div>
                ))
              : // RENDERIZAÇÃO POR GRUPOS
                ["Geral", "Conversas em grupo"].map((grupoName) => {
                  const contatosDoGrupo = getFiltrados().filter(
                    (c) => c.group === grupoName,
                  );
                  return (
                    <div key={grupoName} className="mb-2 min-w-0 max-w-full overflow-hidden">
                      <h4 className="mb-1 rounded-md border border-white/75 bg-gradient-to-r from-[#dceef6] to-white/60 px-2 py-1 text-xs font-semibold text-[#52758a]">
                        {grupoName} ({contatosDoGrupo.length})
                      </h4>
                      {contatosDoGrupo.map((contato) => (
                        // O callback só lê statusRef quando o evento ocorre; o analisador o segue como se fosse render.
                        // eslint-disable-next-line react-hooks/refs
                        <div key={contato.id} onDoubleClick={() => handleContactClick(contato)}
                          className="flex min-w-0 max-w-full cursor-pointer select-none flex-row items-center gap-3 overflow-hidden rounded-[8px] border border-transparent p-1.5 pl-4 transition-all hover:border-[#8ebbd0] hover:bg-gradient-to-r hover:from-[#d9eff9] hover:to-[#f5fbfe] hover:shadow-[0_1px_3px_rgba(45,91,113,0.14)]"
                        >
                          <ContactStatusFrame contact={contato} />
                          <div
                            className={`flex h-[38px] min-w-0 flex-1 flex-col ${
                              contato.msg ? "justify-between" : "justify-center"
                            }`}
                          >
                            <span
                              className={`relative -top-px block min-w-0 max-w-full truncate text-sm font-medium leading-[18px] ${contato.status === "offline" ? "text-[#91a5af]" : "text-[#31556a]"}`}
                            >
                              {contato.name}
                            </span>
                            <ContactActivity contact={contato} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }))}
          </div>
        </section>

      </div>

      {/* 4. SEÇÃO INFERIOR DE ANÚNCIOS */}
        <section className="flex h-[180px] flex-col rounded-[12px] border border-[#8fb2c3] bg-white/65 p-3 shadow-[0_3px_12px_rgba(38,79,103,0.14)]">
          <div className="flex h-full w-full flex-col">
            <h3 className="mb-1 select-none text-xs font-medium uppercase tracking-[0.1em] text-[#91aeba]">
              Advertisement
            </h3>
            <hr className="mb-2 border-0 border-t border-[#b9d3df]" />
            <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-[8px] border border-[#b9d3df] bg-white/60">
              <img
                className="h-full w-full object-cover object-center"
                src={AnimeAds}
                alt="Advertisement"
              />
            </div>
          </div>
        </section>
        </div>
      </div>

      {browserNotifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-1.5">
          {browserNotifications.map(({ instanceId, notification }) => (
            <MessengerNotification
              key={instanceId}
              notification={notification}
              onClose={() => setBrowserNotifications((current) =>
                current.filter((item) => item.instanceId !== instanceId),
              )}
              onActivate={() => {
                const contact = contatosRef.current.find(
                  (item) => item.id === notification.contactId,
                );
                setBrowserNotifications((current) =>
                  current.filter((item) => item.instanceId !== instanceId),
                );
                if (contact) void openConversation(contact);
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}

export default HomePage;
