import type { ChatImagePayload } from "./chatPayload";

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

    let didMigrateReceivedAt = false;
    const migrationTime = Date.now();
    const messages = (parsedMessages as ChatMessage[]).map((message) => {
      if (message.author !== "contact" || message.receivedAt) {
        return message;
      }

      didMigrateReceivedAt = true;
      const idContainsTimestamp = typeof message.id === "number" && message.id >= 1_000_000_000_000;

      return {
        ...message,
        receivedAt: idContainsTimestamp && typeof message.id === "number" ? message.id : migrationTime,
      };
    });

    if (didMigrateReceivedAt) {
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
