import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Config } from "../config.js";
import {
  PROFILE_STYLE_KEYS,
  TEST_UNLOCKED_PROFILE_STYLE_KEYS,
  type ProfileStyleKey,
} from "../domain/profile-style.js";
import { hashRefreshToken } from "../domain/identifiers.js";
import { HttpError, parseInput } from "../http.js";
import { SessionModel } from "../models/session.js";
import { UserModel } from "../models/user.js";
import { issueSession } from "../auth/session.js";

const credentialsSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(10).max(128),
});

const registerSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(1).max(80),
});

const refreshSchema = z.object({ refreshToken: z.string().min(32).max(512) });
const profileSchema = z.object({
  personalMessage: z.string().trim().max(160).optional(),
  displayName: z.string().trim().min(1).max(80).optional(),
  profileFrame: z.enum(["status", ...PROFILE_STYLE_KEYS]).optional(),
  nameEffect: z.enum(["default", ...PROFILE_STYLE_KEYS]).optional(),
}).refine((input) => Object.keys(input).length > 0, {
  message: "Informe ao menos uma alteração",
});
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(10).max(128),
}).refine((input) => input.currentPassword !== input.newPassword, {
  path: ["newPassword"],
  message: "A nova senha deve ser diferente da senha atual",
});

function publicUser(user: {
  _id: unknown;
  email: string;
  displayName: string;
  personalMessage?: string;
  avatarFileId?: { toString(): string };
  profileFrame?: string;
  nameEffect?: string;
  ownedProfileFrames?: string[];
  ownedNameEffects?: string[];
}) {
  const userId = String(user._id);
  const ownedProfileFrames = Array.from(new Set([
    ...(user.ownedProfileFrames ?? []),
    ...TEST_UNLOCKED_PROFILE_STYLE_KEYS,
  ]));
  const ownedNameEffects = Array.from(new Set([
    ...(user.ownedNameEffects ?? []),
    ...TEST_UNLOCKED_PROFILE_STYLE_KEYS,
  ]));
  return {
    id: userId,
    email: user.email,
    displayName: user.displayName,
    personalMessage: user.personalMessage ?? "",
    avatarUrl: user.avatarFileId
      ? `/users/${userId}/avatar?v=${user.avatarFileId.toString()}&policy=2`
      : "",
    profileFrame: user.profileFrame ?? "status",
    nameEffect: user.nameEffect ?? "default",
    ownedProfileFrames,
    ownedNameEffects,
  };
}

function hasStyleAccess(ownedStyles: readonly string[], style: ProfileStyleKey): boolean {
  return ownedStyles.includes(style) || TEST_UNLOCKED_PROFILE_STYLE_KEYS.includes(style);
}

export async function authRoutes(app: FastifyInstance, config: Config): Promise<void> {
  app.post("/auth/register", async (request, reply) => {
    const input = parseInput(registerSchema, request.body);

    if (await UserModel.exists({ email: input.email })) {
      throw new HttpError(409, "Já existe uma conta com este e-mail");
    }

    const user = await UserModel.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }),
    });
    const tokens = await issueSession(app, config, user._id);

    return reply.code(201).send({ user: publicUser(user), ...tokens });
  });

  app.post("/auth/login", async (request) => {
    const input = parseInput(credentialsSchema, request.body);
    const user = await UserModel.findOne({ email: input.email }).select("+passwordHash");

    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new HttpError(401, "E-mail ou senha inválidos");
    }

    return { user: publicUser(user), ...(await issueSession(app, config, user._id)) };
  });

  app.post("/auth/refresh", async (request) => {
    const { refreshToken } = parseInput(refreshSchema, request.body);
    const session = await SessionModel.findOneAndDelete({
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new HttpError(401, "Sessão inválida ou expirada");
    }

    return issueSession(app, config, session.userId);
  });

  app.post("/auth/logout", async (request, reply) => {
    const { refreshToken } = parseInput(refreshSchema, request.body);
    await SessionModel.deleteOne({ refreshTokenHash: hashRefreshToken(refreshToken) });
    return reply.code(204).send();
  });

  app.get("/me", { preHandler: app.authenticate }, async (request) => {
    const user = await UserModel.findById(request.user.sub);
    if (!user) throw new HttpError(404, "Usuário não encontrado");
    return { user: publicUser(user) };
  });

  app.patch("/me/profile", { preHandler: app.authenticate }, async (request) => {
    const input = parseInput(profileSchema, request.body);
    const user = await UserModel.findById(request.user.sub);
    if (!user) throw new HttpError(404, "Usuário não encontrado");
    if (
      input.profileFrame &&
      input.profileFrame !== "status" &&
      !hasStyleAccess(user.ownedProfileFrames ?? [], input.profileFrame)
    ) {
      throw new HttpError(403, "Esta moldura ainda não foi adquirida");
    }
    if (
      input.nameEffect &&
      input.nameEffect !== "default" &&
      !hasStyleAccess(user.ownedNameEffects ?? [], input.nameEffect)
    ) {
      throw new HttpError(403, "Este estilo de nome ainda não foi adquirido");
    }
    user.set(input);
    await user.save();
    app.io.emit("account:changed", {
      userId: user._id.toString(),
      displayName: user.displayName,
      avatarUrl: user.avatarFileId
        ? `/users/${user._id.toString()}/avatar?v=${user.avatarFileId.toString()}&policy=2`
        : "",
      profileFrame: user.profileFrame,
      nameEffect: user.nameEffect,
    });
    return { user: publicUser(user) };
  });

  app.patch("/me/password", { preHandler: app.authenticate }, async (request, reply) => {
    const input = parseInput(passwordChangeSchema, request.body);
    const user = await UserModel.findById(request.user.sub).select("+passwordHash");
    if (!user) throw new HttpError(404, "Usuário não encontrado");
    if (!(await argon2.verify(user.passwordHash, input.currentPassword))) {
      throw new HttpError(400, "A senha atual está incorreta");
    }

    user.passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
    await user.save();
    return reply.code(204).send();
  });
}
