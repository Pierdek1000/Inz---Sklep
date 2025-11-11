import mongoose, { Schema, Document } from "mongoose";

export interface IChatPenalty extends Document {
  userId: string;
  type: "ban" | "timeout";
  until?: Date; // null for permanent ban; set for timeout
  createdBy: string; // userId of moderator
  createdAt: Date;
}

const chatPenaltySchema = new Schema<IChatPenalty>(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ["ban", "timeout"] },
    until: { type: Date, default: null },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Compound index for fast lookup
chatPenaltySchema.index({ userId: 1, type: 1 });

export const ChatPenalty = mongoose.model<IChatPenalty>("ChatPenalty", chatPenaltySchema);
