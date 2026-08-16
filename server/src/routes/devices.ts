import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { deviceIdSchema, HttpError, objectIdSchema, opaqueBase64Schema, parseInput } from "../http.js";
import { DeviceModel } from "../models/device.js";
import { UserModel } from "../models/user.js";

const keyIdSchema = z.number().int().nonnegative();
const signedPreKeySchema = z.object({
  keyId: keyIdSchema,
  publicKey: opaqueBase64Schema.max(16_384),
  signature: opaqueBase64Schema.max(16_384),
});
const oneTimePreKeySchema = z.object({
  keyId: keyIdSchema,
  publicKey: opaqueBase64Schema.max(16_384),
});
const oneTimePreKeysSchema = z
  .array(oneTimePreKeySchema)
  .max(200)
  .refine(
    (keys) => new Set(keys.map((key) => key.keyId)).size === keys.length,
    "Os identificadores das one-time prekeys devem ser únicos",
  );
const deviceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  registrationId: z.number().int().nonnegative().max(16_777_215),
  identityKey: opaqueBase64Schema.max(16_384),
  signedPreKey: signedPreKeySchema,
  oneTimePreKeys: oneTimePreKeysSchema,
});
const replenishSchema = z.object({
  signedPreKey: signedPreKeySchema.optional(),
  oneTimePreKeys: oneTimePreKeysSchema.refine((keys) => keys.length > 0, "Envie ao menos uma prekey"),
});

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  app.put(
    "/devices/:deviceId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { deviceId } = parseInput(z.object({ deviceId: deviceIdSchema }), request.params);
      const input = parseInput(deviceSchema, request.body);
      const existing = await DeviceModel.findOne({ userId: request.user.sub, deviceId });

      if (
        existing &&
        (existing.identityKey !== input.identityKey || existing.registrationId !== input.registrationId)
      ) {
        throw new HttpError(409, "A identidade criptográfica de um dispositivo não pode ser substituída");
      }

      const device = existing
        ? await DeviceModel.findByIdAndUpdate(
            existing._id,
            { ...input, isRevoked: false, lastSeenAt: new Date() },
            { returnDocument: "after", runValidators: true },
          )
        : await DeviceModel.create({
            ...input,
            userId: request.user.sub,
            deviceId,
            isRevoked: false,
          });

      return reply.code(existing ? 200 : 201).send({ device });
    },
  );

  app.post(
    "/devices/:deviceId/prekeys",
    { preHandler: app.authenticate },
    async (request) => {
      const { deviceId } = parseInput(z.object({ deviceId: deviceIdSchema }), request.params);
      const input = parseInput(replenishSchema, request.body);
      const update: Record<string, unknown> = {
        $addToSet: { oneTimePreKeys: { $each: input.oneTimePreKeys } },
        $set: { lastSeenAt: new Date() },
      };
      if (input.signedPreKey) {
        (update.$set as Record<string, unknown>).signedPreKey = input.signedPreKey;
      }

      const device = await DeviceModel.findOneAndUpdate(
        {
          userId: request.user.sub,
          deviceId,
          isRevoked: false,
          "oneTimePreKeys.keyId": { $nin: input.oneTimePreKeys.map((key) => key.keyId) },
        },
        update,
        { returnDocument: "after", runValidators: true },
      );
      if (!device) {
        const exists = await DeviceModel.exists({ userId: request.user.sub, deviceId, isRevoked: false });
        if (exists) throw new HttpError(409, "Uma one-time prekey com este identificador já existe");
        throw new HttpError(404, "Dispositivo não encontrado");
      }
      return { device };
    },
  );

  app.delete(
    "/devices/:deviceId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { deviceId } = parseInput(z.object({ deviceId: deviceIdSchema }), request.params);
      const result = await DeviceModel.updateOne(
        { userId: request.user.sub, deviceId },
        { $set: { isRevoked: true }, $unset: { oneTimePreKeys: 1 } },
      );
      if (!result.matchedCount) throw new HttpError(404, "Dispositivo não encontrado");
      return reply.code(204).send();
    },
  );

  app.post(
    "/users/:userId/key-bundles",
    { preHandler: app.authenticate },
    async (request) => {
      const { userId } = parseInput(z.object({ userId: objectIdSchema }), request.params);
      if (!(await UserModel.exists({ _id: userId }))) {
        throw new HttpError(404, "Usuário não encontrado");
      }

      const deviceIds = await DeviceModel.find({ userId, isRevoked: false }).distinct("_id");
      const bundles = await Promise.all(
        deviceIds.map(async (_id) => {
          // Returning the document before the update lets us atomically claim its first OPK.
          const device = await DeviceModel.findOneAndUpdate(
            { _id, isRevoked: false },
            { $pop: { oneTimePreKeys: -1 }, $set: { lastSeenAt: new Date() } },
            { returnDocument: "before" },
          );
          if (!device) return null;
          return {
            deviceId: device.deviceId,
            registrationId: device.registrationId,
            identityKey: device.identityKey,
            signedPreKey: device.signedPreKey,
            oneTimePreKey: device.oneTimePreKeys[0] ?? null,
          };
        }),
      );

      return { userId, bundles: bundles.filter((bundle) => bundle !== null) };
    },
  );
}
