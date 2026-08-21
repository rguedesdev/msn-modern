const IMAGE_PAYLOAD_PREFIX = "msn-messenger:image:v1:";

export interface ChatImagePayload {
  dataUrl: string;
  name: string;
  caption?: string;
}

export type DecodedChatPayload =
  | { type: "text"; text: string }
  | { type: "image"; image: ChatImagePayload };

export function encodeImagePayload(image: ChatImagePayload): string {
  return `${IMAGE_PAYLOAD_PREFIX}${JSON.stringify(image)}`;
}

export function decodeChatPayload(payload: string): DecodedChatPayload {
  if (!payload.startsWith(IMAGE_PAYLOAD_PREFIX)) {
    return { type: "text", text: payload };
  }

  try {
    const image = JSON.parse(payload.slice(IMAGE_PAYLOAD_PREFIX.length)) as Partial<ChatImagePayload>;
    if (
      typeof image.dataUrl === "string" &&
      /^data:image\/(?:jpeg|png|webp);base64,/.test(image.dataUrl) &&
      typeof image.name === "string"
    ) {
      return {
        type: "image",
        image: {
          dataUrl: image.dataUrl,
          name: image.name,
          caption: typeof image.caption === "string" ? image.caption : undefined,
        },
      };
    }
  } catch {
    // Conteúdo inválido continua visível como texto em vez de ser descartado.
  }

  return { type: "text", text: payload };
}
