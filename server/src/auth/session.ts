import type { FastifyInstance } from "fastify";
import type { Types } from "mongoose";
import type { Config } from "../config.js";
import { createRefreshToken, hashRefreshToken } from "../domain/identifiers.js";
import { SessionModel } from "../models/session.js";

export async function issueSession(
  app: FastifyInstance,
  config: Config,
  userId: Types.ObjectId,
) {
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(
    Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000,
  );

  await SessionModel.create({
    userId,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt,
  });

  return {
    accessToken: app.jwt.sign(
      { sub: userId.toString() },
      { expiresIn: config.ACCESS_TOKEN_TTL_SECONDS },
    ),
    refreshToken,
    expiresIn: config.ACCESS_TOKEN_TTL_SECONDS,
  };
}
