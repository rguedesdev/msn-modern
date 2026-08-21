import type { FastifyInstance } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import { deviceIdSchema, HttpError, objectIdSchema, opaqueBase64Schema, parseInput } from "../http.js";
import { ConversationModel } from "../models/conversation.js";
import { DeviceModel } from "../models/device.js";
import { E2eeDeviceModel } from "../models/e2ee-device.js";
import { MessageModel, type Message } from "../models/message.js";

const routeSchema = z.object({ conversationId: objectIdSchema });
const envelopeSchema = z.object({
  recipientUserId: objectIdSchema,
  recipientDeviceId: deviceIdSchema,
  type: z.enum(["prekey", "ratchet"]),
  payload: opaqueBase64Schema,
});
const sendMessageSchema = z.object({
  senderDeviceId: deviceIdSchema,
  clientMessageId: z.string().uuid(),
  protocol: z.enum(["signal-v1", "webcrypto-p256-v1"]),
  envelopes: z.array(envelopeSchema).min(1).max(100),
});
const historyQuerySchema = z.object({
  before: objectIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const typingSchema = z.object({ isTyping: z.boolean() });
const messageStatusSchema = z.object({
  messageIds: z.array(objectIdSchema).min(1).max(100),
  status: z.enum(["delivered", "read"]),
});

function isParticipant(participants: Types.ObjectId[], userId: string): boolean {
  return participants.some((participant) => participant.toString() === userId);
}

function messageForUser(message: Message & { _id: Types.ObjectId }, userId: string) {
  const object = (message as unknown as { toObject(): Record<string, unknown> }).toObject();
  return {
    ...object,
    envelopes: message.envelopes.filter(
      (envelope) => envelope.recipientUserId.toString() === userId,
    ),
  };
}

function messageStatusFor(message: Message & { _id: Types.ObjectId }) {
  return {
    conversationId: message.conversationId.toString(),
    messageId: message._id.toString(),
    deliveredAt: message.deliveredAt?.toISOString() ?? null,
    readAt: message.readAt?.toISOString() ?? null,
  };
}

export async function messageRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/conversations/:conversationId/messages/status",
    { preHandler: app.authenticate },
    async (request) => {
      const { conversationId } = parseInput(routeSchema, request.params);
      const input = parseInput(messageStatusSchema, request.body);
      const conversation = await ConversationModel.findById(conversationId)
        .select("participants")
        .lean();
      if (!conversation || !isParticipant(conversation.participants, request.user.sub)) {
        throw new HttpError(404, "Conversa não encontrada");
      }

      const messages = await MessageModel.find({
        _id: { $in: input.messageIds },
        conversationId,
        senderUserId: { $ne: request.user.sub },
        "envelopes.recipientUserId": request.user.sub,
      });
      if (messages.length !== new Set(input.messageIds).size) {
        throw new HttpError(404, "Uma ou mais mensagens não foram encontradas");
      }

      const acknowledgedAt = new Date();
      const changedMessages: typeof messages = [];
      for (const message of messages) {
        let changed = false;
        const deliveredUserIds = new Set((message.deliveredTo ?? []).map(String));
        const readUserIds = new Set((message.readBy ?? []).map(String));
        if (!deliveredUserIds.has(request.user.sub)) {
          message.deliveredTo.push(new Types.ObjectId(request.user.sub));
          deliveredUserIds.add(request.user.sub);
          changed = true;
        }
        if (input.status === "read" && !readUserIds.has(request.user.sub)) {
          message.readBy.push(new Types.ObjectId(request.user.sub));
          readUserIds.add(request.user.sub);
          changed = true;
        }
        const recipientUserIds = conversation.participants
          .map(String)
          .filter((participantId) => participantId !== message.senderUserId.toString());
        if (!message.deliveredAt && recipientUserIds.every((userId) => deliveredUserIds.has(userId))) {
          message.deliveredAt = acknowledgedAt;
          changed = true;
        }
        if (!message.readAt && recipientUserIds.every((userId) => readUserIds.has(userId))) {
          message.readAt = acknowledgedAt;
          changed = true;
        }
        if (changed) {
          await message.save();
          changedMessages.push(message);
        }
      }

      const statuses = messages.map(messageStatusFor);
      for (const message of changedMessages) {
        app.io.to(`user:${message.senderUserId}`).emit(
          "message:status",
          messageStatusFor(message),
        );
      }

      return { statuses };
    },
  );

  app.post(
    "/conversations/:conversationId/typing",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { conversationId } = parseInput(routeSchema, request.params);
      const { isTyping } = parseInput(typingSchema, request.body);
      const conversation = await ConversationModel.findById(conversationId)
        .select("participants")
        .lean();
      if (!conversation || !isParticipant(conversation.participants, request.user.sub)) {
        throw new HttpError(404, "Conversa não encontrada");
      }

      for (const participantId of conversation.participants) {
        const recipientUserId = participantId.toString();
        if (recipientUserId === request.user.sub) continue;
        app.io.to(`user:${recipientUserId}`).emit("typing:changed", {
          conversationId,
          userId: request.user.sub,
          isTyping,
        });
      }
      return reply.code(204).send();
    },
  );

  app.post(
    "/conversations/:conversationId/messages",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { conversationId } = parseInput(routeSchema, request.params);
      const input = parseInput(sendMessageSchema, request.body);
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation || !isParticipant(conversation.participants, request.user.sub)) {
        throw new HttpError(404, "Conversa não encontrada");
      }

      const senderDevice = input.protocol === "webcrypto-p256-v1"
        ? await E2eeDeviceModel.exists({ userId: request.user.sub, deviceId: input.senderDeviceId })
        : await DeviceModel.exists({
            userId: request.user.sub,
            deviceId: input.senderDeviceId,
            isRevoked: false,
          });
      if (!senderDevice) throw new HttpError(403, "Dispositivo remetente inválido");

      const participantIds = new Set(conversation.participants.map(String));
      if (input.envelopes.some((envelope) => !participantIds.has(envelope.recipientUserId))) {
        throw new HttpError(400, "Um envelope tem destinatário fora da conversa");
      }

      const targets = input.envelopes.map((envelope) => ({
        userId: envelope.recipientUserId,
        deviceId: envelope.recipientDeviceId,
      }));
      const addressedDevices: Array<{ userId: Types.ObjectId; deviceId: string }> =
        input.protocol === "webcrypto-p256-v1"
          ? await E2eeDeviceModel.find({ $or: targets }).select("userId deviceId").lean()
          : await DeviceModel.find({
              $or: targets.map((target) => ({ ...target, isRevoked: false })),
            }).select("userId deviceId").lean();
      const validTargets = new Set(
        addressedDevices.map((device) => `${device.userId}:${device.deviceId}`),
      );
      const invalidTarget = input.envelopes.some(
        (envelope) => !validTargets.has(`${envelope.recipientUserId}:${envelope.recipientDeviceId}`),
      );
      if (invalidTarget) throw new HttpError(400, "Um envelope aponta para dispositivo inválido");

      let message = await MessageModel.findOne({
        senderUserId: request.user.sub,
        senderDeviceId: input.senderDeviceId,
        clientMessageId: input.clientMessageId,
      });
      let created = false;
      if (!message) {
        try {
          message = await MessageModel.create({
            ...input,
            conversationId,
            senderUserId: request.user.sub,
            sentAt: new Date(),
          });
          created = true;
          await ConversationModel.updateOne({ _id: conversationId }, { $set: { updatedAt: new Date() } });
        } catch (error: unknown) {
          if (!(typeof error === "object" && error !== null && "code" in error && error.code === 11000)) {
            throw error;
          }
          message = await MessageModel.findOne({
            senderUserId: request.user.sub,
            senderDeviceId: input.senderDeviceId,
            clientMessageId: input.clientMessageId,
          });
        }
      }
      if (!message) throw new Error("Não foi possível recuperar a mensagem idempotente");

      if (created) {
        for (const participantId of participantIds) {
          app.io.to(`user:${participantId}`).emit(
            "message:new",
            messageForUser(message, participantId),
          );
        }
      }

      return reply.code(created ? 201 : 200).send({
        message: messageForUser(message, request.user.sub),
      });
    },
  );

  app.get(
    "/conversations/:conversationId/messages",
    { preHandler: app.authenticate },
    async (request) => {
      const { conversationId } = parseInput(routeSchema, request.params);
      const query = parseInput(historyQuerySchema, request.query);
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation || !isParticipant(conversation.participants, request.user.sub)) {
        throw new HttpError(404, "Conversa não encontrada");
      }

      const filter: Record<string, unknown> = { conversationId };
      if (query.before) filter._id = { $lt: query.before };
      const messages = await MessageModel.find(filter)
        .sort({ _id: -1 })
        .limit(query.limit);

      return {
        messages: messages.map((message) => messageForUser(message, request.user.sub)),
        nextCursor: messages.length === query.limit ? messages.at(-1)?._id.toString() : null,
      };
    },
  );
}
