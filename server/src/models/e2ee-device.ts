import { Schema, model, type Types } from "mongoose";

export interface E2eeDevice {
  userId: Types.ObjectId;
  deviceId: string;
  algorithm: "ECDH-P256-HKDF-SHA256-AES256GCM";
  publicKey: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const e2eeDeviceSchema = new Schema<E2eeDevice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceId: { type: String, required: true },
    algorithm: {
      type: String,
      enum: ["ECDH-P256-HKDF-SHA256-AES256GCM"],
      required: true,
    },
    publicKey: { type: String, required: true },
    lastSeenAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true },
);

e2eeDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const E2eeDeviceModel = model<E2eeDevice>("E2eeDevice", e2eeDeviceSchema);
