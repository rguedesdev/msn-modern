import { Schema, model, type Types } from "mongoose";

export interface Session {
  userId: Types.ObjectId;
  refreshTokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const sessionSchema = new Schema<Session>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const SessionModel = model<Session>("Session", sessionSchema);
