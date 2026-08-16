import { Schema, model, type Types } from "mongoose";
import {
  PROFILE_STYLE_KEYS,
  type NameEffect,
  type ProfileFrame,
  type ProfileStyleKey,
} from "../domain/profile-style.js";

export interface User {
  email: string;
  displayName: string;
  personalMessage: string;
  avatarFileId?: Types.ObjectId;
  profileFrame: ProfileFrame;
  nameEffect: NameEffect;
  ownedProfileFrames: ProfileStyleKey[];
  ownedNameEffects: ProfileStyleKey[];
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    personalMessage: { type: String, default: "", trim: true, maxlength: 160 },
    avatarFileId: { type: Schema.Types.ObjectId },
    profileFrame: {
      type: String,
      enum: ["status", ...PROFILE_STYLE_KEYS],
      default: "status",
    },
    nameEffect: {
      type: String,
      enum: ["default", ...PROFILE_STYLE_KEYS],
      default: "default",
    },
    ownedProfileFrames: [{ type: String, enum: PROFILE_STYLE_KEYS }],
    ownedNameEffects: [{ type: String, enum: PROFILE_STYLE_KEYS }],
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

export const UserModel = model<User>("User", userSchema);
