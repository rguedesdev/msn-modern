import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  type FormEvent,
} from "react";
import { useParams } from "react-router-dom";
import { useSearchParams } from "react-router-dom";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import type { Socket } from "socket.io-client";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { UserAttentionType } from "@tauri-apps/api/window";

// Componentes
import { PictureFrame } from "../../shared/constants/PictureFrame/page";
import { MediaSourceIcon } from "../../shared/components/MediaSourceIcon";
import {
  CONTACT_STATUS_FRAMES,
  toContactStatus,
} from "../../shared/constants/ContactStatusFrame/page";
import { getTextEffectStyle } from "../../shared/constants/TextEffects/page";
import {
  isNameEffect,
  isProfileFrame,
} from "../../shared/constants/ProfileStyle/page";
import {
  appendChatMessage,
  getChatMessages,
  saveChatMessages,
  type ChatMessage,
} from "../../shared/utils/chatStorage";
import {
  decodeChatPayload,
  encodeImagePayload,
  type ChatImagePayload,
} from "../../shared/utils/chatPayload";
import { useAuth } from "../../shared/auth/AuthContext";
import { resolveApiAssetUrl } from "../../shared/api/client";
import {
  getConversation,
  inviteConversationParticipant,
  listConversations,
  updateGroupName,
  uploadGroupAvatar,
  type ApiConversation,
  type ApiConversationParticipant,
} from "../../shared/api/conversations";
import { decryptEnvelope, encryptForDevice, listPublicKeys, registerCurrentDevice } from "../../shared/api/e2ee";
import {
  listEncryptedMessages,
  markMessagesStatus,
  sendEncryptedMessage,
  type ApiEncryptedMessage,
  type MessageStatusUpdate,
} from "../../shared/api/messages";
import {
  connectRealtime,
  setConversationTyping,
  type TypingNotification,
} from "../../shared/api/realtime";
import {
  TYPING_CHANGED_EVENT,
} from "../../shared/constants/TypingEvents";
import { MESSAGE_STATUS_CHANGED_EVENT } from "../../shared/constants/MessageEvents";
import { chatMessageSchema } from "../../shared/validation/forms";

