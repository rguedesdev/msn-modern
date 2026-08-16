import type { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { z } from "zod";
import type { Config } from "./config.js";
import { ConversationModel } from "./models/conversation.js";

const typingSchema = z.object({
  conversationId: z.string().regex(/^[a-f\d]{24}$/i),
  isTyping: z.boolean(),
});

export function configureRealtime(app: FastifyInstance, config: Config): Server {
  const io = new Server(app.server, {
    cors: { origin: config.CORS_ORIGIN.split(",").map((origin) => origin.trim()) },
  });
  const connectedUsers = new Map<string, number>();

  io.use(async (socket, next) => {
    try {
      const token = z.string().min(1).parse(socket.handshake.auth.token);
      const payload = app.jwt.verify<{ sub: string }>(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(`user:${userId}`);
    const connectionCount = (connectedUsers.get(userId) ?? 0) + 1;
    connectedUsers.set(userId, connectionCount);
    socket.emit("presence:snapshot", [...connectedUsers.keys()]);
    if (connectionCount === 1) socket.broadcast.emit("presence:changed", { userId, online: true });

    socket.on("disconnect", () => {
      const remaining = (connectedUsers.get(userId) ?? 1) - 1;
      if (remaining > 0) {
        connectedUsers.set(userId, remaining);
        return;
      }
      connectedUsers.delete(userId);
      socket.broadcast.emit("presence:changed", { userId, online: false });
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
  });

  return io;
}
