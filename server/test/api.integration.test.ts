import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { connectDatabase, disconnectDatabase } from "../src/db.js";
import { UserModel } from "../src/models/user.js";

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

    expect(alice.user).toMatchObject({
      ownedProfileFrames: ["aurora", "diamond"],
      ownedNameEffects: ["aurora", "diamond"],
    });
    const testUnlockedAppearance = await app.inject({
      method: "PATCH",
      url: "/me/profile",
      headers: aliceAuth,
      payload: { profileFrame: "diamond", nameEffect: "diamond" },
    });
    expect(testUnlockedAppearance.statusCode).toBe(200);

    const lockedAppearance = await app.inject({
      method: "PATCH",
      url: "/me/profile",
      headers: aliceAuth,
      payload: { profileFrame: "matrix", nameEffect: "gold" },
    });
    expect(lockedAppearance.statusCode).toBe(403);

    await UserModel.findByIdAndUpdate(alice.user.id, {
      $set: {
        ownedProfileFrames: ["matrix"],
        ownedNameEffects: ["gold"],
      },
    });
    const updatedAppearance = await app.inject({
      method: "PATCH",
      url: "/me/profile",
      headers: aliceAuth,
      payload: { profileFrame: "matrix", nameEffect: "gold" },
    });
    expect(updatedAppearance.statusCode).toBe(200);
    expect(updatedAppearance.json().user).toMatchObject({
      profileFrame: "matrix",
      nameEffect: "gold",
      ownedProfileFrames: ["matrix", "aurora", "diamond"],
      ownedNameEffects: ["gold", "aurora", "diamond"],
    });

    const updatedProfile = await app.inject({
      method: "PATCH",
      url: "/me/profile",
      headers: aliceAuth,
      payload: { personalMessage: "Disponível para conversar" },
    });
    expect(updatedProfile.statusCode).toBe(200);
    expect(updatedProfile.json().user.personalMessage).toBe("Disponível para conversar");

    const updatedAccount = await app.inject({
      method: "PATCH",
      url: "/me/profile",
      headers: aliceAuth,
      payload: { displayName: "Alice Silva" },
    });
    expect(updatedAccount.statusCode).toBe(200);
    expect(updatedAccount.json().user).toMatchObject({
      displayName: "Alice Silva",
    });

    const avatarBoundary = "----msn-avatar-integration";
    const invalidAvatarPayload = Buffer.from([
      `--${avatarBoundary}\r\n`,
      'Content-Disposition: form-data; name="avatar"; filename="avatar.png"\r\n',
      "Content-Type: image/png\r\n\r\n",
      "isto nao e uma imagem",
      `\r\n--${avatarBoundary}--\r\n`,
    ].join(""));
    const invalidAvatar = await app.inject({
      method: "POST",
      url: "/me/avatar",
      headers: {
        ...aliceAuth,
        "content-type": `multipart/form-data; boundary=${avatarBoundary}`,
      },
      payload: invalidAvatarPayload,
    });
    expect(invalidAvatar.statusCode).toBe(400);

    const avatarBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const avatarPayload = Buffer.concat([
      Buffer.from(`--${avatarBoundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="avatar"; filename="avatar.png"\r\n'),
      Buffer.from("Content-Type: image/png\r\n\r\n"),
      avatarBytes,
      Buffer.from(`\r\n--${avatarBoundary}--\r\n`),
    ]);
    const uploadedAvatar = await app.inject({
      method: "POST",
      url: "/me/avatar",
      headers: {
        ...aliceAuth,
        "content-type": `multipart/form-data; boundary=${avatarBoundary}`,
      },
      payload: avatarPayload,
    });
    expect(uploadedAvatar.statusCode).toBe(201);
    const avatarUrl = uploadedAvatar.json().avatarUrl as string;
    expect(avatarUrl).toMatch(
      new RegExp(`^/users/${alice.user.id}/avatar\\?v=[a-f\\d]{24}&policy=2$`),
    );

    const downloadedAvatar = await app.inject({ method: "GET", url: avatarUrl });
    expect(downloadedAvatar.statusCode).toBe(200);
    expect(downloadedAvatar.headers["content-type"]).toBe("image/jpeg");
    expect(downloadedAvatar.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(downloadedAvatar.rawPayload.subarray(0, 3)).toEqual(
      Buffer.from([0xff, 0xd8, 0xff]),
    );
    expect(await mongoose.connection.db?.collection("avatars.files").countDocuments({
      "metadata.ownerUserId": alice.user.id,
    })).toBe(1);

    const wrongPassword = await app.inject({
      method: "PATCH",
      url: "/me/password",
      headers: aliceAuth,
      payload: { currentPassword: "senha-incorreta", newPassword: "nova-senha-alice" },
    });
    expect(wrongPassword.statusCode).toBe(400);

    const changedPassword = await app.inject({
      method: "PATCH",
      url: "/me/password",
      headers: aliceAuth,
      payload: { currentPassword: "password-alice", newPassword: "nova-senha-alice" },
    });
    expect(changedPassword.statusCode).toBe(204);

    const loginWithNewPassword = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "alice@example.test", password: "nova-senha-alice" },
    });
    expect(loginWithNewPassword.statusCode).toBe(200);

    const persistedProfile = await app.inject({
      method: "GET",
      url: "/me",
      headers: aliceAuth,
    });
    expect(persistedProfile.json().user.personalMessage).toBe("Disponível para conversar");
    expect(persistedProfile.json().user).toMatchObject({
      displayName: "Alice Silva",
      avatarUrl,
      profileFrame: "matrix",
      nameEffect: "gold",
    });

    const removedAvatar = await app.inject({
      method: "DELETE",
      url: "/me/avatar",
      headers: aliceAuth,
    });
    expect(removedAvatar.statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: avatarUrl })).statusCode).toBe(404);
    expect(await mongoose.connection.db?.collection("avatars.files").countDocuments({
      "metadata.ownerUserId": alice.user.id,
    })).toBe(0);

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
    const webCryptoMessageId = webCryptoMessage.json().message._id as string;

    const deliveredMessage = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/messages/status`,
      headers: bobAuth,
      payload: {
        messageIds: [webCryptoMessageId],
        status: "delivered",
      },
    });
    expect(deliveredMessage.statusCode).toBe(200);
    expect(deliveredMessage.json().statuses[0]).toMatchObject({
      conversationId,
      messageId: webCryptoMessageId,
      readAt: null,
    });
    expect(deliveredMessage.json().statuses[0].deliveredAt).toEqual(expect.any(String));

    const readMessage = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/messages/status`,
      headers: bobAuth,
      payload: {
        messageIds: [webCryptoMessageId],
        status: "read",
      },
    });
    expect(readMessage.statusCode).toBe(200);
    expect(readMessage.json().statuses[0]).toMatchObject({
      conversationId,
      messageId: webCryptoMessageId,
    });
    expect(readMessage.json().statuses[0].readAt).toEqual(expect.any(String));

    const messageHistoryWithStatus = await app.inject({
      method: "GET",
      url: `/conversations/${conversationId}/messages?limit=100`,
      headers: aliceAuth,
    });
    const persistedStatusMessage = messageHistoryWithStatus.json().messages.find(
      (message: { _id: string }) => message._id === webCryptoMessageId,
    );
    expect(persistedStatusMessage).toMatchObject({
      _id: webCryptoMessageId,
    });
    expect(persistedStatusMessage.deliveredAt).toEqual(expect.any(String));
    expect(persistedStatusMessage.readAt).toEqual(expect.any(String));

    const registerCharlie = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "charlie@example.test", displayName: "Charlie", password: "password-charlie" },
    });
    expect(registerCharlie.statusCode).toBe(201);
    const charlie = registerCharlie.json();
    const charlieAuth = { authorization: `Bearer ${charlie.accessToken}` };
    const charlieDeviceId = "66666666-6666-4666-8666-666666666666";
    expect((await app.inject({
      method: "PUT",
      url: `/e2ee/devices/${charlieDeviceId}`,
      headers: charlieAuth,
      payload: {
        algorithm: "ECDH-P256-HKDF-SHA256-AES256GCM",
        publicKey: "BOPAQ1wdO3r3Xv0x4w4E5OWQpH2CX4vC1Mbz9w6vCW2FQqCwB4wvxWqHLO9ol2vG6VI6K7vVK8v6L8J7WZCvQ2M=",
      },
    })).statusCode).toBe(201);

    const aliceCharlieContact = await app.inject({
      method: "POST",
      url: "/conversations/direct",
      headers: aliceAuth,
      payload: { participantUserId: charlie.user.id },
    });
    expect(aliceCharlieContact.statusCode).toBe(201);

    const inviteCharlie = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/participants`,
      headers: aliceAuth,
      payload: { participantUserId: charlie.user.id },
    });
    expect(inviteCharlie.statusCode).toBe(201);

    const groupForCharlie = await app.inject({
      method: "GET",
      url: `/conversations/${conversationId}`,
      headers: charlieAuth,
    });
    expect(groupForCharlie.statusCode).toBe(200);
    expect(groupForCharlie.json().conversation.kind).toBe("group");
    expect(groupForCharlie.json().conversation.participants).toHaveLength(3);

    const oldHistoryForCharlie = await app.inject({
      method: "GET",
      url: `/conversations/${conversationId}/messages?limit=100`,
      headers: charlieAuth,
    });
    expect(oldHistoryForCharlie.statusCode).toBe(200);
    expect(oldHistoryForCharlie.json().messages.every(
      (message: { envelopes: unknown[] }) => message.envelopes.length === 0,
    )).toBe(true);

    const conversationsAfterInvite = await app.inject({
      method: "GET",
      url: "/conversations",
      headers: aliceAuth,
    });
    const aliceConversations = conversationsAfterInvite.json().conversations as Array<{
      _id: string;
      kind: string;
      participants: Array<{ _id: string }>;
    }>;
    expect(aliceConversations.some((item) => item._id === conversationId && item.kind === "group")).toBe(true);
    expect(aliceConversations.some((item) =>
      item.kind === "direct" &&
      item.participants.some((participant) => participant._id === bob.user.id)
    )).toBe(true);

    const groupMessage = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/messages`,
      headers: aliceAuth,
      payload: {
        senderDeviceId: aliceDeviceId,
        clientMessageId: "77777777-7777-4777-8777-777777777777",
        protocol: "webcrypto-p256-v1",
        envelopes: [
          {
            recipientUserId: bob.user.id,
            recipientDeviceId: bobDeviceId,
            type: "prekey",
            payload: ciphertext,
          },
          {
            recipientUserId: charlie.user.id,
            recipientDeviceId: charlieDeviceId,
            type: "prekey",
            payload: ciphertext,
          },
        ],
      },
    });
    expect(groupMessage.statusCode).toBe(201);
    const groupMessageId = groupMessage.json().message._id as string;

    const bobDeliveredGroupMessage = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/messages/status`,
      headers: bobAuth,
      payload: { messageIds: [groupMessageId], status: "delivered" },
    });
    expect(bobDeliveredGroupMessage.json().statuses[0].deliveredAt).toBeNull();

    const charlieDeliveredGroupMessage = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/messages/status`,
      headers: charlieAuth,
      payload: { messageIds: [groupMessageId], status: "delivered" },
    });
    expect(charlieDeliveredGroupMessage.json().statuses[0].deliveredAt).toEqual(expect.any(String));

    const bobReadGroupMessage = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/messages/status`,
      headers: bobAuth,
      payload: { messageIds: [groupMessageId], status: "read" },
    });
    expect(bobReadGroupMessage.json().statuses[0].readAt).toBeNull();

    const charlieReadGroupMessage = await app.inject({
      method: "POST",
      url: `/conversations/${conversationId}/messages/status`,
      headers: charlieAuth,
      payload: { messageIds: [groupMessageId], status: "read" },
    });
    expect(charlieReadGroupMessage.json().statuses[0].readAt).toEqual(expect.any(String));

    const refreshed = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: alice.refreshToken },
    });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().refreshToken).not.toBe(alice.refreshToken);
  });
});
