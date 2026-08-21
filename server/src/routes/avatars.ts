import type { FastifyInstance } from "fastify";
import { GridFSBucket } from "mongodb";
import mongoose, { Types } from "mongoose";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";
import { z } from "zod";
import { HttpError, objectIdSchema, parseInput } from "../http.js";
import { ConversationModel } from "../models/conversation.js";
import { UserModel } from "../models/user.js";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const conversationAvatarParamsSchema = z.object({ conversationId: objectIdSchema });

function avatarBucket(): GridFSBucket {
  const database = mongoose.connection.db;
  if (!database) throw new HttpError(503, "Banco de dados indisponível");
  return new GridFSBucket(database, { bucketName: "avatars" });
}

function detectImageType(header: Buffer): { contentType: string; extension: string } | null {
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (
    header.length >= 8 &&
    header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { contentType: "image/png", extension: "png" };
  }
  if (
    header.length >= 12 &&
    header.subarray(0, 4).toString("ascii") === "RIFF" &&
    header.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

function validateImageStream(declaredContentType: string): Transform {
  const chunks: Buffer[] = [];
  let byteCount = 0;
  let validated = false;

  const validateAndFlushHeader = (stream: Transform) => {
    const header = Buffer.concat(chunks);
    const imageType = detectImageType(header);
    if (!imageType || imageType.contentType !== declaredContentType) {
      throw new HttpError(400, "O arquivo não é uma imagem JPG, PNG ou WebP válida");
    }
    validated = true;
    stream.push(header);
    chunks.length = 0;
  };

  return new Transform({
    transform(chunk, _encoding, callback) {
      if (validated) {
        callback(null, chunk);
        return;
      }

      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      chunks.push(buffer);
      byteCount += buffer.length;
      if (byteCount >= 12) {
        try {
          validateAndFlushHeader(this);
        } catch (error) {
          callback(error instanceof Error ? error : new Error(String(error)));
          return;
        }
      }
      callback();
    },
    flush(callback) {
      if (validated) {
        callback();
        return;
      }
      try {
        validateAndFlushHeader(this);
        callback();
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    },
  });
}

function avatarUrl(userId: string, avatarFileId: Types.ObjectId): string {
  return `/users/${userId}/avatar?v=${avatarFileId.toString()}&policy=2`;
}

function conversationAvatarUrl(conversationId: string, avatarFileId: Types.ObjectId): string {
  return `/conversations/${conversationId}/avatar?v=${avatarFileId.toString()}&policy=2`;
}

async function safelyDelete(bucket: GridFSBucket, fileId: Types.ObjectId | undefined) {
  if (!fileId) return;
  try {
    await bucket.delete(fileId);
  } catch (error) {
    if (!(error instanceof Error) || !/file not found/i.test(error.message)) throw error;
  }
}

export async function avatarRoutes(app: FastifyInstance): Promise<void> {
  app.get("/conversations/:conversationId/avatar", async (request, reply) => {
    const { conversationId } = parseInput(conversationAvatarParamsSchema, request.params);
    const conversation = await ConversationModel.findOne({
      _id: conversationId,
      kind: "group",
    }).select("avatarFileId").lean();
    if (!conversation?.avatarFileId) {
      throw new HttpError(404, "Imagem do grupo não encontrada");
    }

    const bucket = avatarBucket();
    const file = await bucket.find({ _id: conversation.avatarFileId }).next();
    if (!file) throw new HttpError(404, "Imagem do grupo não encontrada");

    const etag = `"${conversation.avatarFileId.toString()}"`;
    if (request.headers["if-none-match"] === etag) return reply.code(304).send();
    reply.header("Content-Type", String(file.metadata?.contentType ?? "application/octet-stream"));
    reply.header("Content-Length", String(file.length));
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    reply.header("ETag", etag);
    return reply.send(bucket.openDownloadStream(conversation.avatarFileId));
  });

  app.get("/users/:userId/avatar", async (request, reply) => {
    const { userId } = parseInput(z.object({ userId: objectIdSchema }), request.params);
    const user = await UserModel.findById(userId).select("avatarFileId").lean();
    if (!user?.avatarFileId) throw new HttpError(404, "Imagem de perfil não encontrada");

    const bucket = avatarBucket();
    const file = await bucket.find({ _id: user.avatarFileId }).next();
    if (!file) throw new HttpError(404, "Imagem de perfil não encontrada");

    const etag = `"${user.avatarFileId.toString()}"`;
    if (request.headers["if-none-match"] === etag) return reply.code(304).send();
    reply.header("Content-Type", String(file.metadata?.contentType ?? "application/octet-stream"));
    reply.header("Content-Length", String(file.length));
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    reply.header("ETag", etag);
    return reply.send(bucket.openDownloadStream(user.avatarFileId));
  });

  app.post("/me/avatar", { preHandler: app.authenticate }, async (request, reply) => {
    const file = await request.file({
      limits: { files: 1, fields: 0, parts: 1, fileSize: MAX_AVATAR_SIZE },
    });
    if (!file || file.fieldname !== "avatar") {
      throw new HttpError(400, "Envie a imagem no campo avatar");
    }

    const bucket = avatarBucket();
    const upload = bucket.openUploadStream(
      `${request.user.sub}.jpg`,
      {
        metadata: {
          contentType: "image/jpeg",
          ownerUserId: request.user.sub,
        },
      },
    );

    try {
      await pipeline(
        file.file,
        validateImageStream(file.mimetype),
        sharp({ failOn: "error", limitInputPixels: 40_000_000 })
          .rotate()
          .resize(320, 320, { fit: "cover", position: "centre" })
          .jpeg({ quality: 86, mozjpeg: true }),
        upload,
      );
    } catch (error) {
      await upload.abort().catch(() => undefined);
      if (
        error instanceof Error &&
        /corrupt|image|input buffer|unsupported|unexpected end/i.test(error.message)
      ) {
        throw new HttpError(400, "Não foi possível processar a imagem enviada");
      }
      throw error;
    }

    const newAvatarFileId = upload.id as Types.ObjectId;
    const user = await UserModel.findByIdAndUpdate(
      request.user.sub,
      {
        $set: { avatarFileId: newAvatarFileId },
        $unset: { avatarUrl: 1 },
      },
      { returnDocument: "before" },
    );
    if (!user) {
      await safelyDelete(bucket, newAvatarFileId);
      throw new HttpError(404, "Usuário não encontrado");
    }

    await safelyDelete(bucket, user.avatarFileId);
    const url = avatarUrl(request.user.sub, newAvatarFileId);
    app.io.emit("account:changed", {
      userId: request.user.sub,
      displayName: user.displayName,
      avatarUrl: url,
      profileFrame: user.profileFrame ?? "status",
      nameEffect: user.nameEffect ?? "default",
    });
    return reply.code(201).send({ avatarUrl: url });
  });

  app.post(
    "/conversations/:conversationId/avatar",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { conversationId } = parseInput(conversationAvatarParamsSchema, request.params);
      const conversation = await ConversationModel.findOne({
        _id: conversationId,
        kind: "group",
        participants: request.user.sub,
      });
      if (!conversation) {
        throw new HttpError(404, "Conversa em grupo não encontrada");
      }

      const file = await request.file({
        limits: { files: 1, fields: 0, parts: 1, fileSize: MAX_AVATAR_SIZE },
      });
      if (!file || file.fieldname !== "avatar") {
        throw new HttpError(400, "Envie a imagem no campo avatar");
      }

      const bucket = avatarBucket();
      const upload = bucket.openUploadStream(
        `group-${conversationId}.jpg`,
        {
          metadata: {
            contentType: "image/jpeg",
            ownerConversationId: conversationId,
          },
        },
      );

      try {
        await pipeline(
          file.file,
          validateImageStream(file.mimetype),
          sharp({ failOn: "error", limitInputPixels: 40_000_000 })
            .rotate()
            .resize(320, 320, { fit: "cover", position: "centre" })
            .jpeg({ quality: 86, mozjpeg: true }),
          upload,
        );
      } catch (error) {
        await upload.abort().catch(() => undefined);
        if (
          error instanceof Error &&
          /corrupt|image|input buffer|unsupported|unexpected end/i.test(error.message)
        ) {
          throw new HttpError(400, "Não foi possível processar a imagem enviada");
        }
        throw error;
      }

      const newAvatarFileId = upload.id as Types.ObjectId;
      const previousAvatarFileId = conversation.avatarFileId;
      conversation.avatarFileId = newAvatarFileId;
      try {
        await conversation.save();
      } catch (error) {
        await safelyDelete(bucket, newAvatarFileId);
        throw error;
      }
      await safelyDelete(bucket, previousAvatarFileId);

      for (const participantId of conversation.participants) {
        app.io.to(`user:${participantId.toString()}`).emit("conversation:changed", {
          conversationId,
        });
      }

      return reply.code(201).send({
        avatarUrl: conversationAvatarUrl(conversationId, newAvatarFileId),
      });
    },
  );

  app.delete("/me/avatar", { preHandler: app.authenticate }, async (request, reply) => {
    const user = await UserModel.findByIdAndUpdate(
      request.user.sub,
      { $unset: { avatarFileId: 1, avatarUrl: 1 } },
      { returnDocument: "before" },
    );
    if (!user) throw new HttpError(404, "Usuário não encontrado");

    await safelyDelete(avatarBucket(), user.avatarFileId);
    app.io.emit("account:changed", {
      userId: request.user.sub,
      displayName: user.displayName,
      avatarUrl: "",
      profileFrame: user.profileFrame ?? "status",
      nameEffect: user.nameEffect ?? "default",
    });
    return reply.code(204).send();
  });
}
