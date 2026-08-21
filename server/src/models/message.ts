import { Schema, model, type Types } from "mongoose";

export type EncryptedMessageType = "prekey" | "ratchet";

export interface EncryptedEnvelope {
  recipientUserId: Types.ObjectId;
  recipientDeviceId: string;
  type: EncryptedMessageType;
  payload: string;
}

export interface Message {
  conversationId: Types.ObjectId;
  senderUserId: Types.ObjectId;
  senderDeviceId: string;
  clientMessageId: string;
  protocol: "signal-v1" | "webcrypto-p256-v1";
  envelopes: EncryptedEnvelope[];
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

const envelopeSchema = new Schema<EncryptedEnvelope>(
  {
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientDeviceId: { type: String, required: true },
    type: { type: String, enum: ["prekey", "ratchet"], required: true },
    payload: { type: String, required: true },
  },
  { _id: false },
);

const messageSchema = new Schema<Message>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderDeviceId: { type: String, required: true },
    clientMessageId: { type: String, required: true },
    protocol: { type: String, enum: ["signal-v1", "webcrypto-p256-v1"], required: true },
    envelopes: { type: [envelopeSchema], required: true },
    sentAt: { type: Date, default: Date.now, required: true },
    deliveredAt: { type: Date },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

messageSchema.index({ conversationId: 1, _id: -1 });
messageSchema.index(
  { senderUserId: 1, senderDeviceId: 1, clientMessageId: 1 },
  { unique: true },
);

export const MessageModel = model<Message>("Message", messageSchema);
