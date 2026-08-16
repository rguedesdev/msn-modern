import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Config } from "../config.js";
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

function publicUser(user: { _id: unknown; email: string; displayName: string }) {
  return {
    id: String(user._id),
    email: user.email,
    displayName: user.displayName,
  };
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
}
