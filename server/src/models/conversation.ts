import { Schema, model, type Types } from "mongoose";

export interface Conversation {
  kind: "direct" | "group";
  participants: Types.ObjectId[];
  directKey: string;
  name?: string;
  avatarFileId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<Conversation>(
  {
    kind: { type: String, enum: ["direct", "group"], default: "direct", required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    directKey: { type: String, required: true, unique: true },
    name: { type: String, trim: true, maxlength: 80 },
    avatarFileId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

export const ConversationModel = model<Conversation>("Conversation", conversationSchema);
