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

export async function messageRoutes(app: FastifyInstance): Promise<void> {
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
