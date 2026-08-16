/* eslint-disable react-refresh/only-export-components -- módulo compartilhado de estilos, sem componentes */
import {
  PROFILE_STYLE_BACKGROUNDS,
  type ProfileStyleKey,
} from "../ProfileStyle/page";

export const TEXT_EFFECTS = PROFILE_STYLE_BACKGROUNDS;
export type TextEffectKey = ProfileStyleKey;

function getTextEffectStyle(key: TextEffectKey): React.CSSProperties {
  return {
    background: TEXT_EFFECTS[key],
    backgroundSize: "300% 100%",

    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",

    color: "transparent",
    display: "inline-block",

    animation: "gradientMove 4s linear infinite",
  };
}

export { getTextEffectStyle };
