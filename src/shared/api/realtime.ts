import { io, type Socket } from "socket.io-client";
import { API_URL, getSession } from "./client";

export interface EncryptedMessageNotification {
  _id: string;
  conversationId: string;
  senderUserId: string;
  senderDeviceId: string;
  protocol: string;
  sentAt: string;
  envelopes: Array<{ recipientUserId: string; recipientDeviceId: string; type: "prekey"; payload: string }>;
}

export function connectRealtime(
  onEncryptedMessage: (message: EncryptedMessageNotification) => void,
  onPresenceSnapshot?: (onlineUserIds: string[]) => void,
  onPresenceChanged?: (change: { userId: string; online: boolean }) => void,
): Socket | null {
  const session = getSession();
  if (!session) return null;

  const socket = io(API_URL, {
    auth: { token: session.accessToken },
    transports: ["websocket"],
  });
  socket.on("message:new", onEncryptedMessage);
  if (onPresenceSnapshot) socket.on("presence:snapshot", onPresenceSnapshot);
  if (onPresenceChanged) socket.on("presence:changed", onPresenceChanged);
  return socket;
}
