import { apiRequest } from "./client";
import type { EncryptedEnvelope } from "./e2ee";

export interface ApiEncryptedMessage {
  _id: string;
  conversationId: string;
  senderUserId: string;
  senderDeviceId: string;
  protocol: "webcrypto-p256-v1";
  envelopes: EncryptedEnvelope[];
  sentAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
}

export interface MessageStatusUpdate {
  conversationId: string;
  messageId: string;
  deliveredAt: string | null;
  readAt: string | null;
}

export async function sendEncryptedMessage(
  conversationId: string,
  senderDeviceId: string,
  envelopes: EncryptedEnvelope[],
): Promise<ApiEncryptedMessage> {
  const response = await apiRequest<{ message: ApiEncryptedMessage }>(
    `/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        senderDeviceId,
        clientMessageId: crypto.randomUUID(),
        protocol: "webcrypto-p256-v1",
        envelopes,
      }),
    },
  );
  return response.message;
}

export async function listEncryptedMessages(conversationId: string): Promise<ApiEncryptedMessage[]> {
  const response = await apiRequest<{ messages: ApiEncryptedMessage[] }>(
    `/conversations/${conversationId}/messages?limit=100`,
  );
  return response.messages.reverse();
}

export async function markMessagesStatus(
  conversationId: string,
  messageIds: string[],
  status: "delivered" | "read",
): Promise<MessageStatusUpdate[]> {
  if (messageIds.length === 0) return [];
  const response = await apiRequest<{ statuses: MessageStatusUpdate[] }>(
    `/conversations/${conversationId}/messages/status`,
    {
      method: "POST",
      body: JSON.stringify({ messageIds, status }),
    },
  );
  return response.statuses;
}
