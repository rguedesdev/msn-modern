import { Schema, model, type Types } from "mongoose";

export interface SignedPreKey {
  keyId: number;
  publicKey: string;
  signature: string;
}

export interface OneTimePreKey {
  keyId: number;
  publicKey: string;
}

export interface Device {
  userId: Types.ObjectId;
  deviceId: string;
  name: string;
  registrationId: number;
  identityKey: string;
  signedPreKey: SignedPreKey;
  oneTimePreKeys: OneTimePreKey[];
  isRevoked: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const signedPreKeySchema = new Schema<SignedPreKey>(
  {
    keyId: { type: Number, required: true },
    publicKey: { type: String, required: true },
    signature: { type: String, required: true },
  },
  { _id: false },
);

const oneTimePreKeySchema = new Schema<OneTimePreKey>(
  {
    keyId: { type: Number, required: true },
    publicKey: { type: String, required: true },
  },
  { _id: false },
);

const deviceSchema = new Schema<Device>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 80 },
    registrationId: { type: Number, required: true },
    identityKey: { type: String, required: true },
    signedPreKey: { type: signedPreKeySchema, required: true },
    oneTimePreKeys: { type: [oneTimePreKeySchema], default: [] },
    isRevoked: { type: Boolean, default: false, index: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const DeviceModel = model<Device>("Device", deviceSchema);
