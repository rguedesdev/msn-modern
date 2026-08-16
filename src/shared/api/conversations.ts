import { apiRequest, type ApiUser } from "./client";

export interface ApiConversationParticipant extends Pick<
  ApiUser,
  "email" | "displayName" | "personalMessage" | "avatarUrl" | "profileFrame" | "nameEffect"
> {
  _id: string;
}

export interface ApiConversation {
  _id: string;
  kind: "direct";
  participants: ApiConversationParticipant[];
  createdAt: string;
  updatedAt: string;
}

export async function findUserByEmail(email: string): Promise<ApiUser | null> {
  const response = await apiRequest<{ user: ApiUser | null }>(
    `/users?email=${encodeURIComponent(email)}`,
  );
  return response.user;
}

export async function listConversations(): Promise<ApiConversation[]> {
  const response = await apiRequest<{ conversations: ApiConversation[] }>("/conversations");
  return response.conversations;
}

export async function createDirectConversation(participantUserId: string): Promise<void> {
  await apiRequest("/conversations/direct", {
    method: "POST",
    body: JSON.stringify({ participantUserId }),
  });
}
