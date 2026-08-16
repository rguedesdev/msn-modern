import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { connectDatabase, disconnectDatabase } from "../src/db.js";

const mongodbUri = process.env.MONGODB_URI;

describe("API com MongoDB", () => {
  const config = loadConfig({
    NODE_ENV: "test",
    MONGODB_URI: mongodbUri,
    JWT_SECRET: "integration-test-secret-with-at-least-32-characters",
  });
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await connectDatabase(config.MONGODB_URI);
    app = await buildApp(config);
    await app.ready();
  });

  afterAll(async () => {
    const databaseName = mongoose.connection.db?.databaseName;
    if (databaseName?.endsWith("-test")) {
      await mongoose.connection.db?.dropDatabase();
    }
    if (app) await app.close();
    await disconnectDatabase();
  });

  it("autentica, distribui uma prekey e transporta somente ciphertext", async () => {
    const e2eePreflight = await app.inject({
      method: "OPTIONS",
      url: "/e2ee/devices/11111111-1111-4111-8111-111111111111",
      headers: {
        origin: "http://localhost:1420",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "authorization,content-type",
      },
    });
    expect(e2eePreflight.statusCode).toBe(204);
    expect(e2eePreflight.headers["access-control-allow-methods"]).toContain("PUT");

    const registerAlice = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "alice@example.test", displayName: "Alice", password: "password-alice" },
    });
    const registerBob = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "bob@example.test", displayName: "Bob", password: "password-bob-1" },
    });
    expect(registerAlice.statusCode).toBe(201);
    expect(registerBob.statusCode).toBe(201);

    const alice = registerAlice.json();
    const bob = registerBob.json();
    const aliceAuth = { authorization: `Bearer ${alice.accessToken}` };
    const bobAuth = { authorization: `Bearer ${bob.accessToken}` };
    const aliceDeviceId = "11111111-1111-4111-8111-111111111111";
    const bobDeviceId = "22222222-2222-4222-8222-222222222222";
    const publicBundle = (name: string) => ({
      name,
      registrationId: 1,
      identityKey: "aWRlbnRpdHkta2V5",
      signedPreKey: { keyId: 1, publicKey: "c2lnbmVkLXByZWtleQ==", signature: "c2lnbmF0dXJl" },
      oneTimePreKeys: [{ keyId: 7, publicKey: "b25lLXRpbWUta2V5" }],
    });

    expect((await app.inject({
      method: "PUT",
      url: `/devices/${aliceDeviceId}`,
      headers: aliceAuth,
      payload: publicBundle("Alice desktop"),
    })).statusCode).toBe(201);
    expect((await app.inject({
      method: "PUT",
      url: `/devices/${bobDeviceId}`,
      headers: bobAuth,
      payload: publicBundle("Bob desktop"),
    })).statusCode).toBe(201);

    const firstBundle = await app.inject({
      method: "POST",
      url: `/users/${bob.user.id}/key-bundles`,
      headers: aliceAuth,
    });
    const secondBundle = await app.inject({
      method: "POST",
      url: `/users/${bob.user.id}/key-bundles`,
      headers: aliceAuth,
    });
    expect(firstBundle.json().bundles[0].oneTimePreKey.keyId).toBe(7);
    expect(secondBundle.json().bundles[0].oneTimePreKey).toBeNull();

    const conversationResponse = await app.inject({
      method: "POST",
      url: "/conversations/direct",
      headers: aliceAuth,
      payload: { participantUserId: bob.user.id },
    });
    expect(conversationResponse.statusCode).toBe(201);
    const conversationId = conversationResponse.json().conversation._id;
    const ciphertext = "Y2lwaGVydGV4dC1ub3QtcGxhaW50ZXh0";

    const sendResponse = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/messages`,
      headers: aliceAuth,
      payload: {
        senderDeviceId: aliceDeviceId,
        clientMessageId: "33333333-3333-4333-8333-333333333333",
        protocol: "signal-v1",
        envelopes: [{
          recipientUserId: bob.user.id,
          recipientDeviceId: bobDeviceId,
          type: "prekey",
          payload: ciphertext,
        }],
      },
    });
    expect(sendResponse.statusCode).toBe(201);
    expect(sendResponse.json().message.envelopes).toEqual([]);
    expect(JSON.stringify(sendResponse.json())).not.toContain("plaintext");

    const history = await app.inject({
      method: "GET",
      url: `/conversations/${conversationId}/messages`,
      headers: bobAuth,
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().messages[0].envelopes[0].payload).toBe(ciphertext);

    expect((await app.inject({
      method: "PUT",
      url: `/e2ee/devices/${aliceDeviceId}`,
      headers: aliceAuth,
      payload: {
        algorithm: "ECDH-P256-HKDF-SHA256-AES256GCM",
        publicKey: "BOPAQ1wdO3r3Xv0x4w4E5OWQpH2CX4vC1Mbz9w6vCW2FQqCwB4wvxWqHLO9ol2vG6VI6K7vVK8v6L8J7WZCvQ2M=",
      },
    })).statusCode).toBe(201);
    expect((await app.inject({
      method: "PUT",
      url: `/e2ee/devices/${bobDeviceId}`,
      headers: bobAuth,
      payload: {
        algorithm: "ECDH-P256-HKDF-SHA256-AES256GCM",
        publicKey: "BOPAQ1wdO3r3Xv0x4w4E5OWQpH2CX4vC1Mbz9w6vCW2FQqCwB4wvxWqHLO9ol2vG6VI6K7vVK8v6L8J7WZCvQ2M=",
      },
    })).statusCode).toBe(201);

    const webCryptoMessage = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/messages`,
      headers: aliceAuth,
      payload: {
        senderDeviceId: aliceDeviceId,
        clientMessageId: "44444444-4444-4444-8444-444444444444",
        protocol: "webcrypto-p256-v1",
        envelopes: [{
          recipientUserId: bob.user.id,
          recipientDeviceId: bobDeviceId,
          type: "prekey",
          payload: ciphertext,
        }],
      },
    });
    expect(webCryptoMessage.statusCode).toBe(201);
    expect(JSON.stringify(webCryptoMessage.json())).not.toContain("plaintext");

    const refreshed = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: alice.refreshToken },
    });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().refreshToken).not.toBe(alice.refreshToken);
  });
});
