import { io, type Socket } from "socket.io-client";
import { API_URL, apiRequest, getSession, refreshSession } from "./client";
import type { NameEffect, ProfileFrame } from "../constants/ProfileStyle/page";
import type { MessageStatusUpdate } from "./messages";

export interface EncryptedMessageNotification {
  _id: string;
  conversationId: string;
  senderUserId: string;
  senderDeviceId: string;
  protocol: string;
  sentAt: string;
  envelopes: Array<{ recipientUserId: string; recipientDeviceId: string; type: "prekey"; payload: string }>;
}

export interface NudgeNotification {
  conversationId: string;
  senderUserId: string;
}

export interface TypingNotification {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export async function setConversationTyping(
  conversationId: string,
  isTyping: boolean,
): Promise<void> {
  await apiRequest<void>(`/conversations/${conversationId}/typing`, {
    method: "POST",
    body: JSON.stringify({ isTyping }),
  });
}

export interface RealtimeProfile {
  userId: string;
  personalMessage: string;
  music: string;
  musicSource: string;
}

export type RealtimeUserStatus = "online" | "ocupado" | "ausente" | "invisivel";
export type RealtimePublicStatus = Exclude<RealtimeUserStatus, "invisivel"> | "offline";
export interface RealtimeStatus {
  userId: string;
  status: RealtimePublicStatus;
}

export interface RealtimeAccount {
  userId: string;
  displayName: string;
  avatarUrl: string;
  profileFrame: ProfileFrame;
  nameEffect: NameEffect;
}

export function connectRealtime(
  onEncryptedMessage: (message: EncryptedMessageNotification) => void,
  onPresenceSnapshot?: (onlineUserIds: string[]) => void,
  onPresenceChanged?: (change: { userId: string; online: boolean }) => void,
  onNudge?: (nudge: NudgeNotification) => void,
  onProfileSnapshot?: (profiles: RealtimeProfile[]) => void,
  onProfileChanged?: (profile: RealtimeProfile) => void,
  onStatusSnapshot?: (statuses: RealtimeStatus[]) => void,
  onStatusChanged?: (status: RealtimeStatus) => void,
  initialStatus?: RealtimeUserStatus,
  onAccountChanged?: (account: RealtimeAccount) => void,
  onTypingChanged?: (typing: TypingNotification) => void,
  onMessageStatusChanged?: (status: MessageStatusUpdate) => void,
): Socket | null {
  const session = getSession();
  if (!session) return null;

  const socket = io(API_URL, {
    auth: {
      token: session.accessToken,
      ...(initialStatus ? { status: initialStatus } : {}),
    },
    transports: ["websocket"],
  });
  let isRefreshingSession = false;
  socket.on("connect_error", (error) => {
    if (error.message !== "unauthorized" || isRefreshingSession) return;

    const currentSession = getSession();
    if (!currentSession) return;
    const socketAuth = typeof socket.auth === "function" ? null : socket.auth;

    if (socketAuth?.token !== currentSession.accessToken) {
      socket.auth = { ...socketAuth, token: currentSession.accessToken };
      socket.connect();
      return;
    }

    isRefreshingSession = true;
    void refreshSession(currentSession)
      .then((refreshedSession) => {
        if (!refreshedSession) return;
        const latestAuth = typeof socket.auth === "function" ? {} : socket.auth;
        socket.auth = { ...latestAuth, token: refreshedSession.accessToken };
        socket.connect();
      })
      .catch((refreshError) => {
        console.error("Não foi possível renovar a sessão em tempo real:", refreshError);
      })
      .finally(() => {
        isRefreshingSession = false;
      });
  });
  socket.on("message:new", onEncryptedMessage);
  if (onPresenceSnapshot) socket.on("presence:snapshot", onPresenceSnapshot);
  if (onPresenceChanged) socket.on("presence:changed", onPresenceChanged);
  if (onNudge) socket.on("nudge:received", onNudge);
  if (onProfileSnapshot) socket.on("profile:snapshot", onProfileSnapshot);
  if (onProfileChanged) socket.on("profile:changed", onProfileChanged);
  if (onStatusSnapshot) socket.on("status:snapshot", onStatusSnapshot);
  if (onStatusChanged) socket.on("status:changed", onStatusChanged);
  if (onAccountChanged) socket.on("account:changed", onAccountChanged);
  if (onTypingChanged) socket.on("typing:changed", onTypingChanged);
  if (onMessageStatusChanged) socket.on("message:status", onMessageStatusChanged);
  return socket;
}
