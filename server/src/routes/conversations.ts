import type { FastifyInstance } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import { directConversationKey } from "../domain/identifiers.js";
import { HttpError, objectIdSchema, parseInput } from "../http.js";
import { ConversationModel } from "../models/conversation.js";
import { UserModel } from "../models/user.js";

const createDirectSchema = z.object({ participantUserId: objectIdSchema });

function hasParticipant(participants: Types.ObjectId[], userId: string): boolean {
  return participants.some((participant) => participant.toString() === userId);
}

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/conversations/direct",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { participantUserId } = parseInput(createDirectSchema, request.body);
      if (participantUserId === request.user.sub) {
        throw new HttpError(400, "Uma conversa direta precisa de outro participante");
      }
      if (!(await UserModel.exists({ _id: participantUserId }))) {
        throw new HttpError(404, "Participante não encontrado");
      }

      const directKey = directConversationKey(request.user.sub, participantUserId);
      const existing = await ConversationModel.findOne({ directKey });
      if (existing) return { conversation: existing };

      const conversation = await ConversationModel.create({
        kind: "direct",
        participants: [request.user.sub, participantUserId],
        directKey,
      });
      return reply.code(201).send({ conversation });
    },
  );

  app.get("/conversations", { preHandler: app.authenticate }, async (request) => {
    const conversations = await ConversationModel.find({ participants: request.user.sub })
      .sort({ updatedAt: -1 })
      .populate("participants", "displayName email")
      .lean();
    return { conversations };
  });

  app.get(
    "/conversations/:conversationId",
    { preHandler: app.authenticate },
    async (request) => {
      const { conversationId } = parseInput(
        z.object({ conversationId: objectIdSchema }),
        request.params,
      );
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation || !hasParticipant(conversation.participants, request.user.sub)) {
        throw new HttpError(404, "Conversa não encontrada");
      }
      return { conversation };
    },
  );
}
