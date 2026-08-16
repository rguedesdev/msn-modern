import { FaAmazon, FaLine, FaNapster, FaSpotify } from "react-icons/fa";
import { MdMusicNote } from "react-icons/md";
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

import Radio89Logo from "../../../assets/images/streamings/89-radio-rock.png";
import AlphaFmLogo from "../../../assets/images/streamings/alpha-fm-logo.svg";
import AsiaDreamRadioLogo from "../../../assets/images/streamings/asia-dream-radio.jpg";
import DeezerLogo from "../../../assets/images/streamings/deezer-logo.svg";
import KissFmLogo from "../../../assets/images/streamings/kiss-fm-logo.svg";
import RadioJHeroLogo from "../../../assets/images/streamings/radio-jhero.png";

export function MediaSourceIcon({ source }: { source: string }) {
  const normalizedSource = source.toLowerCase();

  if (normalizedSource.includes("spotify")) {
    return <FaSpotify aria-label="Spotify" className="text-[#1db954]" />;
  }

  if (normalizedSource.includes("amazon")) {
    return <FaAmazon aria-label="Amazon Music" className="text-[#00a8e1]" />;
  }

  if (normalizedSource.includes("deezer")) {
    return <img src={DeezerLogo} alt="Deezer" className="h-[16px] w-[16px] object-contain" />;
  }

  if (normalizedSource.includes("kiss fm")) {
    return <img src={KissFmLogo} alt="Kiss FM" className="h-[18px] w-[18px] object-contain" />;
  }

  if (normalizedSource.includes("alpha fm")) {
    return <img src={AlphaFmLogo} alt="Alpha FM" className="h-[18px] w-[18px] object-contain" />;
  }

  if (normalizedSource.includes("asia dream radio")) {
    return <img src={AsiaDreamRadioLogo} alt="Asia DREAM Radio" className="h-[18px] w-[18px] rounded-sm object-contain" />;
  }

  if (normalizedSource.includes("rádio j-hero")) {
    return <img src={RadioJHeroLogo} alt="Rádio J-Hero" className="h-[18px] w-[18px] rounded-sm object-contain" />;
  }

  if (normalizedSource.includes("89 a rádio rock")) {
    return (
      <span className="block h-[18px] w-[18px] overflow-hidden bg-black">
        <img src={Radio89Logo} alt="89 A Rádio Rock" className="h-full w-auto max-w-none object-contain object-left" />
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

  if (["qobuz", "anghami", "jiosaavn", "boomplay"].some((service) => normalizedSource.includes(service))) {
    return <MdMusicNote aria-label={source} />;
  }

  return <RiDiscFill aria-label={source || "Player de música"} className="text-black" />;
}
