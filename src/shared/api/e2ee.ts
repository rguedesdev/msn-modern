import { apiRequest } from "./client";

const ALGORITHM = "ECDH-P256-HKDF-SHA256-AES256GCM" as const;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface StoredDeviceIdentity {
  deviceId: string;
  privateKey: JsonWebKey;
  publicKey: string;
}

export interface PublicDeviceKey {
  deviceId: string;
  algorithm: typeof ALGORITHM;
  publicKey: string;
}

export interface EncryptedEnvelope {
  recipientUserId: string;
  recipientDeviceId: string;
  type: "prekey";
  payload: string;
}

interface CipherPayload {
  ephemeralPublicKey: string;
  salt: string;
  iv: string;
  ciphertext: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function identityStorageKey(userId: string): string {
  return `msn-modern:e2ee-device:${userId}`;
}

async function getOrCreateIdentity(userId: string): Promise<StoredDeviceIdentity> {
  const stored = localStorage.getItem(identityStorageKey(userId));
  if (stored) return JSON.parse(stored) as StoredDeviceIdentity;

  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const identity: StoredDeviceIdentity = {
    deviceId: crypto.randomUUID(),
    privateKey: await crypto.subtle.exportKey("jwk", pair.privateKey),
    publicKey: bytesToBase64(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey))),
  };
  localStorage.setItem(identityStorageKey(userId), JSON.stringify(identity));
  return identity;
}

export async function registerCurrentDevice(userId: string): Promise<StoredDeviceIdentity> {
  const identity = await getOrCreateIdentity(userId);
  await apiRequest(`/e2ee/devices/${identity.deviceId}`, {
    method: "PUT",
    body: JSON.stringify({ algorithm: ALGORITHM, publicKey: identity.publicKey }),
  });
  return identity;
}

export async function listPublicKeys(userId: string): Promise<PublicDeviceKey[]> {
  const response = await apiRequest<{ keys: PublicDeviceKey[] }>(`/e2ee/users/${userId}/keys`);
  return response.keys;
}

async function deriveAesKey(
  privateKey: CryptoKey,
  publicKeyBytes: Uint8Array<ArrayBuffer>,
  salt: Uint8Array<ArrayBuffer>,
  conversationId: string,
  deviceId: string,
): Promise<CryptoKey> {
  const publicKey = await crypto.subtle.importKey(
    "raw",
    publicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const sharedSecret = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const hkdfKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode(`msn-modern:${conversationId}:${deviceId}`) },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptForDevice(
  text: string,
  conversationId: string,
  recipientUserId: string,
  recipient: PublicDeviceKey,
): Promise<EncryptedEnvelope> {
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesKey(ephemeral.privateKey, base64ToBytes(recipient.publicKey), salt, conversationId, recipient.deviceId);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoder.encode(text));
  const payload: CipherPayload = {
    ephemeralPublicKey: bytesToBase64(new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey))),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
  return {
    recipientUserId,
    recipientDeviceId: recipient.deviceId,
    type: "prekey",
    payload: bytesToBase64(encoder.encode(JSON.stringify(payload))),
  };
}

export async function decryptEnvelope(userId: string, conversationId: string, payloadBase64: string): Promise<string> {
  const identity = await getOrCreateIdentity(userId);
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    identity.privateKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  );
  const payload = JSON.parse(decoder.decode(base64ToBytes(payloadBase64))) as CipherPayload;
  const aesKey = await deriveAesKey(
    privateKey,
    base64ToBytes(payload.ephemeralPublicKey),
    base64ToBytes(payload.salt),
    conversationId,
    identity.deviceId,
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    aesKey,
    base64ToBytes(payload.ciphertext),
  );
  return decoder.decode(plaintext);
}