// Icons
import {
  MdClose,
  MdCropSquare,
  MdDone,
  MdDoneAll,
  MdEdit,
  MdKeyboardArrowDown,
  MdMinimize,
  MdPhotoCamera,
  MdOutlineVideoChat,
  MdPersonAddAlt,
  MdVoiceChat,
} from "react-icons/md";
import { FaMicrophoneAlt, FaHeadphonesAlt } from "react-icons/fa";
import { FcAddImage } from "react-icons/fc";

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
import OnionHeadBoredomIcon from "../../assets/images/emoticons/onion-head/boredomplz.gif";
import OnionHeadNosePickingIcon from "../../assets/images/emoticons/onion-head/nosepickingplz.gif";
import OnionHeadCanLoveIcon from "../../assets/images/emoticons/onion-head/canloveplz.gif";
import OnionHeadChocoLoveIcon from "../../assets/images/emoticons/onion-head/chocoloveplz.gif";
import OnionHeadFeelingFullIcon from "../../assets/images/emoticons/onion-head/feelingfullplz.gif";
import OnionHeadNomNomIcon from "../../assets/images/emoticons/onion-head/onionnomnomplz.gif";
import OnionHeadNomIcon from "../../assets/images/emoticons/onion-head/onionnomplz.gif";
import OnionHeadTeaTimeIcon from "../../assets/images/emoticons/onion-head/teatimeplz.gif";
import OnionHeadByeIcon from "../../assets/images/emoticons/onion-head/baibaiplz.gif";
import OnionHeadHiIcon from "../../assets/images/emoticons/onion-head/sayhiplz.gif";
import OnionHeadHappyIcon from "../../assets/images/emoticons/onion-head/aboishappyplz.gif";
import OnionHeadAwwwIcon from "../../assets/images/emoticons/onion-head/awwwplz.gif";
import OnionHeadDandyIcon from "../../assets/images/emoticons/onion-head/dandyonionplz.gif";
import OnionHeadDignityLaughIcon from "../../assets/images/emoticons/onion-head/dignitylaughplz.gif";
import OnionHeadExcitedBlushIcon from "../../assets/images/emoticons/onion-head/excitedblushplz.gif";
import OnionHeadFinallyIcon from "../../assets/images/emoticons/onion-head/finallyplz.gif";
import OnionHeadGreatJobIcon from "../../assets/images/emoticons/onion-head/greatjobplz.gif";
import OnionHeadHappyTearsIcon from "../../assets/images/emoticons/onion-head/happytearsplz.gif";
import OnionHeadHeavenlyIcon from "../../assets/images/emoticons/onion-head/heavenlyplz.gif";
import OnionHeadHeeHeeIcon from "../../assets/images/emoticons/onion-head/heehee-plz.gif";
import OnionHeadLaughing2Icon from "../../assets/images/emoticons/onion-head/laughing2plz.gif";
import OnionHeadLaughingIcon from "../../assets/images/emoticons/onion-head/laughingplz.gif";
import OnionHeadBegIcon from "../../assets/images/emoticons/onion-head/onibeg.gif";
import OnionHeadFlowerCheerIcon from "../../assets/images/emoticons/onion-head/onicheer.gif";
import OnionHeadGaspIcon from "../../assets/images/emoticons/onion-head/onigaspplz.gif";
import OnionHeadGirlBegIcon from "../../assets/images/emoticons/onion-head/onigirlbeg.gif";
import OnionHeadAngelIcon from "../../assets/images/emoticons/onion-head/onionangelplz.gif";
import OnionHeadAustriaIcon from "../../assets/images/emoticons/onion-head/onionaustriaplz.gif";
import OnionHeadCheer2Icon from "../../assets/images/emoticons/onion-head/onioncheer2plz.gif";
import OnionHeadCheerIcon from "../../assets/images/emoticons/onion-head/onioncheerplz.gif";
import OnionHeadCleanIcon from "../../assets/images/emoticons/onion-head/onioncleanplz.gif";
import OnionHeadHarpIcon from "../../assets/images/emoticons/onion-head/onionharpplz.gif";
import OnionHeadOnionIcon from "../../assets/images/emoticons/onion-head/oniononionplz.gif";
import OnionHeadX3Icon from "../../assets/images/emoticons/onion-head/onionx3plz.gif";
import OnionHeadRanranruuIcon from "../../assets/images/emoticons/onion-head/ranranruuplz.gif";
import OnionHeadRelievedIcon from "../../assets/images/emoticons/onion-head/relievedplz.gif";
import OnionHeadVictoryIcon from "../../assets/images/emoticons/onion-head/yesvictoryplz.gif";
import OnionHeadChristmas1Icon from "../../assets/images/emoticons/onion-head/onimerrychristmas1.gif";
import OnionHeadChristmas2Icon from "../../assets/images/emoticons/onion-head/onimerrychristmas2.gif";
import OnionHeadChristmas3Icon from "../../assets/images/emoticons/onion-head/onimerrychristmas3.gif";
import OnionHeadChristmas4Icon from "../../assets/images/emoticons/onion-head/onimerrychristmas4.gif";
import OnionHeadColdIcon from "../../assets/images/emoticons/onion-head/itscoldplz.gif";
import OnionHeadFreezingIcon from "../../assets/images/emoticons/onion-head/itsfreezingplz.gif";
import OnionHeadSweatIcon from "../../assets/images/emoticons/onion-head/onisweatplz.gif";
import OnionHeadBloodDeathIcon from "../../assets/images/emoticons/onion-head/blooddeathplz.gif";
import OnionHeadDizzyIcon from "../../assets/images/emoticons/onion-head/dizzyplz.gif";
import OnionHeadDotDotDotIcon from "../../assets/images/emoticons/onion-head/dotdotdotzplz.gif";
import OnionHeadGivingUpIcon from "../../assets/images/emoticons/onion-head/givingupplz.gif";
import OnionHeadHomelessIcon from "../../assets/images/emoticons/onion-head/homelessonionplz.gif";
import OnionHeadImDeadIcon from "../../assets/images/emoticons/onion-head/imdeadplz.gif";
import OnionHeadInjuredIcon from "../../assets/images/emoticons/onion-head/injuredplz.gif";
import OnionHeadHotIcon from "../../assets/images/emoticons/onion-head/itshotplz.gif";
import OnionHeadLaunchedIcon from "../../assets/images/emoticons/onion-head/launchedplz.jpg";
import OnionHeadAccidentIcon from "../../assets/images/emoticons/onion-head/onionaccidentplz.gif";
import OnionHeadFailIcon from "../../assets/images/emoticons/onion-head/onionfailplz.gif";
import OnionHeadXdIcon from "../../assets/images/emoticons/onion-head/onionxdplz.gif";
import OnionHeadSoakedIcon from "../../assets/images/emoticons/onion-head/onisoaked.gif";
import OnionHeadStressIcon from "../../assets/images/emoticons/onion-head/onistressplz.gif";
import OnionHeadScaredToDeathIcon from "../../assets/images/emoticons/onion-head/scaredtodeathplz.gif";
import OnionHeadSickIcon from "../../assets/images/emoticons/onion-head/sickplz.gif";
import OnionHeadTooLoudIcon from "../../assets/images/emoticons/onion-head/tooloudplz.gif";
import OnionHeadVomitIcon from "../../assets/images/emoticons/onion-head/vomitplz.gif";
import OnionHeadAdorableIcon from "../../assets/images/emoticons/onion-head/adorableplz.gif";
import OnionHeadArigatouIcon from "../../assets/images/emoticons/onion-head/arigatouplz.gif";
import OnionHeadBlshIcon from "../../assets/images/emoticons/onion-head/blshplz.gif";
import OnionHeadBlushIcon from "../../assets/images/emoticons/onion-head/blushplz.gif";
import OnionHeadCBlushIcon from "../../assets/images/emoticons/onion-head/cblushplz.gif";
import OnionHeadDingDingDingIcon from "../../assets/images/emoticons/onion-head/dingdingdingplz.gif";
import OnionHeadEmbarrassedIcon from "../../assets/images/emoticons/onion-head/embarrasedplz.gif";
import OnionHeadHappyHappyIcon from "../../assets/images/emoticons/onion-head/happyhappyplz.gif";
import OnionHeadInLoveIcon from "../../assets/images/emoticons/onion-head/inloveplz.gif";
import OnionHeadLoveLoveIcon from "../../assets/images/emoticons/onion-head/loveloveplz.gif";
import OnionHeadLvLvIcon from "../../assets/images/emoticons/onion-head/lvlvplz.gif";
import OnionHeadNoseBleedingIcon from "../../assets/images/emoticons/onion-head/nosebleedingplz.gif";
import OnionHeadBunnyIcon from "../../assets/images/emoticons/onion-head/onionbunnyplz.gif";
import OnionHeadShiningEyesIcon from "../../assets/images/emoticons/onion-head/shining-eyesplz.gif";
import OnionHeadSoBeautifulIcon from "../../assets/images/emoticons/onion-head/sobeautifulplz.gif";
import OnionHeadUhuIcon from "../../assets/images/emoticons/onion-head/uhuplz.gif";
import OnionHeadAwwTearsIcon from "../../assets/images/emoticons/onion-head/awwtearsplz.png";
import OnionHeadBadBowIcon from "../../assets/images/emoticons/onion-head/badbowplz.gif";
import OnionHeadBeggingIcon from "../../assets/images/emoticons/onion-head/begplz.gif";
import OnionHeadDustingIcon from "../../assets/images/emoticons/onion-head/dustingplz.gif";
import OnionHeadGameAddictIcon from "../../assets/images/emoticons/onion-head/gameaddictplz.gif";
import OnionHeadHauntYouIcon from "../../assets/images/emoticons/onion-head/onihauntyou.gif";
import OnionHeadDesuIcon from "../../assets/images/emoticons/onion-head/oniondesuplz.gif";
import OnionHeadPinnochioIcon from "../../assets/images/emoticons/onion-head/onionpinnochioplz.gif";
import OnionHeadShowerIcon from "../../assets/images/emoticons/onion-head/onishowerplz.gif";
import OnionHeadRedPassIcon from "../../assets/images/emoticons/onion-head/redpassplz.gif";
import OnionHeadRobotFaceIcon from "../../assets/images/emoticons/onion-head/robotfaceplz.gif";
import OnionHeadYellowCardIcon from "../../assets/images/emoticons/onion-head/yellowcardplz2.gif";
import OnionHeadDrumIcon from "../../assets/images/emoticons/onion-head/oniondrum.gif";
import OnionHeadRockingIcon from "../../assets/images/emoticons/onion-head/rockingonionplz.gif";
import OnionHeadWhistleIcon from "../../assets/images/emoticons/onion-head/whistleplz.gif";
import OnionHeadAllAloneIcon from "../../assets/images/emoticons/onion-head/allaloneplz.gif";
import OnionHeadAloneIcon from "../../assets/images/emoticons/onion-head/aloneplz.gif";
import OnionHeadComeBackIcon from "../../assets/images/emoticons/onion-head/comebackplz.gif";
import OnionHeadCryCryIcon from "../../assets/images/emoticons/onion-head/crycryplz.gif";
import OnionHeadDepressedIcon from "../../assets/images/emoticons/onion-head/depressedonionplz.gif";
import OnionHeadMiseryIcon from "../../assets/images/emoticons/onion-head/miseryplz.gif";
import OnionHeadTantrumIcon from "../../assets/images/emoticons/onion-head/oniontantrumplz.gif";
import OnionHeadTortureIcon from "../../assets/images/emoticons/onion-head/oniontortureplz.gif";
import OnionHeadWoeIcon from "../../assets/images/emoticons/onion-head/onionwoeplz.gif";
import OnionHeadOrzIcon from "../../assets/images/emoticons/onion-head/orzplz.gif";
import OnionHeadRunCryIcon from "../../assets/images/emoticons/onion-head/runcryplz.gif";
import OnionHeadSadnessIcon from "../../assets/images/emoticons/onion-head/sadnessplz.gif";
import OnionHeadScaredIcon from "../../assets/images/emoticons/onion-head/scaredplz.gif";
import OnionHeadSighingIcon from "../../assets/images/emoticons/onion-head/sighingplz.gif";
import OnionHeadSobSobSobIcon from "../../assets/images/emoticons/onion-head/sobsobsobplz.gif";
import OnionHeadSweatdropIcon from "../../assets/images/emoticons/onion-head/sweatdropplz.gif";
import OnionHeadLazyIcon from "../../assets/images/emoticons/onion-head/lazyonion.gif";
import OnionHeadLullabyIcon from "../../assets/images/emoticons/onion-head/onionlullabyplz.gif";
import OnionHeadTiredIcon from "../../assets/images/emoticons/onion-head/onitiredplz.gif";
import OnionHeadSaunaRelaxIcon from "../../assets/images/emoticons/onion-head/saunarelaxplz.gif";
import OnionHeadWarmAndComfyIcon from "../../assets/images/emoticons/onion-head/warmandcomfyplz.gif";
import OnionHeadComeOverHereIcon from "../../assets/images/emoticons/onion-head/comeoverhereplz.gif";
import OnionHeadCreepyIcon from "../../assets/images/emoticons/onion-head/creepyonionplz.gif";
import OnionHeadGuaahIcon from "../../assets/images/emoticons/onion-head/guaahplz.gif";
import OnionHeadHypnoIcon from "../../assets/images/emoticons/onion-head/onihypnoplz.gif";
import OnionHeadPlanningIcon from "../../assets/images/emoticons/onion-head/planningplz.gif";
import OnionHeadGraduatingIcon from "../../assets/images/emoticons/onion-head/graduatingplz.gif";
import OnionHeadISeeIcon from "../../assets/images/emoticons/onion-head/iseeplz.gif";
import OnionHeadBusIcon from "../../assets/images/emoticons/onion-head/onionbusplz.gif";
import OnionHeadRightYouAreIcon from "../../assets/images/emoticons/onion-head/rightyouareplz.gif";
import OnionHeadSchoolIcon from "../../assets/images/emoticons/onion-head/schoolplz.gif";
import OnionHeadSmartyIcon from "../../assets/images/emoticons/onion-head/smartyplz.gif";
import OnionHeadStudyTimeIcon from "../../assets/images/emoticons/onion-head/studytimeplz.gif";
import OnionHeadThatsRightIcon from "../../assets/images/emoticons/onion-head/thatsrightplz.gif";
import OnionHeadAwkwardIcon from "../../assets/images/emoticons/onion-head/awkwardplz.gif";
import OnionHeadCuriosityIcon from "../../assets/images/emoticons/onion-head/curiosityplz.gif";
import OnionHeadDontUnderstandIcon from "../../assets/images/emoticons/onion-head/dontunderstandplz.gif";
import OnionHeadNyoronIcon from "../../assets/images/emoticons/onion-head/nyorononionplz.gif";
import OnionHeadOmgNoesIcon from "../../assets/images/emoticons/onion-head/omgnoesplz.gif";
import OnionHeadOmgWtfBbqIcon from "../../assets/images/emoticons/onion-head/omgwtfbbqplz.gif";
import OnionHeadFacepalmIcon from "../../assets/images/emoticons/onion-head/onionfacepalmplz.gif";
import OnionHeadOmfgIcon from "../../assets/images/emoticons/onion-head/onionomfgplz.gif";
import OnionHeadPanicIcon from "../../assets/images/emoticons/onion-head/onionpanicplz.gif";
import OnionHeadSpitTake1Icon from "../../assets/images/emoticons/onion-head/onionspittake1plz.gif";
import OnionHeadSpitTake2Icon from "../../assets/images/emoticons/onion-head/onionspittake2plz.gif";
import OnionHeadPetrifiedIcon from "../../assets/images/emoticons/onion-head/petrifiedplz.gif";
import OnionHeadRejectedIcon from "../../assets/images/emoticons/onion-head/rejectedplz.gif";
import OnionHeadShockIcon from "../../assets/images/emoticons/onion-head/shockplz.gif";
import OnionHeadChaseIcon from "../../assets/images/emoticons/onion-head/chase-plz.gif";
import OnionHeadDestroyIcon from "../../assets/images/emoticons/onion-head/destroyplz.gif";
import OnionHeadHeadacheIcon from "../../assets/images/emoticons/onion-head/headacheplz.gif";
import OnionHeadImmaKillYouIcon from "../../assets/images/emoticons/onion-head/immakillyouplz.gif";
import OnionHeadInsultedIcon from "../../assets/images/emoticons/onion-head/insultedplz.gif";
import OnionHeadKyleIcon from "../../assets/images/emoticons/onion-head/kyleoniplz.gif";
import OnionHeadNotListeningIcon from "../../assets/images/emoticons/onion-head/notlisteningplz.gif";
import OnionHeadNoIcon from "../../assets/images/emoticons/onion-head/onionnouplz.gif";
import OnionHeadPunchIcon from "../../assets/images/emoticons/onion-head/punch1plz.gif";
import OnionHeadRocketPunchIcon from "../../assets/images/emoticons/onion-head/rocketpunchplz.gif";
import OnionHeadRunIcon from "../../assets/images/emoticons/onion-head/runrunrunplz.gif";
import OnionHeadSaiyanIcon from "../../assets/images/emoticons/onion-head/saiyanplz.gif";
import OnionHeadVoodooIcon from "../../assets/images/emoticons/onion-head/voodooplz.gif";
import OnionHeadWatchItIcon from "../../assets/images/emoticons/onion-head/watchitplz.gif";
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
    code: "(onionboredom)",
    src: OnionHeadBoredomIcon,
    alt: "Onion Head entediado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionnosepicking)",
    src: OnionHeadNosePickingIcon,
    alt: "Onion Head cutucando o nariz",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioncanlove)",
    src: OnionHeadCanLoveIcon,
    alt: "Onion Head apaixonado por refrigerante",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionchocolove)",
    src: OnionHeadChocoLoveIcon,
    alt: "Onion Head apaixonado por chocolate",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionfull)",
    src: OnionHeadFeelingFullIcon,
    alt: "Onion Head satisfeito",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionnomnom)",
    src: OnionHeadNomNomIcon,
    alt: "Onion Head comendo peixe",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionnom)",
    src: OnionHeadNomIcon,
    alt: "Onion Head com fome",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionteatime)",
    src: OnionHeadTeaTimeIcon,
    alt: "Onion Head tomando chá",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionbye)",
    src: OnionHeadByeIcon,
    alt: "Onion Head dizendo tchau",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionhi)",
    src: OnionHeadHiIcon,
    alt: "Onion Head dizendo oi",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionhappy)",
    src: OnionHeadHappyIcon,
    alt: "Onion Head feliz",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionawww)",
    src: OnionHeadAwwwIcon,
    alt: "Onion Head emocionado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniondandy)",
    src: OnionHeadDandyIcon,
    alt: "Onion Head elegante",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniondignitylaugh)",
    src: OnionHeadDignityLaughIcon,
    alt: "Onion Head rindo com dignidade",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionexcitedblush)",
    src: OnionHeadExcitedBlushIcon,
    alt: "Onion Head animado e corado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionfinally)",
    src: OnionHeadFinallyIcon,
    alt: "Onion Head dizendo finalmente",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniongreatjob)",
    src: OnionHeadGreatJobIcon,
    alt: "Onion Head parabenizando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionhappytears)",
    src: OnionHeadHappyTearsIcon,
    alt: "Onion Head chorando de alegria",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionheavenly)",
    src: OnionHeadHeavenlyIcon,
    alt: "Onion Head nas nuvens",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionheehee)",
    src: OnionHeadHeeHeeIcon,
    alt: "Onion Head sorrindo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionlaughing2)",
    src: OnionHeadLaughing2Icon,
    alt: "Onion Head dando risada",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionlaughing)",
    src: OnionHeadLaughingIcon,
    alt: "Onion Head rindo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionbeg)",
    src: OnionHeadBegIcon,
    alt: "Onion Head implorando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionflowercheer)",
    src: OnionHeadFlowerCheerIcon,
    alt: "Onion Head comemorando com uma flor",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniongasp)",
    src: OnionHeadGaspIcon,
    alt: "Onion Head admirado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniongirlbeg)",
    src: OnionHeadGirlBegIcon,
    alt: "Onion Head garota implorando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionangel)",
    src: OnionHeadAngelIcon,
    alt: "Onion Head anjo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionaustria)",
    src: OnionHeadAustriaIcon,
    alt: "Onion Head austríaco",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioncheer2)",
    src: OnionHeadCheer2Icon,
    alt: "Onion Head comemorando para a esquerda",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioncheer)",
    src: OnionHeadCheerIcon,
    alt: "Onion Head comemorando para a direita",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionclean)",
    src: OnionHeadCleanIcon,
    alt: "Onion Head limpando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionharp)",
    src: OnionHeadHarpIcon,
    alt: "Onion Head tocando harpa",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniononion)",
    src: OnionHeadOnionIcon,
    alt: "Onion Head segurando cebolinhas",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionx3)",
    src: OnionHeadX3Icon,
    alt: "Onion Head fazendo careta feliz",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionranranruu)",
    src: OnionHeadRanranruuIcon,
    alt: "Onion Head dançando ran ran ruu",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionrelieved)",
    src: OnionHeadRelievedIcon,
    alt: "Onion Head aliviado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionvictory)",
    src: OnionHeadVictoryIcon,
    alt: "Onion Head celebrando a vitória",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionchristmas1)",
    src: OnionHeadChristmas1Icon,
    alt: "Onion Head feliz Natal 1",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionchristmas2)",
    src: OnionHeadChristmas2Icon,
    alt: "Onion Head feliz Natal 2",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionchristmas3)",
    src: OnionHeadChristmas3Icon,
    alt: "Onion Head feliz Natal 3",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionchristmas4)",
    src: OnionHeadChristmas4Icon,
    alt: "Onion Head feliz Natal 4",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioncold)",
    src: OnionHeadColdIcon,
    alt: "Onion Head com frio",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionfreezing)",
    src: OnionHeadFreezingIcon,
    alt: "Onion Head congelando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsweat)",
    src: OnionHeadSweatIcon,
    alt: "Onion Head suando de calor",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionblooddeath)",
    src: OnionHeadBloodDeathIcon,
    alt: "Onion Head morto e ensanguentado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniondizzy)",
    src: OnionHeadDizzyIcon,
    alt: "Onion Head tonto",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniondotdotdot)",
    src: OnionHeadDotDotDotIcon,
    alt: "Onion Head sem palavras",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniongivingup)",
    src: OnionHeadGivingUpIcon,
    alt: "Onion Head desistindo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionhomeless)",
    src: OnionHeadHomelessIcon,
    alt: "Onion Head desabrigado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionimdead)",
    src: OnionHeadImDeadIcon,
    alt: "Onion Head dizendo que morreu",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioninjured)",
    src: OnionHeadInjuredIcon,
    alt: "Onion Head machucado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionhot)",
    src: OnionHeadHotIcon,
    alt: "Onion Head com calor",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionlaunched)",
    src: OnionHeadLaunchedIcon,
    alt: "Onion Head sendo lançado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionaccident)",
    src: OnionHeadAccidentIcon,
    alt: "Onion Head acidentado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionfail)",
    src: OnionHeadFailIcon,
    alt: "Onion Head fracassando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionxd)",
    src: OnionHeadXdIcon,
    alt: "Onion Head rindo XD",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsoaked)",
    src: OnionHeadSoakedIcon,
    alt: "Onion Head encharcado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionstress)",
    src: OnionHeadStressIcon,
    alt: "Onion Head estressado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionscaredtodeath)",
    src: OnionHeadScaredToDeathIcon,
    alt: "Onion Head morrendo de medo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsick)",
    src: OnionHeadSickIcon,
    alt: "Onion Head doente",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniontooloud)",
    src: OnionHeadTooLoudIcon,
    alt: "Onion Head incomodado com barulho",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionvomit)",
    src: OnionHeadVomitIcon,
    alt: "Onion Head vomitando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionadorable)",
    src: OnionHeadAdorableIcon,
    alt: "Onion Head achando adorável",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionarigatou)",
    src: OnionHeadArigatouIcon,
    alt: "Onion Head agradecendo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionblsh)",
    src: OnionHeadBlshIcon,
    alt: "Onion Head envergonhado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionblush)",
    src: OnionHeadBlushIcon,
    alt: "Onion Head corando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioncblush)",
    src: OnionHeadCBlushIcon,
    alt: "Onion Head corando timidamente",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniondingdingding)",
    src: OnionHeadDingDingDingIcon,
    alt: "Onion Head tocando sino",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionembarrassed)",
    src: OnionHeadEmbarrassedIcon,
    alt: "Onion Head constrangido",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionhappyhappy)",
    src: OnionHeadHappyHappyIcon,
    alt: "Onion Head muito feliz",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioninlove)",
    src: OnionHeadInLoveIcon,
    alt: "Onion Head apaixonado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionlovelove)",
    src: OnionHeadLoveLoveIcon,
    alt: "Onion Head cheio de amor",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionlvlv)",
    src: OnionHeadLvLvIcon,
    alt: "Onion Head com olhos de coração",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionnosebleeding)",
    src: OnionHeadNoseBleedingIcon,
    alt: "Onion Head com sangramento nasal",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionbunny)",
    src: OnionHeadBunnyIcon,
    alt: "Onion Head coelhinho apaixonado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionshiningeyes)",
    src: OnionHeadShiningEyesIcon,
    alt: "Onion Head com olhos brilhantes",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsobeautiful)",
    src: OnionHeadSoBeautifulIcon,
    alt: "Onion Head admirando tanta beleza",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionuhu)",
    src: OnionHeadUhuIcon,
    alt: "Onion Head feliz e tímido",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionawwtears)",
    src: OnionHeadAwwTearsIcon,
    alt: "Onion Head chorando de emoção",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionbadbow)",
    src: OnionHeadBadBowIcon,
    alt: "Onion Head fazendo reverência",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionbegging)",
    src: OnionHeadBeggingIcon,
    alt: "Onion Head implorando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniondusting)",
    src: OnionHeadDustingIcon,
    alt: "Onion Head limpando a casa",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniongameaddict)",
    src: OnionHeadGameAddictIcon,
    alt: "Onion Head viciado em jogos",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionhauntyou)",
    src: OnionHeadHauntYouIcon,
    alt: "Onion Head assombrando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniondesu)",
    src: OnionHeadDesuIcon,
    alt: "Onion Head desu",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionpinnochio)",
    src: OnionHeadPinnochioIcon,
    alt: "Onion Head Pinóquio",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionshower)",
    src: OnionHeadShowerIcon,
    alt: "Onion Head tomando banho",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionredpass)",
    src: OnionHeadRedPassIcon,
    alt: "Onion Head mostrando cartão vermelho",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionrobotface)",
    src: OnionHeadRobotFaceIcon,
    alt: "Onion Head com rosto de robô",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionyellowcard)",
    src: OnionHeadYellowCardIcon,
    alt: "Onion Head mostrando cartão amarelo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniondrum)",
    src: OnionHeadDrumIcon,
    alt: "Onion Head tocando tambor",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionrocking)",
    src: OnionHeadRockingIcon,
    alt: "Onion Head tocando rock",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionwhistle)",
    src: OnionHeadWhistleIcon,
    alt: "Onion Head assobiando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionallalone)",
    src: OnionHeadAllAloneIcon,
    alt: "Onion Head completamente sozinho",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionalone)",
    src: OnionHeadAloneIcon,
    alt: "Onion Head sozinho",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioncomeback)",
    src: OnionHeadComeBackIcon,
    alt: "Onion Head pedindo para voltar",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioncrycry)",
    src: OnionHeadCryCryIcon,
    alt: "Onion Head chorando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniondepressed)",
    src: OnionHeadDepressedIcon,
    alt: "Onion Head deprimido",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionmisery)",
    src: OnionHeadMiseryIcon,
    alt: "Onion Head na miséria",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniontantrum)",
    src: OnionHeadTantrumIcon,
    alt: "Onion Head fazendo birra",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniontorture)",
    src: OnionHeadTortureIcon,
    alt: "Onion Head sofrendo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionwoe)",
    src: OnionHeadWoeIcon,
    alt: "Onion Head lamentando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionorz)",
    src: OnionHeadOrzIcon,
    alt: "Onion Head desolado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionruncry)",
    src: OnionHeadRunCryIcon,
    alt: "Onion Head correndo e chorando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsadness)",
    src: OnionHeadSadnessIcon,
    alt: "Onion Head triste",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionscared)",
    src: OnionHeadScaredIcon,
    alt: "Onion Head assustado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsighing)",
    src: OnionHeadSighingIcon,
    alt: "Onion Head suspirando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsobsobsob)",
    src: OnionHeadSobSobSobIcon,
    alt: "Onion Head soluçando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsweatdrop)",
    src: OnionHeadSweatdropIcon,
    alt: "Onion Head abatido",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionlazy)",
    src: OnionHeadLazyIcon,
    alt: "Onion Head com preguiça",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionlullaby)",
    src: OnionHeadLullabyIcon,
    alt: "Onion Head dormindo com canção de ninar",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniontired)",
    src: OnionHeadTiredIcon,
    alt: "Onion Head cansado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsaunarelax)",
    src: OnionHeadSaunaRelaxIcon,
    alt: "Onion Head relaxando na sauna",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionwarmandcomfy)",
    src: OnionHeadWarmAndComfyIcon,
    alt: "Onion Head aquecido e confortável",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioncomeoverhere)",
    src: OnionHeadComeOverHereIcon,
    alt: "Onion Head chamando para perto",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioncreepy)",
    src: OnionHeadCreepyIcon,
    alt: "Onion Head com sorriso sinistro",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionguaah)",
    src: OnionHeadGuaahIcon,
    alt: "Onion Head intimidador",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionhypno)",
    src: OnionHeadHypnoIcon,
    alt: "Onion Head hipnotizando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionplanning)",
    src: OnionHeadPlanningIcon,
    alt: "Onion Head planejando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniongraduating)",
    src: OnionHeadGraduatingIcon,
    alt: "Onion Head se formando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionisee)",
    src: OnionHeadISeeIcon,
    alt: "Onion Head entendendo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionbus)",
    src: OnionHeadBusIcon,
    alt: "Onion Head no ônibus escolar",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionrightyouare)",
    src: OnionHeadRightYouAreIcon,
    alt: "Onion Head concordando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionschool)",
    src: OnionHeadSchoolIcon,
    alt: "Onion Head na escola",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsmarty)",
    src: OnionHeadSmartyIcon,
    alt: "Onion Head inteligente",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionstudytime)",
    src: OnionHeadStudyTimeIcon,
    alt: "Onion Head estudando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionthatsright)",
    src: OnionHeadThatsRightIcon,
    alt: "Onion Head dizendo que está certo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionawkward)",
    src: OnionHeadAwkwardIcon,
    alt: "Onion Head constrangido e surpreso",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioncuriosity)",
    src: OnionHeadCuriosityIcon,
    alt: "Onion Head curioso",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniondontunderstand)",
    src: OnionHeadDontUnderstandIcon,
    alt: "Onion Head sem entender",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionnyoron)",
    src: OnionHeadNyoronIcon,
    alt: "Onion Head confuso",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionomgnoes)",
    src: OnionHeadOmgNoesIcon,
    alt: "Onion Head desesperado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionomgwtfbbq)",
    src: OnionHeadOmgWtfBbqIcon,
    alt: "Onion Head extremamente surpreso",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionfacepalm)",
    src: OnionHeadFacepalmIcon,
    alt: "Onion Head fazendo facepalm",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionomfg)",
    src: OnionHeadOmfgIcon,
    alt: "Onion Head gritando de surpresa",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionpanic)",
    src: OnionHeadPanicIcon,
    alt: "Onion Head em pânico",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionspittake1)",
    src: OnionHeadSpitTake1Icon,
    alt: "Onion Head cuspindo de surpresa 1",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionspittake2)",
    src: OnionHeadSpitTake2Icon,
    alt: "Onion Head cuspindo de surpresa 2",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionpetrified)",
    src: OnionHeadPetrifiedIcon,
    alt: "Onion Head petrificado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionrejected)",
    src: OnionHeadRejectedIcon,
    alt: "Onion Head rejeitado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionshock)",
    src: OnionHeadShockIcon,
    alt: "Onion Head chocado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionchase)",
    src: OnionHeadChaseIcon,
    alt: "Onion Head perseguindo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(oniondestroy)",
    src: OnionHeadDestroyIcon,
    alt: "Onion Head destruindo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionheadache)",
    src: OnionHeadHeadacheIcon,
    alt: "Onion Head com dor de cabeça",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionimmakillyou)",
    src: OnionHeadImmaKillYouIcon,
    alt: "Onion Head ameaçando",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onioninsulted)",
    src: OnionHeadInsultedIcon,
    alt: "Onion Head insultado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionkyle)",
    src: OnionHeadKyleIcon,
    alt: "Onion Head irritado",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionnotlistening)",
    src: OnionHeadNotListeningIcon,
    alt: "Onion Head sem ouvir",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionno)",
    src: OnionHeadNoIcon,
    alt: "Onion Head dizendo não",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionpunch)",
    src: OnionHeadPunchIcon,
    alt: "Onion Head dando um soco",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionrocketpunch)",
    src: OnionHeadRocketPunchIcon,
    alt: "Onion Head dando um soco foguete",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionrun)",
    src: OnionHeadRunIcon,
    alt: "Onion Head correndo",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionsaiyan)",
    src: OnionHeadSaiyanIcon,
    alt: "Onion Head Saiyajin",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionvoodoo)",
    src: OnionHeadVoodooIcon,
    alt: "Onion Head vodu",
    ...ONION_HEAD_DISPLAY_SIZE,
  },
  {
    code: "(onionwatchit)",
    src: OnionHeadWatchItIcon,
    alt: "Onion Head mandando tomar cuidado",
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
const TASKBAR_BLINK_INTERVAL_MS = 600;
const TASKBAR_BLINK_DURATION_MS = TASKBAR_BLINK_INTERVAL_MS * 7;
const TYPING_HEARTBEAT_MS = 3_000;
const REMOTE_TYPING_TIMEOUT_MS = 8_000;
const MAX_CHAT_IMAGE_INPUT_SIZE = 5 * 1024 * 1024;
const MAX_CHAT_IMAGE_OUTPUT_SIZE = 160 * 1024;
const MAX_CHAT_IMAGE_DIMENSION = 1280;

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

async function prepareChatImage(file: File): Promise<ChatImagePayload> {
  if (!/^image\/(?:jpeg|png|webp)$/.test(file.type)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WebP");
  }
  if (file.size > MAX_CHAT_IMAGE_INPUT_SIZE) {
    throw new Error("A imagem deve ter no máximo 5 MB");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível abrir a imagem"));
      image.src = objectUrl;
    });

    const scale = Math.min(
      1,
      MAX_CHAT_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível processar a imagem");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let result: Blob | null = null;
    for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
      let quality = 0.82;
      while (quality >= 0.4) {
        result = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/webp", quality);
        });
        if (result && result.size <= MAX_CHAT_IMAGE_OUTPUT_SIZE) break;
        quality -= 0.08;
      }
      if (result && result.size <= MAX_CHAT_IMAGE_OUTPUT_SIZE) break;

      const resized = document.createElement("canvas");
      resized.width = Math.max(1, Math.round(canvas.width * 0.8));
      resized.height = Math.max(1, Math.round(canvas.height * 0.8));
      const resizedContext = resized.getContext("2d");
      if (!resizedContext) break;
      resizedContext.drawImage(canvas, 0, 0, resized.width, resized.height);
      canvas.width = resized.width;
      canvas.height = resized.height;
      context.drawImage(resized, 0, 0);
    }
    if (!result || result.size > MAX_CHAT_IMAGE_OUTPUT_SIZE) {
      throw new Error("Não foi possível reduzir a imagem para envio");
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Não foi possível ler a imagem"));
      reader.readAsDataURL(result);
    });
    return { dataUrl, name: file.name.slice(0, 120) || "imagem.webp" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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

function formatMessageTime(sentAt: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(sentAt));
}

