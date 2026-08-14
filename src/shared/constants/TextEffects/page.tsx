export const TEXT_EFFECTS = {
  quentes: "linear-gradient(90deg, #ff4500, #ff007f, #ffaa00, #ff4500)",
  frias: "linear-gradient(90deg, #00f0ff, #0072ff, #7f00ff, #00f0ff)",
  nitro: "linear-gradient(90deg, #5865F2, #EB459F, #5865F2)",
  cyberpunk: "linear-gradient(90deg, #ff0055, #00ffcc, #9900ff, #ff0055)",
  matrix: "linear-gradient(90deg, #00ff7f, #00aa00, #00ffff, #00ff7f)",
  gold: "linear-gradient(90deg, #ffe066, #f5b041, #f9e79f, #ffe066)",
  mono: "linear-gradient(90deg, #ffffff, #333333, #ffffff)",
  synthwave: "linear-gradient(90deg, #0018ff, #bd00ff, #ff00b8, #0018ff)",
  vaporwave: "linear-gradient(90deg, #ff9a9e, #fecfef, #a1c4fd, #ff9a9e)",
  vampire: "linear-gradient(90deg, #ff0000, #1a0000, #ff0000)",
  aurora: "linear-gradient(90deg, #0575e6, #00f260, #7f00ff, #0575e6)",
  diamond: "linear-gradient(90deg, #e0f7fa, #80deea, #b2ebf2, #e0f7fa)",
  rgb: "linear-gradient(90deg, #ff0000, #00ff00, #0000ff, #ff00ff, #ff0000)",
  dracula: "linear-gradient(90deg, #bd93f9, #ff79c6, #8be9fd, #bd93f9)",
} as const;

export type TextEffectKey = keyof typeof TEXT_EFFECTS;

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
