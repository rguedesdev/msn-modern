import type { FastifyInstance } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import { directConversationKey } from "../domain/identifiers.js";
import { HttpError, objectIdSchema, parseInput } from "../http.js";
import { ConversationModel } from "../models/conversation.js";
import { UserModel } from "../models/user.js";

const createDirectSchema = z.object({ participantUserId: objectIdSchema });
const inviteParticipantSchema = z.object({ participantUserId: objectIdSchema });
const conversationParamsSchema = z.object({ conversationId: objectIdSchema });
const updateGroupSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome para o grupo").max(80),
});
const MAX_GROUP_PARTICIPANTS = 20;

function hasParticipant(participants: Types.ObjectId[], userId: string): boolean {
  return participants.some((participant) => participant.toString() === userId);
}

function groupAvatarUrl(conversationId: string, avatarFileId?: Types.ObjectId): string {
  return avatarFileId
    ? `/conversations/${conversationId}/avatar?v=${avatarFileId.toString()}&policy=2`
    : "";
}

function notifyConversationChanged(app: FastifyInstance, conversation: {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
}) {
  for (const participantId of conversation.participants) {
    app.io.to(`user:${participantId.toString()}`).emit("conversation:changed", {
      conversationId: conversation._id.toString(),
    });
  }
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
      .populate<{
        participants: Array<{
          _id: Types.ObjectId;
          displayName: string;
          email: string;
          personalMessage?: string;
          avatarFileId?: Types.ObjectId;
          profileFrame?: string;
          nameEffect?: string;
        }>;
      }>(
        "participants",
        "displayName email personalMessage avatarFileId profileFrame nameEffect",
      )
      .lean();
    return {
      conversations: conversations.map((conversation) => {
        const { avatarFileId, ...publicConversation } = conversation;
        return {
          ...publicConversation,
          avatarUrl: groupAvatarUrl(conversation._id.toString(), avatarFileId),
          participants: conversation.participants.map((participant) => {
            const { avatarFileId, ...publicParticipant } = participant;
            const participantId = participant._id.toString();
            return {
              ...publicParticipant,
              avatarUrl: avatarFileId
                ? `/users/${participantId}/avatar?v=${avatarFileId.toString()}&policy=2`
                : "",
              profileFrame: participant.profileFrame ?? "status",
              nameEffect: participant.nameEffect ?? "default",
            };
          }),
        };
      }),
    };
  });

  app.get(
    "/conversations/:conversationId",
    { preHandler: app.authenticate },
    async (request) => {
      const { conversationId } = parseInput(
        conversationParamsSchema,
        request.params,
      );
      const conversation = await ConversationModel.findOne({
        _id: conversationId,
        participants: request.user.sub,
      })
        .populate<{
          participants: Array<{
            _id: Types.ObjectId;
            displayName: string;
            email: string;
            personalMessage?: string;
            avatarFileId?: Types.ObjectId;
            profileFrame?: string;
            nameEffect?: string;
          }>;
        }>(
          "participants",
          "displayName email personalMessage avatarFileId profileFrame nameEffect",
        );
      if (!conversation) {
        throw new HttpError(404, "Conversa não encontrada");
      }
      const object = conversation.toObject();
      const { avatarFileId, ...publicConversation } = object;
      return {
        conversation: {
          ...publicConversation,
          avatarUrl: groupAvatarUrl(conversation._id.toString(), avatarFileId),
          participants: object.participants.map((participant) => {
            const { avatarFileId, ...publicParticipant } = participant;
            const participantId = participant._id.toString();
            return {
              ...publicParticipant,
              avatarUrl: avatarFileId
                ? `/users/${participantId}/avatar?v=${avatarFileId.toString()}&policy=2`
                : "",
              profileFrame: participant.profileFrame ?? "status",
              nameEffect: participant.nameEffect ?? "default",
            };
          }),
        },
      };
    },
  );

  app.patch(
    "/conversations/:conversationId",
    { preHandler: app.authenticate },
    async (request) => {
      const { conversationId } = parseInput(conversationParamsSchema, request.params);
      const { name } = parseInput(updateGroupSchema, request.body);
      const conversation = await ConversationModel.findOneAndUpdate(
        {
          _id: conversationId,
          kind: "group",
          participants: request.user.sub,
        },
        { $set: { name } },
        { returnDocument: "after" },
      );
      if (!conversation) {
        throw new HttpError(404, "Conversa em grupo não encontrada");
      }
      notifyConversationChanged(app, conversation);
      return { conversationId: conversation._id.toString(), name: conversation.name };
    },
  );

  app.post(
    "/conversations/:conversationId/participants",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { conversationId } = parseInput(conversationParamsSchema, request.params);
      const { participantUserId } = parseInput(inviteParticipantSchema, request.body);
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation || !hasParticipant(conversation.participants, request.user.sub)) {
        throw new HttpError(404, "Conversa não encontrada");
      }
      if (hasParticipant(conversation.participants, participantUserId)) {
        throw new HttpError(409, "Este contato já participa da conversa");
      }
      if (conversation.participants.length >= MAX_GROUP_PARTICIPANTS) {
        throw new HttpError(400, `O grupo pode ter no máximo ${MAX_GROUP_PARTICIPANTS} participantes`);
      }
      if (!(await UserModel.exists({ _id: participantUserId }))) {
        throw new HttpError(404, "Participante não encontrado");
      }

      const contactKey = directConversationKey(request.user.sub, participantUserId);
      if (!(await ConversationModel.exists({ kind: "direct", directKey: contactKey }))) {
        throw new HttpError(403, "Você só pode convidar alguém da sua lista de contatos");
      }

      if (conversation.kind === "direct") {
        const originalParticipants = conversation.participants.map(String);
        const originalDirectKey = conversation.directKey;
        conversation.kind = "group";
        conversation.directKey = `group:${conversation._id.toString()}`;
        await conversation.save();
        await ConversationModel.findOneAndUpdate(
          { directKey: originalDirectKey },
          {
            $setOnInsert: {
              kind: "direct",
              participants: originalParticipants,
              directKey: originalDirectKey,
            },
          },
          { upsert: true },
        );
      }

      conversation.participants.push(new Types.ObjectId(participantUserId));
      await conversation.save();

      notifyConversationChanged(app, conversation);

      return reply.code(201).send({ conversationId: conversation._id.toString() });
    },
  );
}
