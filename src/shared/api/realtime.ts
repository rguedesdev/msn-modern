import { io, type Socket } from "socket.io-client";
import { API_URL, getSession } from "./client";
import type { NameEffect, ProfileFrame } from "../constants/ProfileStyle/page";

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
  socket.on("message:new", onEncryptedMessage);
  if (onPresenceSnapshot) socket.on("presence:snapshot", onPresenceSnapshot);
  if (onPresenceChanged) socket.on("presence:changed", onPresenceChanged);
  if (onNudge) socket.on("nudge:received", onNudge);
  if (onProfileSnapshot) socket.on("profile:snapshot", onProfileSnapshot);
  if (onProfileChanged) socket.on("profile:changed", onProfileChanged);
  if (onStatusSnapshot) socket.on("status:snapshot", onStatusSnapshot);
  if (onStatusChanged) socket.on("status:changed", onStatusChanged);
  if (onAccountChanged) socket.on("account:changed", onAccountChanged);
  return socket;
}
