import mongoose from "mongoose";
import { io, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { connectDatabase, disconnectDatabase } from "../src/db.js";

const mongodbUri = process.env.MONGODB_URI;

describe("eventos em tempo real", () => {
  const config = loadConfig({
    NODE_ENV: "test",
    MONGODB_URI: mongodbUri,
    JWT_SECRET: "realtime-test-secret-with-at-least-32-characters",
  });
  let app: Awaited<ReturnType<typeof buildApp>>;
  let baseUrl = "";
  const sockets: Socket[] = [];

  beforeAll(async () => {
    await connectDatabase(config.MONGODB_URI);
    app = await buildApp(config);
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Servidor de teste indisponível");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
    const databaseName = mongoose.connection.db?.databaseName;
    if (databaseName?.endsWith("-test")) await mongoose.connection.db?.dropDatabase();
    if (app) await app.close();
    await disconnectDatabase();
  });

  it("entrega o indicador de digitação ao outro participante", async () => {
    const register = async (email: string, displayName: string) => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email, displayName, password: "password-123" },
      });
      expect(response.statusCode).toBe(201);
      return response.json();
    };
    const alice = await register("typing-alice@example.test", "Alice");
    const bob = await register("typing-bob@example.test", "Bob");
    const conversationResponse = await app.inject({
      method: "POST",
      url: "/conversations/direct",
      headers: { authorization: `Bearer ${alice.accessToken}` },
      payload: { participantUserId: bob.user.id },
    });
    const conversationId = conversationResponse.json().conversation._id as string;

    const connect = (token: string) => new Promise<Socket>((resolve, reject) => {
      const socket = io(baseUrl, { auth: { token }, transports: ["websocket"] });
      sockets.push(socket);
      socket.once("connect", () => resolve(socket));
      socket.once("connect_error", reject);
    });
    const [aliceSocket, bobSocket] = await Promise.all([
      connect(alice.accessToken),
      connect(bob.accessToken),
    ]);

    const nextTypingEvent = (socket: Socket) =>
      new Promise<{ conversationId: string; userId: string; isTyping: boolean }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Evento de digitação não recebido")), 2_000);
        socket.once("typing:changed", (typing) => {
          clearTimeout(timeout);
          resolve(typing);
        });
      });

    const receivedByBob = nextTypingEvent(bobSocket);
    const aliceTyping = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/typing`,
      headers: { authorization: `Bearer ${alice.accessToken}` },
      payload: { isTyping: true },
    });
    expect(aliceTyping.statusCode).toBe(204);

    await expect(receivedByBob).resolves.toEqual({
      conversationId,
      userId: alice.user.id,
      isTyping: true,
    });

    const receivedByAlice = nextTypingEvent(aliceSocket);
    const bobTyping = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/typing`,
      headers: { authorization: `Bearer ${bob.accessToken}` },
      payload: { isTyping: true },
    });
    expect(bobTyping.statusCode).toBe(204);
    await expect(receivedByAlice).resolves.toEqual({
      conversationId,
      userId: bob.user.id,
      isTyping: true,
    });
  });
});
