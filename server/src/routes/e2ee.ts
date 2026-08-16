import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { deviceIdSchema, objectIdSchema, opaqueBase64Schema, parseInput } from "../http.js";
import { E2eeDeviceModel } from "../models/e2ee-device.js";

const keySchema = z.object({
  algorithm: z.literal("ECDH-P256-HKDF-SHA256-AES256GCM"),
  publicKey: opaqueBase64Schema.max(1024),
});

export async function e2eeRoutes(app: FastifyInstance): Promise<void> {
  app.put(
    "/e2ee/devices/:deviceId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { deviceId } = parseInput(z.object({ deviceId: deviceIdSchema }), request.params);
      const input = parseInput(keySchema, request.body);
      const existing = await E2eeDeviceModel.findOne({ userId: request.user.sub, deviceId });
      const key = await E2eeDeviceModel.findOneAndUpdate(
        { userId: request.user.sub, deviceId },
        { $set: { ...input, lastSeenAt: new Date() }, $setOnInsert: { userId: request.user.sub, deviceId } },
        { upsert: true, returnDocument: "after", runValidators: true },
      );
      return reply.code(existing ? 200 : 201).send({ key });
    },
  );

  app.get(
    "/e2ee/users/:userId/keys",
    { preHandler: app.authenticate },
    async (request) => {
      const { userId } = parseInput(z.object({ userId: objectIdSchema }), request.params);
      const keys = await E2eeDeviceModel.find({ userId })
        .select("deviceId algorithm publicKey -_id")
        .lean();
      return { userId, keys };
    },
  );
}
