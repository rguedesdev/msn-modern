// Imports Principais
import { useState, useEffect, useRef, useMemo } from "react";

// Importa as funções nativas do Tauri para controle de janelas
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"; // Para cria
import { emit } from "@tauri-apps/api/event";

// Componentes
import { PictureFrame } from "../../shared/constants/PictureFrame/page";
import { Input } from "../../shared/components/Input";

// Constants
import { getTextEffectStyle } from "../../shared/constants/TextEffects/page";
import { STATUS_CONFIG } from "../../shared/constants/StatusConfig/page";
import {
  appendChatMessage,
  getChatMessages,
} from "../../shared/utils/chatStorage";
import type { MessengerNotificationData } from "../../shared/components/MessengerNotification";
import { showStyledNotificationWindow } from "../../shared/utils/styledNotification";

// Icones
import { TbPhoneCall } from "react-icons/tb";
import { AiOutlineVideoCamera } from "react-icons/ai";
import {
  MdArrowDropDown,
  MdClose,
  MdCropSquare,
  MdMinimize,
  MdMusicNote,
  MdOutlinePerson,
  MdOutlinePersonAddAlt,
  MdOutlinePersonOff,
  MdOutlineGroups,
} from "react-icons/md";
import {
  FaAmazon,
  FaLine,
  FaNapster,
  FaSpotify,
} from "react-icons/fa";
import { ImMakeGroup } from "react-icons/im";
import { RiDiscFill } from "react-icons/ri";
import {
  SiApplemusic,
  SiAudiomack,
  SiBandcamp,
  SiPandora,
  SiSoundcloud,
  SiTidal,
  SiYoutube,
  SiYoutubemusic,
} from "react-icons/si";

// Imagens
import AnimeAds from "../../assets/images/ads-anime.jpg";
import Radio89Logo from "../../assets/images/streamings/89-radio-rock.png";
import AsiaDreamRadioLogo from "../../assets/images/streamings/asia-dream-radio.jpg";
import DeezerLogo from "../../assets/images/streamings/deezer-logo.svg";
import KissFmLogo from "../../assets/images/streamings/kiss-fm-logo.svg";
import RadioJHeroLogo from "../../assets/images/streamings/radio-jhero.png";
import onlineSound from "../../assets/sounds/msn-online.mp3";
import messageSound from "../../assets/sounds/msn-message.mp3";

type ContactStatus = "online" | "ocupado" | "ausente" | "offline";

interface Contact {
  id: number;
  name: string;
  status: ContactStatus;
  msg: string;
  group: string;
}

