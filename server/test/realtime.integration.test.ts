import mongoose from "mongoose";
import { io, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { connectDatabase, disconnectDatabase } from "../src/db.js";
import { MessageModel } from "../src/models/message.js";

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

    const message = await MessageModel.create({
      conversationId,
      senderUserId: alice.user.id,
      senderDeviceId: "11111111-1111-4111-8111-111111111111",
      clientMessageId: "55555555-5555-4555-8555-555555555555",
      protocol: "webcrypto-p256-v1",
      envelopes: [{
        recipientUserId: bob.user.id,
        recipientDeviceId: "22222222-2222-4222-8222-222222222222",
        type: "prekey",
        payload: "Y2lwaGVydGV4dA==",
      }],
    });

    const nextStatusEvent = (socket: Socket) =>
      new Promise<{
        conversationId: string;
        messageId: string;
        deliveredAt: string | null;
        readAt: string | null;
      }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Status da mensagem não recebido")), 2_000);
        socket.once("message:status", (status) => {
          clearTimeout(timeout);
          resolve(status);
        });
      });

    const deliveredByBob = nextStatusEvent(aliceSocket);
    const deliveryResponse = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/messages/status`,
      headers: { authorization: `Bearer ${bob.accessToken}` },
      payload: { messageIds: [message._id.toString()], status: "delivered" },
    });
    expect(deliveryResponse.statusCode).toBe(200);
    await expect(deliveredByBob).resolves.toMatchObject({
      conversationId,
      messageId: message._id.toString(),
      deliveredAt: expect.any(String),
      readAt: null,
    });

    const readByBob = nextStatusEvent(aliceSocket);
    const readResponse = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/messages/status`,
      headers: { authorization: `Bearer ${bob.accessToken}` },
      payload: { messageIds: [message._id.toString()], status: "read" },
    });
    expect(readResponse.statusCode).toBe(200);
    await expect(readByBob).resolves.toMatchObject({
      conversationId,
      messageId: message._id.toString(),
      deliveredAt: expect.any(String),
      readAt: expect.any(String),
    });

    const charlie = await register("group-charlie@example.test", "Charlie");
    const charlieSocket = await connect(charlie.accessToken);
    const aliceCharlieContact = await app.inject({
      method: "POST",
      url: "/conversations/direct",
      headers: { authorization: `Bearer ${alice.accessToken}` },
      payload: { participantUserId: charlie.user.id },
    });
    expect(aliceCharlieContact.statusCode).toBe(201);

    const groupChangedForCharlie = new Promise<{ conversationId: string }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Convite do grupo não recebido")), 2_000);
      charlieSocket.once("conversation:changed", (change) => {
        clearTimeout(timeout);
        resolve(change);
      });
    });
    const inviteResponse = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/participants`,
      headers: { authorization: `Bearer ${alice.accessToken}` },
      payload: { participantUserId: charlie.user.id },
    });
    expect(inviteResponse.statusCode).toBe(201);
    await expect(groupChangedForCharlie).resolves.toEqual({ conversationId });
  });
});
