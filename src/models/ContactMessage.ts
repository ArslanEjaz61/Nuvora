import mongoose, { Schema, Model, Types } from "mongoose";

export type ContactMessageStatus = "new" | "read" | "replied";

export interface IContactMessage {
  _id: Types.ObjectId;
  name: string;
  email: string;
  orderNumber?: string;
  subject: string;
  /** Stored as plain text — markup is stripped before it ever reaches the DB. */
  message: string;
  status: ContactMessageStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    orderNumber: { type: String, trim: true, uppercase: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

ContactMessageSchema.index({ status: 1, createdAt: -1 });

export const ContactMessage: Model<IContactMessage> =
  (mongoose.models.ContactMessage as Model<IContactMessage>) ||
  mongoose.model<IContactMessage>("ContactMessage", ContactMessageSchema);
