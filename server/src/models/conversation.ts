import { Schema, model, type Types } from "mongoose";

export interface Conversation {
  kind: "direct";
  participants: Types.ObjectId[];
  directKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<Conversation>(
  {
    kind: { type: String, enum: ["direct"], default: "direct", required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    directKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

export const ConversationModel = model<Conversation>("Conversation", conversationSchema);