interface IncomingMessage {
  id: number;
  contactId: number;
  sender: string;
  text: string;
  receivedAt: number;
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

function MediaSourceIcon({ source }: { source: string }) {
  const normalizedSource = source.toLowerCase();

  if (normalizedSource.includes("spotify")) {
    return <FaSpotify aria-label="Spotify" className="text-[#1db954]" />;
  }

  if (normalizedSource.includes("amazon")) {
    return <FaAmazon aria-label="Amazon Music" className="text-[#00a8e1]" />;
  }

  if (normalizedSource.includes("deezer")) {
    return (
      <img
        src={DeezerLogo}
        alt="Deezer"
        className="h-[16px] w-[16px] object-contain"
      />
    );
  }

  if (normalizedSource.includes("kiss fm")) {
    return (
      <img
        src={KissFmLogo}
        alt="Kiss FM"
        className="h-[18px] w-[18px] object-contain"
      />
    );
  }

  if (normalizedSource.includes("asia dream radio")) {
    return (
      <img
        src={AsiaDreamRadioLogo}
        alt="Asia DREAM Radio"
        className="h-[18px] w-[18px] rounded-sm object-contain"
      />
    );
  }

  if (normalizedSource.includes("rádio j-hero")) {
    return (
      <img
        src={RadioJHeroLogo}
        alt="Rádio J-Hero"
        className="h-[18px] w-[18px] rounded-sm object-contain"
      />
    );
  }

  if (normalizedSource.includes("89 a rádio rock")) {
    return (
      <span className="block h-[18px] w-[18px] overflow-hidden rounded-sm bg-black">
        <img
          src={Radio89Logo}
          alt="89 A Rádio Rock"
          className="h-full w-auto max-w-none object-contain object-left"
        />
      </span>
    );
  }

  if (normalizedSource.includes("tidal")) {
    return <SiTidal aria-label="TIDAL" className="text-black" />;
  }

  if (normalizedSource.includes("youtube music")) {
    return <SiYoutubemusic aria-label="YouTube Music" className="text-red-600" />;
  }

  if (normalizedSource.includes("youtube")) {
    return <SiYoutube aria-label="YouTube" className="text-red-600" />;
  }

  if (normalizedSource.includes("apple music")) {
    return <SiApplemusic aria-label="Apple Music" className="text-[#fa243c]" />;
  }

  if (normalizedSource.includes("napster")) {
    return <FaNapster aria-label="Napster" className="text-[#171717]" />;
  }

  if (normalizedSource.includes("line music")) {
    return <FaLine aria-label="LINE MUSIC" className="text-[#06c755]" />;
  }

  if (normalizedSource.includes("soundcloud")) {
    return <SiSoundcloud aria-label="SoundCloud" className="text-[#ff5500]" />;
  }

  if (normalizedSource.includes("pandora")) {
    return <SiPandora aria-label="Pandora" className="text-[#3668ff]" />;
  }

  if (normalizedSource.includes("bandcamp")) {
    return <SiBandcamp aria-label="Bandcamp" className="text-[#1da0c3]" />;
  }

  if (normalizedSource.includes("audiomack")) {
    return <SiAudiomack aria-label="Audiomack" className="text-[#ffa200]" />;
  }

  const streamingWithoutBundledIcon = [
    "qobuz",
    "anghami",
    "jiosaavn",
    "boomplay",
  ];

  if (
    streamingWithoutBundledIcon.some((service) =>
      normalizedSource.includes(service),
    )
  ) {
    return <MdMusicNote aria-label={source} />;
  }

  return (
    <RiDiscFill
      aria-label={source || "Player de música"}
      className="text-black"
    />
  );
}

const INITIAL_CONTACTS: Contact[] = [
  {
    id: 1,
    name: "Ju_S2_Anime",
    status: "online",
    msg: "Ouvindo: Linkin Park",
    group: "Escola",
  },
  {
    id: 2,
    name: "XXx_Hacker_xXX",
    status: "ocupado",
    msg: "Não incomodar!",
    group: "Trabalho",
  },
  {
    id: 3,
    name: "Vash_The_Stampede",
    status: "ausente",
    msg: "Fui almoçar",
    group: "Geral",
  },
  {
    id: 4,
    name: "Sasuke_Uchiha",
    status: "offline",
    msg: "",
    group: "Geral",
  },
];

const SIMULATED_ONLINE_DELAY_MS = 5_000;
const SIMULATED_MESSAGE_DELAY_MS = SIMULATED_ONLINE_DELAY_MS + 5_000;
const SIMULATED_MESSAGE_ID = 4_001;
const ENABLE_LISTENING_ACTIVITY = true;
const SHARE_LISTENING_ACTIVITY_KEY = "msn-share-listening-activity";

function HomePage() {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeChat, setActiveChat] = useState<Contact | null>(null); // Armazena a conversa aberta interna (modo maximizado)
  const [contatos, setContatos] = useState<Contact[]>(INITIAL_CONTACTS);
  const [latestIncomingMessage, setLatestIncomingMessage] =
    useState<IncomingMessage | null>(null);
  const onlineAudioRef = useRef<HTMLAudioElement | null>(null);
  const messageAudioRef = useRef<HTMLAudioElement | null>(null);
  const previousContactStatusesRef = useRef(
    new Map(INITIAL_CONTACTS.map((contact) => [contact.id, contact.status])),
  );

