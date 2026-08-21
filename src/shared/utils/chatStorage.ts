import { decodeChatPayload, type ChatImagePayload } from "./chatPayload";

export interface ChatMessage {
  id: number | string;
  author: "me" | "contact";
  text: string;
  image?: ChatImagePayload;
  receivedAt?: number;
}

const CHAT_STORAGE_PREFIX = "msn-modern:chat-messages:";

function getStorageKey(chatId: string) {
  return `${CHAT_STORAGE_PREFIX}${chatId}`;
}

export function getChatMessages(chatId: string): ChatMessage[] {
  try {
    const storedMessages = localStorage.getItem(getStorageKey(chatId));
    if (!storedMessages) return [];

    const parsedMessages: unknown = JSON.parse(storedMessages);
    if (!Array.isArray(parsedMessages)) return [];

    let didMigrateStoredMessages = false;
    const migrationTime = Date.now();
    const messages = (parsedMessages as ChatMessage[]).map((message) => {
      let normalizedMessage = message;
      if (!message.image && typeof message.text === "string") {
        const decodedPayload = decodeChatPayload(message.text);
        if (decodedPayload.type === "image") {
          didMigrateStoredMessages = true;
          normalizedMessage = {
            ...message,
            text: decodedPayload.image.caption ?? "",
            image: decodedPayload.image,
          };
        }
      }

      if (normalizedMessage.author !== "contact" || normalizedMessage.receivedAt) {
        return normalizedMessage;
      }

      didMigrateStoredMessages = true;
      const idContainsTimestamp = typeof message.id === "number" && message.id >= 1_000_000_000_000;

      return {
        ...normalizedMessage,
        receivedAt: idContainsTimestamp && typeof message.id === "number" ? message.id : migrationTime,
      };
    });

    if (didMigrateStoredMessages) {
      localStorage.setItem(getStorageKey(chatId), JSON.stringify(messages));
    }

    return messages;
  } catch (error) {
    console.error("Erro ao carregar o histórico da conversa:", error);
    return [];
  }
}

export function saveChatMessages(
  chatId: string,
  messages: ChatMessage[],
) {
  localStorage.setItem(getStorageKey(chatId), JSON.stringify(messages));
}

export function appendChatMessage(
  chatId: string,
  message: ChatMessage,
): ChatMessage[] {
  const currentMessages = getChatMessages(chatId);
  const existingMessageIndex = currentMessages.findIndex(
    (currentMessage) => currentMessage.id === message.id,
  );

  if (existingMessageIndex !== -1) {
    const existingMessage = currentMessages[existingMessageIndex];
    const enrichedMessage = { ...message, ...existingMessage };

    if (existingMessage.receivedAt || !enrichedMessage.receivedAt) {
      return currentMessages;
    }

    const updatedMessages = [...currentMessages];
    updatedMessages[existingMessageIndex] = enrichedMessage;
    saveChatMessages(chatId, updatedMessages);
    return updatedMessages;
  }

  const updatedMessages = [...currentMessages, message];
  saveChatMessages(chatId, updatedMessages);
  return updatedMessages;
}
