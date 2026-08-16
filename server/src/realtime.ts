import type { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { z } from "zod";
import type { Config } from "./config.js";
import { ConversationModel } from "./models/conversation.js";

const typingSchema = z.object({
  conversationId: z.string().regex(/^[a-f\d]{24}$/i),
  isTyping: z.boolean(),
});
const nudgeSchema = z.object({
  conversationId: z.string().regex(/^[a-f\d]{24}$/i),
});
const profileSchema = z.object({
  personalMessage: z.string().max(160),
  music: z.string().max(300),
  musicSource: z.string().max(100).default(""),
});
const userStatusSchema = z.enum(["online", "ocupado", "ausente", "invisivel"]);
const statusUpdateSchema = z.object({ status: userStatusSchema });
type UserStatus = z.infer<typeof userStatusSchema>;
type PublicStatus = Exclude<UserStatus, "invisivel"> | "offline";
const PRESENCE_DISCONNECT_GRACE_MS = 3_000;

function publicStatus(status: UserStatus): PublicStatus {
  return status === "invisivel" ? "offline" : status;
}

export function configureRealtime(app: FastifyInstance, config: Config): Server {
  const io = new Server(app.server, {
    cors: { origin: config.CORS_ORIGIN.split(",").map((origin) => origin.trim()) },
  });
  const connectedUsers = new Map<string, number>();
  const pendingOfflineTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const profiles = new Map<string, z.infer<typeof profileSchema>>();
  const userStatuses = new Map<string, UserStatus>();

  io.use(async (socket, next) => {
    try {
      const auth = z.object({
        token: z.string().min(1),
        status: userStatusSchema.optional(),
      }).parse(socket.handshake.auth);
      const payload = app.jwt.verify<{ sub: string }>(auth.token);
      socket.data.userId = payload.sub;
      socket.data.initialStatus = auth.status;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const requestedStatus = socket.data.initialStatus as UserStatus | undefined;
    void socket.join(`user:${userId}`);
    const pendingOfflineTimer = pendingOfflineTimers.get(userId);
    const wasOnline = (connectedUsers.get(userId) ?? 0) > 0 || Boolean(pendingOfflineTimer);
    if (pendingOfflineTimer) {
      clearTimeout(pendingOfflineTimer);
      pendingOfflineTimers.delete(userId);
    }
    const connectionCount = (connectedUsers.get(userId) ?? 0) + 1;
    connectedUsers.set(userId, connectionCount);
    const previousStatus = userStatuses.get(userId);
    const currentStatus = requestedStatus ?? previousStatus ?? "online";
    userStatuses.set(userId, currentStatus);
    socket.emit("presence:snapshot", [...connectedUsers.keys()].filter(
      (connectedUserId) => userStatuses.get(connectedUserId) !== "invisivel",
    ));
    socket.emit("status:snapshot", [...connectedUsers.keys()].map((connectedUserId) => ({
      userId: connectedUserId,
      status: publicStatus(userStatuses.get(connectedUserId) ?? "online"),
    })));
    socket.emit("profile:snapshot", [...profiles.entries()].map(([profileUserId, profile]) => ({
      userId: profileUserId,
      ...profile,
    })));
    if (!wasOnline) {
      if (currentStatus !== "invisivel") {
        socket.broadcast.emit("presence:changed", { userId, online: true });
      }
      socket.broadcast.emit("status:changed", {
        userId,
        status: publicStatus(currentStatus),
      });
    } else if (previousStatus && previousStatus !== currentStatus) {
      if (previousStatus === "invisivel" && currentStatus !== "invisivel") {
        socket.broadcast.emit("presence:changed", { userId, online: true });
      } else if (previousStatus !== "invisivel" && currentStatus === "invisivel") {
        socket.broadcast.emit("presence:changed", { userId, online: false });
      }
      socket.broadcast.emit("status:changed", {
        userId,
        status: publicStatus(currentStatus),
      });
    }

    socket.on("disconnect", () => {
      const remaining = (connectedUsers.get(userId) ?? 1) - 1;
      if (remaining > 0) {
        connectedUsers.set(userId, remaining);
        return;
      }
      connectedUsers.set(userId, 0);
      const offlineTimer = setTimeout(() => {
        pendingOfflineTimers.delete(userId);
        if ((connectedUsers.get(userId) ?? 0) > 0) return;
        connectedUsers.delete(userId);
        const disconnectedStatus = userStatuses.get(userId) ?? "online";
        userStatuses.delete(userId);
        if (disconnectedStatus !== "invisivel") {
          socket.broadcast.emit("presence:changed", { userId, online: false });
        }
        socket.broadcast.emit("status:changed", { userId, status: "offline" });
        const profile = profiles.get(userId);
        if (profile?.music) {
          const offlineProfile = { ...profile, music: "", musicSource: "" };
          profiles.set(userId, offlineProfile);
          socket.broadcast.emit("profile:changed", { userId, ...offlineProfile });
        }
      }, PRESENCE_DISCONNECT_GRACE_MS);
      pendingOfflineTimers.set(userId, offlineTimer);
    });

    socket.on("typing:set", async (rawInput) => {
      const result = typingSchema.safeParse(rawInput);
      if (!result.success) return;
      const conversation = await ConversationModel.findOne({
        _id: result.data.conversationId,
        participants: userId,
      }).select("participants");
      if (!conversation) return;

      for (const participantId of conversation.participants) {
        if (participantId.toString() !== userId) {
          socket.to(`user:${participantId}`).emit("typing:changed", {
            conversationId: result.data.conversationId,
            userId,
            isTyping: result.data.isTyping,
          });
        }
      }
    });

    socket.on("nudge:send", async (rawInput, acknowledge?: (result: { delivered: boolean }) => void) => {
      const result = nudgeSchema.safeParse(rawInput);
      if (!result.success) {
        acknowledge?.({ delivered: false });
        return;
      }
      const conversation = await ConversationModel.findOne({
        _id: result.data.conversationId,
        participants: userId,
      }).select("participants");
      if (!conversation) {
        acknowledge?.({ delivered: false });
        return;
      }

      let delivered = false;
      for (const participantId of conversation.participants) {
        const recipientUserId = participantId.toString();
        if (
          recipientUserId === userId ||
          (connectedUsers.get(recipientUserId) ?? 0) === 0 ||
          userStatuses.get(recipientUserId) === "invisivel"
        ) continue;
        delivered = true;
        io.to(`user:${recipientUserId}`).emit("nudge:received", {
          conversationId: result.data.conversationId,
          senderUserId: userId,
        });
      }
      acknowledge?.({ delivered });
    });

    socket.on("profile:update", (rawInput) => {
      const result = profileSchema.safeParse(rawInput);
      if (!result.success) return;
      profiles.set(userId, result.data);
      socket.broadcast.emit("profile:changed", { userId, ...result.data });
    });

    socket.on("status:update", (rawInput) => {
      const result = statusUpdateSchema.safeParse(rawInput);
      if (!result.success) return;
      const previous = userStatuses.get(userId) ?? "online";
      const next = result.data.status;
      if (previous === next) return;
      userStatuses.set(userId, next);

      if (previous === "invisivel" && next !== "invisivel") {
        socket.broadcast.emit("presence:changed", { userId, online: true });
      } else if (previous !== "invisivel" && next === "invisivel") {
        socket.broadcast.emit("presence:changed", { userId, online: false });
      }
      socket.broadcast.emit("status:changed", { userId, status: publicStatus(next) });
    });
  });

  return io;
}
