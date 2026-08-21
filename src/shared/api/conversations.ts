import { apiRequest, type ApiUser } from "./client";

export interface ApiConversationParticipant extends Pick<
  ApiUser,
  "email" | "displayName" | "personalMessage" | "avatarUrl" | "profileFrame" | "nameEffect"
> {
  _id: string;
}

export interface ApiConversation {
  _id: string;
  kind: "direct" | "group";
  name?: string;
  avatarUrl?: string;
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

export async function getConversation(conversationId: string): Promise<ApiConversation> {
  const response = await apiRequest<{ conversation: ApiConversation }>(
    `/conversations/${conversationId}`,
  );
  return response.conversation;
}

export async function inviteConversationParticipant(
  conversationId: string,
  participantUserId: string,
): Promise<void> {
  await apiRequest(`/conversations/${conversationId}/participants`, {
    method: "POST",
    body: JSON.stringify({ participantUserId }),
  });
}

export async function updateGroupName(
  conversationId: string,
  name: string,
): Promise<void> {
  await apiRequest(`/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function uploadGroupAvatar(
  conversationId: string,
  file: File,
): Promise<string> {
  const body = new FormData();
  body.append("avatar", file);
  const response = await apiRequest<{ avatarUrl: string }>(
    `/conversations/${conversationId}/avatar`,
    { method: "POST", body },
  );
  return response.avatarUrl;
}