  const [status, setStatus] =
    useState<keyof typeof STATUS_CONFIG>("ausente");
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [personalMessage, setPersonalMessage] = useState("");
  const [personalMessageDraft, setPersonalMessageDraft] = useState("");
  const [isEditingPersonalMessage, setIsEditingPersonalMessage] =
    useState(false);
  const [shareListeningActivity, setShareListeningActivity] = useState(
    () =>
      ENABLE_LISTENING_ACTIVITY &&
      localStorage.getItem(SHARE_LISTENING_ACTIVITY_KEY) === "true",
  );
  const [currentMedia, setCurrentMedia] = useState<MediaInfo | null>(null);

  const startEditingPersonalMessage = () => {
    setPersonalMessageDraft(personalMessage);
    setIsEditingPersonalMessage(true);
  };

  const savePersonalMessage = () => {
    setPersonalMessage(personalMessageDraft.trim());
    setIsEditingPersonalMessage(false);
  };

  useEffect(() => {
    if (!ENABLE_LISTENING_ACTIVITY) return;

    localStorage.setItem(
      SHARE_LISTENING_ACTIVITY_KEY,
      String(shareListeningActivity),
    );

    if (!shareListeningActivity) {
      setCurrentMedia(null);
      return;
    }

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
  }, [shareListeningActivity]);

  useEffect(() => {
    const previousHtmlBackground = document.documentElement.style.background;
    const previousBodyBackground = document.body.style.background;

    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    void appWindow.setDecorations(false);
    void appWindow.setShadow(false);

    // Verifica o estado inicial ao carregar a página
    appWindow.isMaximized().then(setIsMaximized);

    // Escuta mudanças de tamanho ou maximização em tempo real
    const unlisten = appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    });

