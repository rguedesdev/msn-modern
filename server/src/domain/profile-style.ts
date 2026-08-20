export const PROFILE_STYLE_KEYS = [
  "quentes",
  "frias",
  "nitro",
  "cyberpunk",
  "matrix",
  "gold",
  "mono",
  "synthwave",
  "vaporwave",
  "vampire",
  "aurora",
  "diamond",
  "rgb",
  "dracula",
] as const;

export type ProfileStyleKey = typeof PROFILE_STYLE_KEYS[number];
export type ProfileFrame = "status" | ProfileStyleKey;
export type NameEffect = "default" | ProfileStyleKey;

// Acesso temporário para validação visual antes da integração com a loja.
export const TEST_UNLOCKED_PROFILE_STYLE_KEYS: readonly ProfileStyleKey[] = [
  "aurora",
  "diamond",
];
