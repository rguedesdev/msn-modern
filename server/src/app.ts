import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import mongoose from "mongoose";
import { ZodError } from "zod";
import type { Config } from "./config.js";
import { HttpError } from "./http.js";
import { configureRealtime } from "./realtime.js";
import { authRoutes } from "./routes/auth.js";
import { conversationRoutes } from "./routes/conversations.js";
import { deviceRoutes } from "./routes/devices.js";
import { e2eeRoutes } from "./routes/e2ee.js";
import { messageRoutes } from "./routes/messages.js";
import { userRoutes } from "./routes/users.js";

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.NODE_ENV !== "test",
    bodyLimit: 2 * 1024 * 1024,
    trustProxy: config.NODE_ENV === "production",
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: false,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(jwt, { secret: config.JWT_SECRET });

  app.decorate("authenticate", async (request) => {
    await request.jwtVerify();
  });
  const io = configureRealtime(app, config);
  app.decorate("io", io);
  app.addHook("onClose", async () => {
    await new Promise<void>((resolve) => io.close(() => resolve()));
  });

  app.get("/health", async (_request, reply) => {
    const databaseConnected = mongoose.connection.readyState === 1;
    return reply.code(databaseConnected ? 200 : 503).send({
      status: databaseConnected ? "ok" : "degraded",
      database: databaseConnected ? "connected" : "disconnected",
    });
  });

  await authRoutes(app, config);
  await userRoutes(app);
  await deviceRoutes(app);
  await e2eeRoutes(app);
  await conversationRoutes(app);
  await messageRoutes(app);

  app.setNotFoundHandler((_request, reply) => {
    void reply.code(404).send({ error: "Rota não encontrada" });
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Dados inválidos",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      const message = "message" in error && typeof error.message === "string"
        ? error.message
        : "Requisição não autorizada";
      return reply.code(error.statusCode).send({ error: message });
    }
    if (isDuplicateKeyError(error)) {
      return reply.code(409).send({ error: "O recurso já existe" });
    }

    request.log.error(error);
    return reply.code(500).send({ error: "Erro interno do servidor" });
  });

  return app;
}