function ChatWindow() {
  const { id } = useParams();
  const { user } = useAuth();
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
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [pendingImage, setPendingImage] = useState<ChatImagePayload | null>(null);
  const [isContactTyping, setIsContactTyping] = useState(false);
  const [typingUserId, setTypingUserId] = useState("");
  const [conversation, setConversation] = useState<ApiConversation | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isLoadingInviteCandidates, setIsLoadingInviteCandidates] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteCandidates, setInviteCandidates] = useState<ApiConversationParticipant[]>([]);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [isSavingGroupName, setIsSavingGroupName] = useState(false);
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false);
  const [groupCustomizationError, setGroupCustomizationError] = useState("");
  const [maximizedImage, setMaximizedImage] = useState<ChatImagePayload | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    id ? getChatMessages(id) : [],
  );
  const messagesRef = useRef(messages);
  const messageInputRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const emoticonPickerRef = useRef<HTMLDivElement>(null);
  const editorSelectionRef = useRef<Range | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatSurfaceRef = useRef<HTMLDivElement>(null);
  const messageComposerRef = useRef<HTMLDivElement>(null);
  const nudgeSurfaceRef = useRef<HTMLElement>(null);
  const hasPositionedInitialMessagesRef = useRef(false);
  const nudgeAudioRef = useRef<HTMLAudioElement | null>(null);
  const nudgeAnimationRef = useRef<Animation | null>(null);
  const isTaskbarHighlightedRef = useRef(false);
  const taskbarBlinkIntervalRef = useRef<number | undefined>(undefined);
  const taskbarBlinkEndTimerRef = useRef<number | undefined>(undefined);
  const realtimeSocketRef = useRef<Socket | null>(null);
  const typingHeartbeatIntervalRef = useRef<number | undefined>(undefined);
  const remoteTypingTimerRef = useRef<number | undefined>(undefined);
  const isTypingSentRef = useRef(false);
  const typingGenerationRef = useRef(0);
  const typingRequestQueueRef = useRef<Promise<void>>(Promise.resolve());
  const triggerNudgeEffectRef = useRef<() => void>(() => {});
  const initialNudgeHandledRef = useRef(false);
  const appWindow = useMemo(() => (isTauri() ? getCurrentWebviewWindow() : null), []);
  const activeExclusivePack =
    EXCLUSIVE_EMOTICON_PACKS.find(
      (pack) => pack.id === activeExclusivePackId,
    ) ?? EXCLUSIVE_EMOTICON_PACKS[0];

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
    if (!maximizedImage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMaximizedImage(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [maximizedImage]);

  useEffect(() => {
    if (!appWindow) return;
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
  const [contactStatus, setContactStatus] = useState(
    searchParams.get("status") || "offline",
  );
  const isContactOffline = contactStatus === "offline" || contactStatus === "invisivel";
  const [contactName, setContactName] = useState(
    searchParams.get("name") || `Contato ${id}`,
  );
  const [contactAvatarUrl, setContactAvatarUrl] = useState(
    searchParams.get("avatarUrl") || "",
  );
  const contactProfileFrameParam = searchParams.get("profileFrame");
  const [contactProfileFrame, setContactProfileFrame] = useState(
    isProfileFrame(contactProfileFrameParam) ? contactProfileFrameParam : "status",
  );
  const contactNameEffectParam = searchParams.get("nameEffect");
  const [contactNameEffect, setContactNameEffect] = useState(
    isNameEffect(contactNameEffectParam) ? contactNameEffectParam : "default",
  );
  const ownStatus = toContactStatus(searchParams.get("ownStatus") || "online");
  const ownProfileFrameParam = searchParams.get("ownProfileFrame");
  const ownProfileFrame = isProfileFrame(ownProfileFrameParam)
    ? ownProfileFrameParam
    : (user?.profileFrame ?? "status");
  const ownNameEffectParam = searchParams.get("ownNameEffect");
  const ownNameEffect = isNameEffect(ownNameEffectParam)
    ? ownNameEffectParam
    : (user?.nameEffect ?? "default");
  const initialContactActivity = searchParams.get("message") || "";
  const [contactActivity, setContactActivity] = useState(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(initialContactActivity)
      ? ""
      : initialContactActivity,
  );
  const [contactMusicSource, setContactMusicSource] = useState(
    searchParams.get("musicSource") || "",
  );

  const contactStatusFrame = CONTACT_STATUS_FRAMES[toContactStatus(contactStatus)];
  const contactStatusLabel = contactStatusFrame.label;
  const otherParticipants = conversation?.participants.filter(
    (participant) => participant._id !== user?.id,
  ) ?? [];
  const isGroupConversation = conversation?.kind === "group";
  const conversationTitle = isGroupConversation
    ? conversation.name?.trim() || otherParticipants.map((participant) => participant.displayName).join(", ")
    : contactName;
  const conversationAvatarUrl = isGroupConversation
    ? conversation.avatarUrl || contactAvatarUrl
    : contactAvatarUrl;
  const conversationStatusLabel = isGroupConversation
    ? `${conversation?.participants.length ?? 0} participantes`
    : contactStatusLabel;
  const typingDisplayName = conversation?.participants.find(
    (participant) => participant._id === typingUserId,
  )?.displayName ?? contactName;

  const refreshConversation = useCallback(async () => {
    if (!id) return null;
    const updatedConversation = await getConversation(id);
    setConversation(updatedConversation);
    return updatedConversation;
  }, [id]);

  const handleSaveGroupName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !isGroupConversation || isSavingGroupName) return;
    const name = groupNameDraft.trim();
    if (!name) {
      setGroupCustomizationError("Informe um nome para o grupo.");
      return;
    }
    setIsSavingGroupName(true);
    setGroupCustomizationError("");
    try {
      await updateGroupName(id, name);
      await refreshConversation();
      setIsEditingGroupName(false);
    } catch (error) {
      setGroupCustomizationError(
        error instanceof Error ? error.message : "Não foi possível alterar o nome do grupo",
      );
    } finally {
      setIsSavingGroupName(false);
    }
  };

  const handleGroupAvatarChange = async (file: File | undefined) => {
    if (!file || !id || !isGroupConversation || isUploadingGroupAvatar) return;
    setGroupCustomizationError("");
    if (!/^image\/(?:jpeg|png|webp)$/.test(file.type)) {
      setGroupCustomizationError("Escolha uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setGroupCustomizationError("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setIsUploadingGroupAvatar(true);
    try {
      await uploadGroupAvatar(id, file);
      await refreshConversation();
    } catch (error) {
      setGroupCustomizationError(
        error instanceof Error ? error.message : "Não foi possível alterar a imagem do grupo",
      );
    } finally {
      setIsUploadingGroupAvatar(false);
      if (groupAvatarInputRef.current) groupAvatarInputRef.current.value = "";
    }
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void refreshConversation().catch((error) => {
        if (!cancelled) {
          console.error("Não foi possível carregar os participantes da conversa:", error);
        }
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [refreshConversation]);

  useEffect(() => {
    if (!appWindow) return;
    void appWindow.setTitle(conversationTitle).catch((error) => {
      console.error("Erro ao atualizar o título nativo da conversa:", error);
    });
  }, [appWindow, conversationTitle]);

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

  const handleRemoteTyping = useCallback((typing: TypingNotification) => {
    if (typing.conversationId !== id || typing.userId === user?.id) return;
    if (remoteTypingTimerRef.current !== undefined) {
      window.clearTimeout(remoteTypingTimerRef.current);
      remoteTypingTimerRef.current = undefined;
    }
    setIsContactTyping(typing.isTyping);
    setTypingUserId(typing.isTyping ? typing.userId : "");
    if (typing.isTyping) {
      remoteTypingTimerRef.current = window.setTimeout(() => {
        setIsContactTyping(false);
        setTypingUserId("");
        remoteTypingTimerRef.current = undefined;
      }, REMOTE_TYPING_TIMEOUT_MS);
    }
  }, [id, user?.id]);

  const publishTypingState = useCallback((isTyping: boolean) => {
    if (!id) return;
    typingRequestQueueRef.current = typingRequestQueueRef.current
      .catch(() => undefined)
      .then(() => setConversationTyping(id, isTyping))
      .catch((error) => {
        console.error("Erro ao enviar indicador de digitação:", error);
      });
  }, [id]);

  const stopOwnTyping = useCallback(() => {
    typingGenerationRef.current += 1;
    if (typingHeartbeatIntervalRef.current !== undefined) {
      window.clearInterval(typingHeartbeatIntervalRef.current);
      typingHeartbeatIntervalRef.current = undefined;
    }
    if (isTypingSentRef.current) publishTypingState(false);
    isTypingSentRef.current = false;
  }, [publishTypingState]);

  const updateOwnTyping = useCallback((hasContent: boolean) => {
    if (!hasContent) {
      stopOwnTyping();
      return;
    }

    if (!id) return;
    if (!isTypingSentRef.current) {
      typingGenerationRef.current += 1;
      const generation = typingGenerationRef.current;
      publishTypingState(true);
      isTypingSentRef.current = true;
      typingHeartbeatIntervalRef.current = window.setInterval(
        () => {
          if (
            isTypingSentRef.current &&
            typingGenerationRef.current === generation
          ) {
            publishTypingState(true);
          }
        },
        TYPING_HEARTBEAT_MS,
      );
    }
  }, [id, publishTypingState, stopOwnTyping]);

  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<TypingNotification>(TYPING_CHANGED_EVENT, ({ payload }) => {
      handleRemoteTyping(payload);
    }).then((stopListening) => {
      if (disposed) stopListening();
      else unlisten = stopListening;
    }).catch((error) => {
      console.error("Erro ao receber indicador de digitação:", error);
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [handleRemoteTyping]);

  useEffect(() => {
    const editor = messageInputRef.current;
    if (!editor) return;

    const synchronizeTypingWithEditor = () => {
      const currentContent = serializeEditorContent(editor);
      updateOwnTyping(Boolean(currentContent.trim()));
    };
    const observer = new MutationObserver(synchronizeTypingWithEditor);
    observer.observe(editor, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    synchronizeTypingWithEditor();
    return () => observer.disconnect();
  }, [updateOwnTyping]);

  const sendEncryptedPayload = async (payload: string) => {
    if (!user) {
      throw new Error("Sua sessão não está disponível nesta janela. Feche a conversa e abra novamente.");
    }
    if (!id) {
      throw new Error("Não foi possível identificar esta conversa.");
    }
    const recipients = conversation
      ? conversation.participants.filter((participant) => participant._id !== user.id)
      : contactUserId
        ? [{ _id: contactUserId, displayName: contactName }]
        : [];
    if (recipients.length === 0) {
      throw new Error("Não foi possível identificar os participantes desta conversa.");
    }
    const identity = await registerCurrentDevice(user.id);
    const [recipientKeyGroups, ownKeys] = await Promise.all([
      Promise.all(recipients.map(async (participant) => ({
        participant,
        keys: await listPublicKeys(participant._id),
      }))),
      listPublicKeys(user.id),
    ]);
    const recipientWithoutKeys = recipientKeyGroups.find(({ keys }) => keys.length === 0);
    if (recipientWithoutKeys) {
      throw new Error(`${recipientWithoutKeys.participant.displayName} precisa abrir a versão atualizada do aplicativo uma vez para ativar a criptografia.`);
    }
    const targets = [
      ...recipientKeyGroups.flatMap(({ participant, keys }) =>
        keys.map((key) => ({ userId: participant._id, key })),
      ),
      ...ownKeys.map((key) => ({ userId: user.id, key })),
    ];
    const envelopes = await Promise.all(
      targets.map(({ userId: recipientUserId, key }) =>
        encryptForDevice(payload, id, recipientUserId, key),
      ),
    );
    return sendEncryptedMessage(id, identity.deviceId, envelopes);
  };

  const handleSendMessage = async () => {
    if (!user) {
      setSendError("Sua sessão não está disponível nesta janela.");
      return;
    }
    const hasText = Boolean(message.trim());
    if (!hasText && !pendingImage) return;
    const validation = hasText ? chatMessageSchema.safeParse(message) : null;
    if (validation && !validation.success) {
      setSendError(validation.error.issues[0]?.message ?? "Mensagem inválida");
      return;
    }
    if (isSending) return;
    const validatedMessage = validation?.success ? validation.data : "";
    setIsSending(true);
    setSendError("");
    try {
      const image = pendingImage
        ? { ...pendingImage, caption: validatedMessage || undefined }
        : null;
      const sent = await sendEncryptedPayload(
        image ? encodeImagePayload(image) : validatedMessage,
      );
      const chatMessage: ChatMessage = {
        id: sent._id,
        author: "me",
        senderUserId: user.id,
        text: validatedMessage,
        image: image ?? undefined,
        sentAt: new Date(sent.sentAt).getTime(),
        deliveredAt: sent.deliveredAt ? new Date(sent.deliveredAt).getTime() : undefined,
        readAt: sent.readAt ? new Date(sent.readAt).getTime() : undefined,
      };
      setMessages((current) => {
        const updated = [...current, chatMessage];
        saveChatMessages(sent.conversationId, updated);
        return updated;
      });
      stopOwnTyping();
      setMessage("");
      setPendingImage(null);
      if (messageInputRef.current) messageInputRef.current.innerHTML = "";
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Não foi possível enviar a mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectImage = async (file: File) => {
    if (isSending || isPreparingImage) return;
    setIsPreparingImage(true);
    setSendError("");
    try {
      const image = await prepareChatImage(file);
      setPendingImage(image);
      window.requestAnimationFrame(() => messageInputRef.current?.focus());
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Não foi possível preparar a imagem");
    } finally {
      setIsPreparingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleOpenInvite = async () => {
    if (!user) return;
    setIsInviteOpen(true);
    setIsLoadingInviteCandidates(true);
    setInviteError("");
    try {
      const conversations = await listConversations();
      const currentParticipantIds = new Set(
        conversation?.participants.map((participant) => participant._id) ?? [user.id, contactUserId],
      );
      const candidatesById = new Map<string, ApiConversationParticipant>();
      for (const directConversation of conversations) {
        if (directConversation.kind !== "direct") continue;
        const candidate = directConversation.participants.find(
          (participant) => participant._id !== user.id,
        );
        if (candidate && !currentParticipantIds.has(candidate._id)) {
          candidatesById.set(candidate._id, candidate);
        }
      }
      setInviteCandidates([...candidatesById.values()]);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Não foi possível carregar seus contatos");
    } finally {
      setIsLoadingInviteCandidates(false);
    }
  };

  const handleInviteParticipant = async (participantUserId: string) => {
    if (!id || invitingUserId) return;
    setInvitingUserId(participantUserId);
    setInviteError("");
    try {
      await inviteConversationParticipant(id, participantUserId);
      await refreshConversation();
      setInviteCandidates((current) => current.filter(
        (candidate) => candidate._id !== participantUserId,
      ));
      setIsInviteOpen(false);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Não foi possível convidar o contato");
    } finally {
      setInvitingUserId("");
    }
  };

  const decryptApiMessage = useCallback(async (apiMessage: ApiEncryptedMessage): Promise<ChatMessage | null> => {
    if (!id || !user) return null;
    const identity = await registerCurrentDevice(user.id);
    const envelope = apiMessage.envelopes.find((item) => item.recipientDeviceId === identity.deviceId);
    if (!envelope) return null;
    try {
      const decryptedPayload = decodeChatPayload(
        await decryptEnvelope(user.id, id, envelope.payload),
      );
      return {
        id: apiMessage._id,
        author: apiMessage.senderUserId === user.id ? "me" : "contact",
        senderUserId: apiMessage.senderUserId,
        text: decryptedPayload.type === "text"
          ? decryptedPayload.text
          : decryptedPayload.image.caption ?? "",
        image: decryptedPayload.type === "image" ? decryptedPayload.image : undefined,
        sentAt: new Date(apiMessage.sentAt).getTime(),
        receivedAt: apiMessage.senderUserId === user.id ? undefined : new Date(apiMessage.sentAt).getTime(),
        deliveredAt: apiMessage.deliveredAt ? new Date(apiMessage.deliveredAt).getTime() : undefined,
        readAt: apiMessage.readAt ? new Date(apiMessage.readAt).getTime() : undefined,
      };
    } catch {
      return null;
    }
  }, [id, user]);

  const applyMessageStatuses = useCallback((statuses: MessageStatusUpdate[]) => {
    if (!id || statuses.length === 0) return;
    const statusByMessageId = new Map(
      statuses.map((status) => [status.messageId, status]),
    );
    setMessages((currentMessages) => {
      let changed = false;
      const updatedMessages = currentMessages.map((chatMessage) => {
        const status = statusByMessageId.get(String(chatMessage.id));
        if (!status) return chatMessage;
        const deliveredAt = status.deliveredAt
          ? new Date(status.deliveredAt).getTime()
          : chatMessage.deliveredAt;
        const readAt = status.readAt
          ? new Date(status.readAt).getTime()
          : chatMessage.readAt;
        if (
          deliveredAt === chatMessage.deliveredAt &&
          readAt === chatMessage.readAt
        ) {
          return chatMessage;
        }
        changed = true;
        return { ...chatMessage, deliveredAt, readAt };
      });
      if (!changed) return currentMessages;
      messagesRef.current = updatedMessages;
      saveChatMessages(id, updatedMessages);
      return updatedMessages;
    });
  }, [id]);

  const acknowledgeReceivedMessages = useCallback(async (
    messageIds: string[],
    status: "delivered" | "read",
  ) => {
    if (!id || messageIds.length === 0) return;
    try {
      const statuses = await markMessagesStatus(id, messageIds, status);
      applyMessageStatuses(statuses);
    } catch (error) {
      console.error(`Não foi possível confirmar mensagem como ${status}:`, error);
    }
  }, [applyMessageStatuses, id]);

  const markVisibleMessagesAsRead = useCallback(() => {
    const unreadMessageIds = messagesRef.current
      .filter((chatMessage) => chatMessage.author === "contact" && !chatMessage.readAt)
      .map((chatMessage) => String(chatMessage.id));
    void acknowledgeReceivedMessages(unreadMessageIds, "read");
  }, [acknowledgeReceivedMessages]);

  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<MessageStatusUpdate>(MESSAGE_STATUS_CHANGED_EVENT, ({ payload }) => {
      applyMessageStatuses([payload]);
    }).then((stopListening) => {
      if (disposed) stopListening();
      else unlisten = stopListening;
    }).catch((error) => {
      console.error("Erro ao receber status da mensagem:", error);
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [applyMessageStatuses]);

  const applyTaskbarHighlight = useCallback(
    (highlighted: boolean) => {
      if (!appWindow) return;
      isTaskbarHighlightedRef.current = highlighted;
      const attentionType = highlighted
        ? UserAttentionType.Informational
        : null;

      void appWindow.requestUserAttention(attentionType).catch((error) => {
        console.error("Erro ao alterar o destaque da conversa:", error);
      });
      void invoke("set_kwin_window_attention", {
        windowTitle: conversationTitle,
        attention: highlighted,
      }).catch((error) => {
        console.error("Erro ao alternar o destaque no KWin:", error);
      });
    },
    [appWindow, conversationTitle],
  );

  const stopTaskbarBlinkTimers = useCallback(() => {
    if (taskbarBlinkIntervalRef.current !== undefined) {
      window.clearInterval(taskbarBlinkIntervalRef.current);
      taskbarBlinkIntervalRef.current = undefined;
    }
    if (taskbarBlinkEndTimerRef.current !== undefined) {
      window.clearTimeout(taskbarBlinkEndTimerRef.current);
      taskbarBlinkEndTimerRef.current = undefined;
    }
  }, []);

  const clearTaskbarHighlight = useCallback(() => {
    stopTaskbarBlinkTimers();
    applyTaskbarHighlight(false);
  }, [applyTaskbarHighlight, stopTaskbarBlinkTimers]);

  const fixTaskbarHighlight = useCallback(() => {
    stopTaskbarBlinkTimers();
    applyTaskbarHighlight(true);
  }, [applyTaskbarHighlight, stopTaskbarBlinkTimers]);

  const blinkTaskbarInAmber = useCallback(() => {
    if (!appWindow) return;
    stopTaskbarBlinkTimers();
    applyTaskbarHighlight(true);
    taskbarBlinkIntervalRef.current = window.setInterval(() => {
      applyTaskbarHighlight(!isTaskbarHighlightedRef.current);
    }, TASKBAR_BLINK_INTERVAL_MS);
    taskbarBlinkEndTimerRef.current = window.setTimeout(
      fixTaskbarHighlight,
      TASKBAR_BLINK_DURATION_MS,
    );
  }, [appWindow, applyTaskbarHighlight, fixTaskbarHighlight, stopTaskbarBlinkTimers]);

  const handleMinimizeConversation = () => {
    if (appWindow) void appWindow.minimize();
  };

  useEffect(() => {
    if (!appWindow) return;
    let unlistenFocusChanged: (() => void) | undefined;

    void appWindow
      .onFocusChanged(({ payload: isFocused }) => {
        if (isFocused) {
          clearTaskbarHighlight();
          markVisibleMessagesAsRead();
        }
      })
      .then((unlisten) => {
        unlistenFocusChanged = unlisten;
      });

    return () => {
      unlistenFocusChanged?.();
      clearTaskbarHighlight();
    };
  }, [appWindow, clearTaskbarHighlight, markVisibleMessagesAsRead]);

  useEffect(() => {
    if (appWindow) return;
    const handleConversationVisibility = () => {
      if (document.visibilityState === "visible" && document.hasFocus()) {
        markVisibleMessagesAsRead();
      }
    };
    window.addEventListener("focus", handleConversationVisibility);
    document.addEventListener("visibilitychange", handleConversationVisibility);
    handleConversationVisibility();
    return () => {
      window.removeEventListener("focus", handleConversationVisibility);
      document.removeEventListener("visibilitychange", handleConversationVisibility);
    };
  }, [appWindow, markVisibleMessagesAsRead]);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    void registerCurrentDevice(user.id)
      .then(() => listEncryptedMessages(id))
      .then((history) => Promise.all(history.map(decryptApiMessage)))
      .then((decrypted) => {
        if (cancelled) return;
        const available = decrypted.filter((item): item is ChatMessage => item !== null);
        messagesRef.current = available;
        setMessages(available);
        saveChatMessages(id, available);
        const receivedMessageIds = available
          .filter((chatMessage) => chatMessage.author === "contact" && !chatMessage.readAt)
          .map((chatMessage) => String(chatMessage.id));
        void acknowledgeReceivedMessages(receivedMessageIds, "read");
      })
      .catch((error) => {
        if (!cancelled) setSendError(error instanceof Error ? error.message : "Erro ao carregar mensagens");
      });

    const socket = connectRealtime(
      (incoming) => {
        if (incoming.conversationId !== id || incoming.senderUserId === user.id) return;
        setIsContactTyping(false);
        setTypingUserId("");
        if (remoteTypingTimerRef.current !== undefined) {
          window.clearTimeout(remoteTypingTimerRef.current);
          remoteTypingTimerRef.current = undefined;
        }
        void decryptApiMessage(incoming as ApiEncryptedMessage).then((decrypted) => {
          if (!decrypted || cancelled) return;
          const updatedMessages = appendChatMessage(id, decrypted);
          messagesRef.current = updatedMessages;
          setMessages(updatedMessages);
          void acknowledgeReceivedMessages([String(decrypted.id)], "read");
          if (appWindow) {
            void Promise.all([appWindow.isFocused(), appWindow.isMinimized()])
              .then(([isFocused, isMinimized]) => {
                if (!cancelled && (isMinimized || !isFocused)) blinkTaskbarInAmber();
              })
              .catch((error) => {
                console.error("Erro ao verificar o estado da janela de conversa:", error);
              });
          }
        });
      },
      undefined,
      undefined,
      (nudge) => {
        if (nudge.conversationId === id && nudge.senderUserId !== user.id) {
          void triggerNudgeEffectRef.current();
        }
      },
      (profiles) => {
        const contactProfile = profiles.find((profile) => profile.userId === contactUserId);
        if (!contactProfile) return;
        setContactActivity(
          contactProfile.music || contactProfile.personalMessage || "",
        );
        setContactMusicSource(
          contactProfile.music ? contactProfile.musicSource : "",
        );
      },
      (profile) => {
        if (profile.userId === contactUserId) {
          setContactActivity(profile.music || profile.personalMessage || "");
          setContactMusicSource(profile.music ? profile.musicSource : "");
        }
      },
      (statuses) => {
        const status = statuses.find((item) => item.userId === contactUserId)?.status;
        setContactStatus(status ?? "offline");
      },
      (status) => {
        if (status.userId === contactUserId) setContactStatus(status.status);
      },
      undefined,
      (account) => {
        if (account.userId !== contactUserId) return;
        setContactName(account.displayName);
        setContactAvatarUrl(account.avatarUrl);
        setContactProfileFrame(account.profileFrame);
        setContactNameEffect(account.nameEffect);
      },
      (typing) => {
        if (!isTauri()) handleRemoteTyping(typing);
      },
      (status) => {
        if (!isTauri()) applyMessageStatuses([status]);
      },
      ({ conversationId }) => {
        if (conversationId === id) {
          void refreshConversation();
        }
      },
    );
    realtimeSocketRef.current = socket;
    return () => {
      cancelled = true;
      if (isTypingSentRef.current) {
        publishTypingState(false);
      }
      if (typingHeartbeatIntervalRef.current !== undefined) {
        window.clearInterval(typingHeartbeatIntervalRef.current);
        typingHeartbeatIntervalRef.current = undefined;
      }
      if (remoteTypingTimerRef.current !== undefined) {
        window.clearTimeout(remoteTypingTimerRef.current);
        remoteTypingTimerRef.current = undefined;
      }
      isTypingSentRef.current = false;
      setIsContactTyping(false);
      setTypingUserId("");
      realtimeSocketRef.current = null;
      socket?.disconnect();
    };
  }, [acknowledgeReceivedMessages, appWindow, applyMessageStatuses, blinkTaskbarInAmber, contactUserId, decryptApiMessage, handleRemoteTyping, id, publishTypingState, refreshConversation, user]);

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

    const nextMessage = serializeEditorContent(editor);
    setMessage(nextMessage);
    updateOwnTyping(Boolean(nextMessage.trim()));
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
  }, [messages, isContactTyping]);

  useEffect(() => {
    return () => {
      nudgeAudioRef.current?.pause();
      nudgeAudioRef.current = null;
      nudgeAnimationRef.current?.cancel();
      nudgeAnimationRef.current = null;
    };
  }, []);

  // EFEITO VISUAL E SONORO
  const triggerNudgeEffect = useCallback(() => {
    const nudgeSurface = nudgeSurfaceRef.current;
    if (nudgeSurface) {
      nudgeAnimationRef.current?.cancel();
      const animation = nudgeSurface.animate([
        { transform: "translate(0, 0) rotate(0deg)" },
        { transform: "translate(-4px, -4px) rotate(-1deg)" },
        { transform: "translate(4px, 4px) rotate(1deg)" },
        { transform: "translate(-4px, -4px) rotate(-1deg)" },
        { transform: "translate(4px, 4px) rotate(1deg)" },
        { transform: "translate(-4px, -4px) rotate(-1deg)" },
        { transform: "translate(4px, 4px) rotate(1deg)" },
        { transform: "translate(-4px, -4px) rotate(-1deg)" },
        { transform: "translate(4px, 4px) rotate(1deg)" },
        { transform: "translate(-4px, -4px) rotate(-1deg)" },
        { transform: "translate(0, 0) rotate(0deg)" },
      ], {
        duration: 500,
        easing: "ease-in-out",
      });
      nudgeAnimationRef.current = animation;
      animation.onfinish = () => {
        if (nudgeAnimationRef.current === animation) {
          nudgeAnimationRef.current = null;
        }
      };
    }

    if (appWindow) {
      void (async () => {
        try {
          await appWindow.unminimize();
          await appWindow.show();
          await appWindow.setFocus();
        } catch (error) {
          console.error("Erro ao focar janela nativa:", error);
        }
      })();
    }

    if (isTauri()) {
      const previousAudio = nudgeAudioRef.current;
      previousAudio?.pause();

      const audio = new Audio(nudgeSound);
      audio.preload = "auto";
      audio.volume = 1;
      nudgeAudioRef.current = audio;

      void audio.play().catch((audioError) => {
        if (nudgeAudioRef.current === audio) {
          console.error("Erro ao reproduzir o som:", audioError);
        }
      });
    }
  }, [appWindow]);

  useEffect(() => {
    triggerNudgeEffectRef.current = triggerNudgeEffect;
  }, [triggerNudgeEffect]);

  useEffect(() => {
    if (!searchParams.has("nudge") || initialNudgeHandledRef.current) return;
    initialNudgeHandledRef.current = true;
    triggerNudgeEffect();
  }, [searchParams, triggerNudgeEffect]);

  const handleSendNudge = async () => {
    const socket = realtimeSocketRef.current;
    if (
      !socket ||
      !id ||
      (!isGroupConversation && isContactOffline)
    ) return;
    try {
      const response = await socket.timeout(5_000).emitWithAck(
        "nudge:send",
        { conversationId: id },
      ) as { delivered: boolean };
      if (response.delivered) triggerNudgeEffect();
    } catch (error) {
      console.error("Não foi possível chamar a atenção:", error);
    }
  };

  useEffect(() => {
    if (!isTauri()) return;
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
      ref={nudgeSurfaceRef}
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-transparent p-2.5 transition-transform"
    >
      <button
        type="button"
        aria-label="Redimensionar pela borda superior"
        className="absolute inset-x-3 top-0 z-50 h-1 cursor-n-resize"
        onMouseDown={() => appWindow && void appWindow.startResizeDragging("North")}
      />
      <button
        type="button"
        aria-label="Redimensionar pela borda inferior"
        className="absolute inset-x-3 bottom-0 z-50 h-1 cursor-s-resize"
        onMouseDown={() => appWindow && void appWindow.startResizeDragging("South")}
      />
      <button
        type="button"
        aria-label="Redimensionar pela borda esquerda"
        className="absolute inset-y-3 left-0 z-50 w-1 cursor-w-resize"
        onMouseDown={() => appWindow && void appWindow.startResizeDragging("West")}
      />
      <button
        type="button"
        aria-label="Redimensionar pela borda direita"
        className="absolute inset-y-3 right-0 z-50 w-1 cursor-e-resize"
        onMouseDown={() => appWindow && void appWindow.startResizeDragging("East")}
      />

      <div
        ref={chatSurfaceRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[#6694ad] bg-gradient-to-b from-[#f8fcfe] via-[#edf7fb] to-[#d8edf6] font-sans antialiased [text-rendering:geometricPrecision]"
      >
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
                aria-label={`Vídeo de ${conversationTitle}`}
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
          className="msn-titlebar relative flex h-9 shrink-0 select-none items-center gap-2 border-b border-[#7fa9bf] bg-gradient-to-r from-[#8fcbe8] via-[#d4eefb] to-[#f4fbfe] pl-3"
        >
          <span className="msn-title-orbs flex items-center" aria-hidden="true">
            <span className="msn-title-orb msn-title-orb--blue h-2.5 w-2.5 -translate-x-[0.5px]" />
            <span className="msn-title-orb msn-title-orb--green z-10 -ml-1 h-3.5 w-3.5" />
          </span>
          <span
            data-tauri-drag-region
            className="min-w-0 flex-1 truncate text-xs font-semibold text-[#315b72]"
          >
            Conversa com {conversationTitle}
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
              onClick={() => appWindow && void appWindow.toggleMaximize()}
              className="grid w-9 place-items-center text-[#426b81] transition-colors hover:bg-white/50"
            >
              <MdCropSquare size={13} />
            </button>
            <button
              type="button"
              aria-label="Fechar conversa"
              title="Fechar"
              onClick={() => appWindow ? void appWindow.close() : window.history.back()}
              className="grid w-10 place-items-center rounded-tr-[11px] text-[#426b81] transition-colors hover:bg-[#d86161] hover:text-white"
            >
              <MdClose size={18} />
            </button>
          </div>
        </div>

        {/* Avatar do contato + histórico da conversa */}
        <section className="flex min-h-0 flex-1 gap-2.5 px-3 pt-3">
          <aside
            className={`flex shrink-0 items-start justify-center transition-[width] duration-200 ${
              isVideoCallOpen
                ? `invisible ${isVideoCallExpanded ? "w-[300px]" : "w-28"}`
                : "w-28"
            }`}
          >
            {isGroupConversation ? (
              <div className="relative">
                <input
                  ref={groupAvatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => void handleGroupAvatarChange(event.target.files?.[0])}
                />
                <button
                  type="button"
                  aria-label="Alterar imagem do grupo"
                  title="Alterar imagem do grupo"
                  disabled={isUploadingGroupAvatar}
                  onClick={() => groupAvatarInputRef.current?.click()}
                  className="group relative rounded-xl disabled:cursor-wait"
                >
                  <PictureFrame
                    frame="status"
                    status="online"
                    imageSrc={resolveApiAssetUrl(conversationAvatarUrl) || undefined}
                    imageAlt="Foto da conversa em grupo"
                    displayName={conversationTitle}
                    imageSize={96}
                  />
                  <span className="absolute inset-x-2 bottom-2 z-20 flex items-center justify-center gap-1 rounded-md bg-[#183846]/80 px-1.5 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <MdPhotoCamera size={13} />
                    {isUploadingGroupAvatar ? "Enviando..." : "Alterar imagem"}
                  </span>
                </button>
              </div>
            ) : (
              <PictureFrame
                frame={contactProfileFrame}
                status={toContactStatus(contactStatus)}
                imageSrc={resolveApiAssetUrl(conversationAvatarUrl) || undefined}
                imageAlt={`Foto de perfil de ${contactName}`}
                displayName={conversationTitle}
                imageSize={96}
              />
            )}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <header className="flex items-start justify-between px-1 pb-2.5">
              <div className="min-w-0">
                {isGroupConversation && isEditingGroupName ? (
                  <form
                    className="flex min-w-0 items-center gap-1.5"
                    onSubmit={(event) => void handleSaveGroupName(event)}
                  >
                    <input
                      autoFocus
                      type="text"
                      maxLength={80}
                      value={groupNameDraft}
                      disabled={isSavingGroupName}
                      aria-label="Nome do grupo"
                      onChange={(event) => setGroupNameDraft(event.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-[#8ebbd0] bg-white/80 px-2 py-1 text-base font-semibold text-[#284f65] outline-none focus:border-[#4f9dc1] focus:ring-2 focus:ring-[#8dcce8]/35"
                    />
                    <button
                      type="submit"
                      aria-label="Salvar nome do grupo"
                      title="Salvar"
                      disabled={isSavingGroupName || !groupNameDraft.trim()}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#337b66] transition-colors hover:bg-[#d9f1e8] disabled:opacity-45"
                    >
                      <MdDone size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancelar alteração do nome"
                      title="Cancelar"
                      disabled={isSavingGroupName}
                      onClick={() => {
                        setIsEditingGroupName(false);
                        setGroupCustomizationError("");
                      }}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#8b5555] transition-colors hover:bg-[#f5dddd] disabled:opacity-45"
                    >
                      <MdClose size={17} />
                    </button>
                  </form>
                ) : (
                  <h1 className="flex min-w-0 items-center gap-1 text-lg font-semibold text-[#284f65]">
                    <span
                      className="min-w-0 truncate"
                      style={!isGroupConversation && contactNameEffect !== "default"
                        ? getTextEffectStyle(contactNameEffect)
                        : undefined}
                    >
                      {conversationTitle}
                    </span>
                    {isGroupConversation && (
                      <button
                        type="button"
                        aria-label="Alterar nome do grupo"
                        title="Alterar nome do grupo"
                        onClick={() => {
                          setGroupNameDraft(conversation?.name?.trim() || conversationTitle);
                          setGroupCustomizationError("");
                          setIsEditingGroupName(true);
                        }}
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[#5f879b] transition-colors hover:bg-[#d9edf6] hover:text-[#287da5]"
                      >
                        <MdEdit size={15} />
                      </button>
                    )}
                    <span className="shrink-0 text-sm font-normal italic text-[#67899a]">
                      ({conversationStatusLabel})
                    </span>
                  </h1>
                )}
                {isGroupConversation && groupCustomizationError && (
                  <p role="alert" className="mt-1 text-xs text-[#b64040]">
                    {groupCustomizationError}
                  </p>
                )}
                {!isGroupConversation && contactActivity && (
                  <div className="msn-profile-message flex min-w-0 items-center gap-1.5 text-xs italic">
                    {contactMusicSource && (
                      <span className="shrink-0 text-[16px] not-italic">
                        <MediaSourceIcon source={contactMusicSource} />
                      </span>
                    )}
                    <p className="truncate">{contactActivity}</p>
                  </div>
                )}
              </div>
            </header>

            <div className="relative min-h-0 flex-1">
              <div
                ref={messagesContainerRef}
                aria-live="polite"
                className="h-full overflow-y-auto rounded-[10px] border border-[#9dbdcc] bg-gradient-to-b from-white/95 to-[#f3f9fc]/95 px-3 pb-3 pt-3 text-sm shadow-[inset_0_2px_5px_rgba(47,91,113,0.1)]"
              >
              {messages.length === 0 ? (
                <div className="flex h-full min-h-24 items-center justify-center">
                  <p className="rounded-full border border-[#d4e5ed] bg-white/70 px-4 py-1.5 text-center text-xs italic text-[#7893a0]">
                    Início da conversa com {conversationTitle}
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
                      <span
                        className="mb-1 px-1 text-xs font-medium text-[#5f7f90]"
                        style={chatMessage.author === "me"
                          ? (ownNameEffect !== "default" ? getTextEffectStyle(ownNameEffect) : undefined)
                          : (!isGroupConversation && contactNameEffect !== "default" ? getTextEffectStyle(contactNameEffect) : undefined)}
                      >
                        {chatMessage.author === "me"
                          ? `${user?.displayName ?? "Você"} diz:`
                          : `${conversation?.participants.find((participant) => participant._id === chatMessage.senderUserId)?.displayName ?? contactName} diz:`}
                      </span>
                      <div className="max-w-[78%] whitespace-pre-wrap break-words rounded-[9px] border border-[#c4dbe5] bg-white p-2 text-[#375567] shadow-[0_1px_3px_rgba(42,83,104,0.1)]">
                        {chatMessage.image ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setMaximizedImage(chatMessage.image ?? null)}
                              title="Ampliar imagem"
                              className="block cursor-zoom-in rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#65afd0]"
                            >
                              <img
                                src={chatMessage.image.dataUrl}
                                alt={chatMessage.image.name || "Imagem enviada"}
                                className="max-h-36 max-w-[220px] rounded-md object-contain"
                              />
                            </button>
                            {chatMessage.text && (
                              <p className="mt-2 leading-4">
                                <MessageContent text={chatMessage.text} />
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="leading-4">
                            <MessageContent text={chatMessage.text} />
                          </p>
                        )}
                        <span className="mt-1 flex items-center justify-end gap-1 text-[10px] leading-none text-[#8198a4]">
                          {chatMessage.sentAt && (
                            <time dateTime={new Date(chatMessage.sentAt).toISOString()}>
                              {formatMessageTime(chatMessage.sentAt)}
                            </time>
                          )}
                          <span
                            aria-label={chatMessage.readAt
                              ? "Mensagem visualizada"
                              : chatMessage.deliveredAt
                                ? "Mensagem entregue"
                                : "Mensagem enviada"}
                            title={chatMessage.readAt
                              ? "Visualizada"
                              : chatMessage.deliveredAt
                                ? "Entregue"
                                : "Enviada"}
                            className={`text-[15px] ${
                              chatMessage.readAt ? "text-[#168ac0]" : "text-[#8198a4]"
                            }`}
                          >
                            {chatMessage.deliveredAt ? (
                              <MdDoneAll aria-hidden="true" />
                            ) : (
                              <MdDone aria-hidden="true" />
                            )}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isContactTyping && (
                <div
                  aria-live="polite"
                  className="pointer-events-none mt-3 flex justify-start"
                >
                  <div className="msn-typing-bubble flex items-center gap-2 rounded-[9px] border border-[#bdd8e5] bg-gradient-to-b from-white to-[#eaf6fb] px-3 py-2 text-xs font-semibold text-[#287da5] shadow-[0_2px_7px_rgba(47,91,113,0.16)]">
                    <span>{typingDisplayName} está digitando</span>
                    <span aria-hidden="true" className="flex items-end gap-1 pb-0.5">
                      <span className="msn-typing-dot" />
                      <span className="msn-typing-dot" />
                      <span className="msn-typing-dot" />
                    </span>
                  </div>
                </div>
              )}
              </div>
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
            <PictureFrame
              frame={ownProfileFrame}
              status={ownStatus}
              imageSrc={resolveApiAssetUrl(user?.avatarUrl) || undefined}
              imageAlt="Minha foto de perfil"
              displayName={user?.displayName}
            />
          </aside>

          <div
            ref={messageComposerRef}
            className="flex min-w-0 flex-1 flex-col rounded-[10px] border border-[#7faec4] bg-white/95 shadow-[0_2px_7px_rgba(40,85,108,0.16)] transition focus-within:border-[#4d9fc4] focus-within:ring-2 focus-within:ring-[#70b9d8]/25"
          >
            <div className="relative min-h-0 flex-1 rounded-t-[9px] bg-gradient-to-b from-white to-[#fbfdfe]">
              {!message && !pendingImage && (
                <span className="pointer-events-none absolute left-3 top-3 text-sm font-normal text-[#829aa6]">
                  Digite uma mensagem
                </span>
              )}
              {pendingImage && (
                <div className="absolute left-2 top-2 z-10 h-14 w-16 rounded-md border border-[#a9cbd9] bg-[#edf7fb] p-1 shadow-sm">
                  <img
                    src={pendingImage.dataUrl}
                    alt={pendingImage.name || "Imagem selecionada"}
                    className="h-full w-full rounded object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remover imagem selecionada"
                    title="Remover imagem"
                    onClick={() => setPendingImage(null)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#8eabb8] bg-white text-[#52758a] shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                  >
                    <MdClose aria-hidden="true" size={13} />
                  </button>
                </div>
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
                  updateOwnTyping(Boolean(nextMessage.trim()));

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
                  if (event.key.length === 1) {
                    updateOwnTyping(true);
                  }

                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage();
                    return;
                  }

                  if (event.key !== "Backspace" && event.key !== "Delete") {
                    return;
                  }

                  const editor = event.currentTarget;
                  window.requestAnimationFrame(() => {
                    if (!editor.isConnected) return;
                    const nextMessage = serializeEditorContent(editor);
                    setMessage(nextMessage);
                    updateOwnTyping(Boolean(nextMessage.trim()));
                  });

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
                  const nextMessage = serializeEditorContent(editor);
                  setMessage(nextMessage);
                  updateOwnTyping(Boolean(nextMessage.trim()));
                }}
                className={`h-full overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm text-[#304f60] outline-none ${
                  pendingImage ? "pl-20" : ""
                }`}
              />
            </div>

            <div className="flex min-h-11 items-center justify-between rounded-b-[9px] border-t border-[#b9d5e1] bg-gradient-to-b from-[#f4fbfe] to-[#dceef6] px-2">
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
                      className="absolute bottom-full left-0 z-40 mb-2 h-[198px] w-[380px] rounded-[10px] border border-[#7faec4] bg-white p-2 shadow-[0_10px_30px_rgba(35,76,98,0.24)]"
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
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent transition-colors enabled:hover:border-white enabled:hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleSendNudge}
                  disabled={!isGroupConversation && isContactOffline}
                  title={!isGroupConversation && isContactOffline
                    ? "Não é possível chamar a atenção de um contato offline"
                    : "Chamar a atenção"}
                >
                  <img
                    src={NudgeIconComparison}
                    alt="Chamar a atenção"
                    className="h-auto w-[34px] max-w-none object-contain"
                  />
                </button>

                <span aria-hidden="true" className="ml-[10px] mr-1 text-[#8aa9b8]">
                  |
                </span>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void handleSelectImage(file);
                  }}
                />
                <button
                  type="button"
                  aria-label="Selecionar imagem"
                  title="Selecionar imagem"
                  disabled={isSending || isPreparingImage}
                  onClick={() => imageInputRef.current?.click()}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent transition-colors enabled:hover:border-white enabled:hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FcAddImage aria-hidden="true" size={21} />
                </button>

                <button
                  type="button"
                  aria-label="Convidar contato para a conversa"
                  title="Convidar contato"
                  onClick={() => void handleOpenInvite()}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-[#527b90] transition-colors hover:border-white hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#65afd0]/50"
                >
                  <MdPersonAddAlt aria-hidden="true" size={21} />
                </button>

                <button
                  type="button"
                  disabled
                  aria-label="Iniciar conversa por voz (em breve)"
                  title="Iniciar conversa por voz (em breve)"
                  className="cursor-not-allowed rounded-md border border-transparent p-2 opacity-40"
                >
                  <MdVoiceChat aria-hidden="true" className="text-[#527b90]" size={20} />
                </button>
                <button
                  type="button"
                  disabled
                  aria-label="Ativar microfone (em breve)"
                  title="Ativar microfone (em breve)"
                  className="cursor-not-allowed rounded-md border border-transparent p-2 opacity-40"
                >
                  <FaMicrophoneAlt aria-hidden="true" className="text-[#527b90]" size={18} />
                </button>
                <button
                  type="button"
                  disabled
                  aria-label="Configurar áudio (em breve)"
                  title="Configurar áudio (em breve)"
                  className="cursor-not-allowed rounded-md border border-transparent p-2 opacity-40"
                >
                  <FaHeadphonesAlt aria-hidden="true" className="text-[#527b90]" size={18} />
                </button>
                <button
                  type="button"
                  disabled
                  aria-label="Iniciar conversa por vídeo (em breve)"
                  title="Iniciar conversa por vídeo (em breve)"
                  aria-pressed={isVideoCallOpen}
                  onClick={handleToggleVideoCall}
                  className="cursor-not-allowed rounded-md border border-transparent p-2 opacity-40"
                >
                  <MdOutlineVideoChat aria-hidden="true" className="text-[#527b90]" size={20} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={(!message.trim() && !pendingImage) || isSending || isPreparingImage}
                title="Enviar mensagem criptografada"
                className="rounded-md border border-[#3989b1] bg-gradient-to-b from-[#78c5e5] to-[#3295c2] px-4 py-1.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_1px_2px_rgba(31,82,108,0.24)] transition hover:from-[#8bd1ec] hover:to-[#3aa2cf] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </section>

        <footer className="flex min-h-6 shrink-0 items-center px-3 pb-1 text-[10px] text-[#67899a]">
          <p className={`min-w-0 truncate ${sendError ? "text-red-600" : ""}`}>
            {sendError || (lastReceivedAt
              ? `Última mensagem recebida em ${lastReceivedAt}`
              : "Nenhuma mensagem recebida nesta conversa")}
          </p>
        </footer>
      </div>

      {isInviteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Convidar contato para a conversa"
          className="msn-invite-backdrop fixed inset-2.5 z-[100] flex items-center justify-center rounded-[12px] bg-[#102633]/90 p-6"
          onClick={() => setIsInviteOpen(false)}
        >
          <div
            className="msn-invite-panel w-full max-w-[420px] overflow-hidden rounded-[10px] border border-[#7faec4] bg-gradient-to-b from-[#f8fdff] to-[#e3f3fa] shadow-[0_8px_24px_rgba(20,55,73,0.34)]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-[#b9d5e1] px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-[#284f65]">Convidar para a conversa</h2>
                <p className="mt-0.5 text-[11px] text-[#67899a]">Escolha um contato para criar ou ampliar o grupo.</p>
              </div>
              <button
                type="button"
                aria-label="Fechar convite"
                title="Fechar"
                onClick={() => setIsInviteOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[#52758a] transition hover:border-white hover:bg-white/70"
              >
                <MdClose aria-hidden="true" size={18} />
              </button>
            </header>
            <div className="max-h-[340px] overflow-y-auto p-3">
              {isLoadingInviteCandidates && (
                <p className="py-6 text-center text-xs italic text-[#7893a0]">Carregando contatos...</p>
              )}
              {!isLoadingInviteCandidates && inviteError && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {inviteError}
                </p>
              )}
              {!isLoadingInviteCandidates && !inviteError && inviteCandidates.length === 0 && (
                <p className="py-6 text-center text-xs italic text-[#7893a0]">
                  Todos os seus contatos já participam desta conversa.
                </p>
              )}
              {!isLoadingInviteCandidates && inviteCandidates.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {inviteCandidates.map((candidate) => (
                    <button
                      key={candidate._id}
                      type="button"
                      disabled={Boolean(invitingUserId)}
                      onClick={() => void handleInviteParticipant(candidate._id)}
                      className="flex items-center gap-3 rounded-[8px] border border-transparent bg-white/45 p-2 text-left transition hover:border-[#8ebbd0] hover:bg-white/80 disabled:cursor-wait disabled:opacity-60"
                    >
                      {candidate.avatarUrl ? (
                        <img
                          src={resolveApiAssetUrl(candidate.avatarUrl)}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md border border-[#b9d5e1] object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#b9d5e1] bg-[#dceef6] text-sm font-semibold text-[#52758a]">
                          {candidate.displayName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#31556a]">
                          {candidate.displayName}
                        </span>
                        <span className="block truncate text-[11px] text-[#67899a]">{candidate.email}</span>
                      </span>
                      <span className="text-xs font-semibold text-[#287da5]">
                        {invitingUserId === candidate._id ? "Convidando..." : "Convidar"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {maximizedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagem ampliada"
          className="fixed inset-2.5 z-[100] flex items-center justify-center rounded-[12px] bg-[#102633]/90 p-8"
          onClick={() => setMaximizedImage(null)}
        >
          <button
            type="button"
            aria-label="Fechar imagem ampliada"
            title="Fechar"
            onClick={() => setMaximizedImage(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md border border-white/40 bg-black/30 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <MdClose aria-hidden="true" size={24} />
          </button>
          <img
            src={maximizedImage.dataUrl}
            alt={maximizedImage.name || "Imagem enviada"}
            title={maximizedImage.name || "Imagem enviada"}
            className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}

export default ChatWindow;