    return () => {
      unlisten.then((f) => f());
      document.documentElement.style.background = previousHtmlBackground;
      document.body.style.background = previousBodyBackground;
    };
  }, [appWindow]);

  useEffect(() => {
    const audio = new Audio(onlineSound);
    audio.preload = "auto";
    audio.volume = 1;
    audio.load();
    onlineAudioRef.current = audio;

    return () => {
      audio.pause();
      onlineAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = new Audio(messageSound);
    audio.preload = "auto";
    audio.volume = 1;
    audio.load();
    messageAudioRef.current = audio;

    return () => {
      audio.pause();
      messageAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const previousStatuses = previousContactStatusesRef.current;
    const contactBecameOnline = contatos.find(
      (contact) =>
        contact.status === "online" &&
        previousStatuses.get(contact.id) === "offline",
    );

    previousContactStatusesRef.current = new Map(
      contatos.map((contact) => [contact.id, contact.status]),
    );

    if (!contactBecameOnline) return;

    const notification: MessengerNotificationData = {
      id: Date.now(),
      contactId: contactBecameOnline.id,
      contactName: contactBecameOnline.name,
      kind: "online",
      text: "acabou de entrar.",
    };

    void showStyledNotificationWindow(notification).catch((error) => {
      console.error("Erro ao exibir notificação de contato online:", error);
    });

    const audio = onlineAudioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch((error) => {
      console.error("Erro ao reproduzir notificação de contato online:", error);
    });
  }, [contatos]);

  useEffect(() => {
    const simulationTimer = window.setTimeout(() => {
      setContatos((currentContacts) =>
        currentContacts.map((contact) =>
          contact.id === 4
            ? {
                ...contact,
                status: "online",
                msg: "Acabou de entrar",
              }
            : contact,
        ),
      );
    }, SIMULATED_ONLINE_DELAY_MS);

    return () => window.clearTimeout(simulationTimer);
  }, []);

  useEffect(() => {
    const simulationTimer = window.setTimeout(() => {
      const incomingMessage: IncomingMessage = {
        id: SIMULATED_MESSAGE_ID,
        contactId: 4,
        sender: "Sasuke_Uchiha",
        text: "Oi! Você está aí?",
        receivedAt: Date.now(),
      };

      const storedMessage = {
        id: incomingMessage.id,
        author: "contact" as const,
        text: incomingMessage.text,
        receivedAt: incomingMessage.receivedAt,
      };

      const storedMessages = appendChatMessage(
        String(incomingMessage.contactId),
        storedMessage,
      );
      const persistedMessage =
        storedMessages.find((message) => message.id === incomingMessage.id) ??
        storedMessage;
      setLatestIncomingMessage(incomingMessage);
      const notification: MessengerNotificationData = {
        id: incomingMessage.id,
        contactId: incomingMessage.contactId,
        contactName: incomingMessage.sender,
        kind: "message",
        text: incomingMessage.text,
      };

      void showStyledNotificationWindow(notification).catch((error) => {
        console.error("Erro ao exibir notificação de mensagem:", error);
      });
      void emit("msn-message-received", {
        chatId: String(incomingMessage.contactId),
          message: persistedMessage,
      });
    }, SIMULATED_MESSAGE_DELAY_MS);

    return () => window.clearTimeout(simulationTimer);
  }, []);

  useEffect(() => {
    if (!latestIncomingMessage) return;

    const audio = messageAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      void audio.play().catch((error) => {
        console.error("Erro ao reproduzir notificação de mensagem:", error);
      });
    }

    const dismissTimer = window.setTimeout(() => {
      setLatestIncomingMessage((currentMessage) =>
        currentMessage?.id === latestIncomingMessage.id ? null : currentMessage,
      );
    }, 5_000);

    return () => window.clearTimeout(dismissTimer);
  }, [latestIncomingMessage]);

  // Lógica do duplo clique no contato
  const handleContactClick = (contato: Contact) => {
    if (isMaximized) {
      setActiveChat(contato);
    } else {
      const chatParams = new URLSearchParams({
        status: contato.status,
        name: contato.name,
        message: contato.msg,
      });

      // ⚠️ ALTERADO AQUI: Adicionado index.html antes do hash #
      const chatWindow = new WebviewWindow(`chat-${contato.id}`, {
        url: `index.html#/chat/${contato.id}?${chatParams.toString()}`,
        title: `Conversa com ${contato.name}`,
        width: 900,
        height: 640,
        resizable: true,
        decorations: false,
        transparent: true,
        shadow: false,
        backgroundColor: [0, 0, 0, 0],
        visible: false,
      });

      chatWindow.once("tauri://created", () => {
        console.log("Janela de chat aberta!");
      });
    }
  };

  // 1. Estado para controlar qual aba está ativa (Padrão: geral/online)
  const [activeTab, setActiveTab] = useState("geral");

  // 3. Configuração visual e lógica das abas
  const tabsConfig = [
    {
      id: "geral",
      label: "Online",
      icon: <MdOutlinePerson size={18} />,
    },
    { id: "grupos", label: "Grupos", icon: <MdOutlineGroups size={18} /> },
    {
      id: "offlines",
      label: "Offline",
      icon: <MdOutlinePersonOff size={18} />,
    },
  ];

  // 4. Função que filtra quais contatos aparecem baseando-se na aba ativa
  const getFiltrados = () => {
    if (activeTab === "geral")
      return contatos.filter((c) => c.status !== "offline");
    if (activeTab === "offlines")
      return contatos.filter((c) => c.status === "offline");
    return contatos; // Para grupos faremos uma lógica de agrupamento abaixo
  };

  const statusColors: Record<ContactStatus, string> = {
    online: "bg-green-500",
    ocupado: "bg-red-500",
    ausente: "bg-yellow-400",
    offline: "bg-zinc-300",
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-transparent font-sans antialiased [text-rendering:geometricPrecision]">
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

      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[14px] border border-[#6694ad] bg-gradient-to-b from-[#f8fcfe] via-[#edf7fb] to-[#d8edf6]">
        <header
          data-tauri-drag-region
          className="flex h-9 shrink-0 select-none items-center gap-2 rounded-t-[13px] border-b border-[#7fa9bf] bg-gradient-to-r from-[#8fcbe8] via-[#d4eefb] to-[#f4fbfe] pl-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        >
          <span className="flex items-end" aria-hidden="true">
            <span className="h-3.5 w-3.5 rounded-full bg-[#71bf45] ring-1 ring-white" />
            <span className="-ml-1 h-3 w-3 rounded-full bg-[#43a9d7] ring-1 ring-white" />
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
              onClick={() => void appWindow.minimize()}
              className="grid w-9 place-items-center text-[#426b81] transition-colors hover:bg-white/50"
            >
              <MdMinimize size={17} />
            </button>
            <button
              type="button"
              aria-label="Maximizar ou restaurar"
              onClick={() => void appWindow.toggleMaximize()}
              className="grid w-9 place-items-center text-[#426b81] transition-colors hover:bg-white/50"
            >
              <MdCropSquare size={13} />
            </button>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => void appWindow.close()}
              className="grid w-10 place-items-center rounded-tr-[13px] text-[#426b81] transition-colors hover:bg-[#d86161] hover:text-white"
            >
              <MdClose size={18} />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      {/* 1. SEÇÃO DO SEU PERFIL (MANTIDA NO TOPO) */}
      <aside className="flex flex-col gap-3 rounded-[12px] border border-[#8fb2c3] bg-gradient-to-br from-white/90 via-[#edf8fc]/90 to-[#cce7f2]/90 p-3 shadow-[0_3px_12px_rgba(38,79,103,0.16)]">
        <div className="flex flex-row gap-2 max-h-[140px]">
          <PictureFrame />
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div className="flex flex-col">
              <div className="flex flex-row items-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full border border-white shadow-sm ${STATUS_CONFIG[status].color}`}
                />

                <span
                  className="text-[20px] font-extrabold select-none"
                  style={getTextEffectStyle("frias")}
                >
                  Kon-sama ZS
                </span>

                <div
                  className="relative"
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
                                setStatus(
                                  statusValue as keyof typeof STATUS_CONFIG,
                                );
                                setIsStatusMenuOpen(false);
                              }}
                              className={`flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                                isSelected
                                  ? "border-white bg-white/80 font-semibold text-[#286c8d]"
                                  : "border-transparent text-[#52758a] hover:border-white hover:bg-white/65"
                              }`}
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

              {isEditingPersonalMessage ? (
                <input
                  autoFocus
                  type="text"
                  aria-label="Mensagem pessoal"
                  value={personalMessageDraft}
                  placeholder="Insira uma mensagem pessoal"
                  onChange={(event) =>
                    setPersonalMessageDraft(event.currentTarget.value)
                  }
                  onBlur={savePersonalMessage}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                  className="mt-0.5 h-6 w-full rounded-md border border-[#7faec4] bg-white/80 px-2 text-[13px] italic text-[#436b80] outline-none shadow-inner transition focus:border-[#4d9fc4] focus:ring-2 focus:ring-[#70b9d8]/25"
                />
              ) : (
                <button
                  type="button"
                  title="Clique para editar sua mensagem pessoal"
                  onClick={startEditingPersonalMessage}
                  className="mt-0.5 max-w-full truncate rounded px-1 py-0.5 text-left text-[13px] italic text-[#527b90] transition-colors hover:bg-white/55 hover:text-[#315f77] focus:outline-none focus:ring-2 focus:ring-[#65afd0]/35"
                >
                  {personalMessage || "<Insira uma mensagem pessoal>"}
                </button>
              )}

              {ENABLE_LISTENING_ACTIVITY && (
                <>
                  {shareListeningActivity && (
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
                        className="shrink-0 text-[16px] not-italic"
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

                  <label className="flex w-fit cursor-pointer select-none items-center gap-1.5 rounded px-1 py-0.5 text-[11px] text-[#527b90] transition-colors hover:bg-white/50 hover:text-[#315f77]">
                    <input
                      type="checkbox"
                      checked={shareListeningActivity}
                      onChange={(event) =>
                        setShareListeningActivity(event.currentTarget.checked)
                      }
                      className="h-3.5 w-3.5 accent-[#3295c2]"
                    />
                    Mostrar o que estou ouvindo
                  </label>
                </>
              )}
            </div>

            <div className="flex flex-row items-center gap-1 text-[#527b90]">
              {[<MdOutlinePersonAddAlt key="add" size={21} />, <ImMakeGroup key="group" size={15} />, <TbPhoneCall key="call" size={19} />, <AiOutlineVideoCamera key="video" size={19} />].map((icon) => (
                <button
                  key={icon.key}
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-md border border-transparent transition-colors hover:border-white hover:bg-white/70"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* CONTAINER FLEXBOX DIRECIONAL PARA SUPORTAR O CHAT LATERAL */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-row gap-3">
        {/* 2. COLUNA DE CONTATOS (SE ADAPTA AUTOMATICAMENTE) */}
        <section
          className={`${isMaximized && activeChat ? "w-[380px]" : "flex-1"} flex h-full flex-col gap-3 rounded-[12px] border border-[#8fb2c3] bg-white/70 p-3 shadow-[0_3px_12px_rgba(38,79,103,0.14)] transition-all duration-300`}
        >
          {/* Input de busca mantido no topo */}
          <Input inputName="Buscar contato" />

          {/* BARRA DE ABAS (TABS) */}
          <div className="border-b border-[#b9d3df]">
            <div className="relative mx-auto grid w-full max-w-[300px] grid-cols-3">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-1/3 transition-transform duration-300 ease-out"
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
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {activeTab !== "grupos"
              ? // RENDERIZAÇÃO PADRÃO (GERAL OU OFFLINES)
                getFiltrados().map((contato) => (
                  <div
                    key={contato.id}
                    onDoubleClick={() => handleContactClick(contato)} // 👈 GATILHO DE JANELA (ABAS GERAIS)
                    className="flex cursor-pointer select-none flex-row items-center gap-3 rounded-[8px] border border-transparent p-1.5 transition-all hover:border-[#8ebbd0] hover:bg-gradient-to-r hover:from-[#d9eff9] hover:to-[#f5fbfe] hover:shadow-[inset_0_1px_0_white,0_1px_3px_rgba(45,91,113,0.14)]"
                  >
                    {/* Mini Avatar Falso estilo MSN */}
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-md border border-[#9dbdcc] bg-gradient-to-b from-[#edf8fc] to-[#b9dce9] shadow-sm">
                      <span className="text-xs font-bold text-[#527b90]">
                        {contato.name[0]}
                      </span>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${statusColors[contato.status as keyof typeof statusColors]}`}
                      />
                    </div>
                    {/* Informações do Contato */}
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-sm font-medium ${contato.status === "offline" ? "text-[#91a5af]" : "text-[#31556a]"}`}
                      >
                        {contato.name}
                      </span>
                      {contato.msg && (
                        <span className="truncate text-xs italic text-[#7894a2]">
                          {contato.msg}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              : // RENDERIZAÇÃO POR GRUPOS
                ["Escola", "Trabalho", "Geral"].map((grupoName) => {
                  const contatosDoGrupo = contatos.filter(
                    (c) => c.group === grupoName,
                  );
                  return (
                    <div key={grupoName} className="mb-2">
                      <h4 className="mb-1 rounded-md border border-white/75 bg-gradient-to-r from-[#dceef6] to-white/60 px-2 py-1 text-xs font-semibold text-[#52758a]">
                        {grupoName} ({contatosDoGrupo.length})
                      </h4>
                      {contatosDoGrupo.map((contato) => (
                        <div
                          key={contato.id}
                          onDoubleClick={() => handleContactClick(contato)} // 👈 GATILHO DE JANELA (ABAS GRUPOS)
                          className="flex cursor-pointer select-none flex-row items-center gap-3 rounded-[8px] border border-transparent p-1.5 pl-4 transition-all hover:border-[#8ebbd0] hover:bg-gradient-to-r hover:from-[#d9eff9] hover:to-[#f5fbfe] hover:shadow-[inset_0_1px_0_white,0_1px_3px_rgba(45,91,113,0.14)]"
                        >
                          <div className="relative flex h-7 w-7 items-center justify-center rounded-md border border-[#9dbdcc] bg-gradient-to-b from-[#edf8fc] to-[#b9dce9]">
                            <span className="text-xs font-bold text-[#527b90]">
                              {contato.name[0]}
                            </span>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${statusColors[contato.status as keyof typeof statusColors]}`}
                            />
                          </div>
                          <span className="text-sm text-[#31556a]">
                            {contato.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
          </div>
        </section>

        {/* 3. COLUNA DIREITA: JANELA DE CONVERSA EMBUTIDA (SÓ EXIBE SE O APP ESTIVER MAXIMIZADO) */}
        {isMaximized && activeChat && (
          <section className="flex h-full flex-1 animate-fadeIn flex-col gap-3 rounded-[12px] border border-[#8fb2c3] bg-white/70 p-3 shadow-[0_3px_12px_rgba(38,79,103,0.14)] transition-all duration-300">
            <div className="flex items-center justify-between border-b border-[#b9d3df] pb-2">
              <div className="flex flex-col">
                <h3 className="text-base font-semibold text-[#31556a]">
                  {activeChat.name}
                </h3>
                <span className="text-xs italic text-[#7894a2]">
                  {activeChat.msg || "Sem sub-mensagem"}
                </span>
              </div>
              <button
                onClick={() => setActiveChat(null)}
                className="rounded-md border border-[#9dbdcc] bg-gradient-to-b from-white to-[#dceef6] px-2.5 py-1 text-xs font-medium text-[#52758a] transition-colors hover:border-[#70afd0] hover:text-[#286c8d]"
              >
                Fechar Conversa
              </button>
            </div>

            {/* Histórico das Mensagens */}
            <div className="my-1 min-h-0 flex-1 overflow-y-auto rounded-[9px] border border-[#9dbdcc] bg-gradient-to-b from-white/95 to-[#f3f9fc]/95 p-3 text-sm shadow-inner">
              {getChatMessages(String(activeChat.id)).length === 0 ? (
                <p className="mb-2 text-center text-xs italic text-[#7894a2]">
                  Início da conversa com {activeChat.name}
                </p>
              ) : (
                getChatMessages(String(activeChat.id)).map((chatMessage) => (
                  <div
                    key={chatMessage.id}
                    className={`mb-3 flex flex-col ${
                      chatMessage.author === "me" ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="mb-1 text-xs font-medium text-[#5f7f90]">
                      {chatMessage.author === "me" ? "Você" : activeChat.name}
                    </span>
                    <p className="max-w-[78%] rounded-[9px] border border-[#c4dbe5] bg-white px-3 py-2 text-[#375567] shadow-[0_1px_3px_rgba(42,83,104,0.1)]">
                      {chatMessage.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Input de Envio de Mensagem */}
            <input
              type="text"
              placeholder={`Enviar mensagem para ${activeChat.name}...`}
              className="rounded-[8px] border border-[#9dbdcc] bg-white/85 p-2 text-sm text-[#304f60] shadow-inner outline-none transition-colors placeholder:text-[#829aa6] focus:border-[#4d9fc4] focus:ring-2 focus:ring-[#70b9d8]/25"
            />
          </section>
        )}
      </div>

      {/* 4. SEÇÃO INFERIOR DE ANÚNCIOS (OCULTA NO MODO CHAT INTEGRADO SE NÃO COUBER) */}
      {(!isMaximized || !activeChat) && (
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
      )}
        </div>
      </div>
    </main>
  );
}

export default HomePage;
