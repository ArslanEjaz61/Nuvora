import mongoose, { Schema, Model, Types } from "mongoose";

export interface ISubscriber {
  _id: Types.ObjectId;
  email: string;
  source: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriberSchema = new Schema<ISubscriber>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    source: { type: String, default: "footer" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Subscriber: Model<ISubscriber> =
  (mongoose.models.Subscriber as Model<ISubscriber>) ||
  mongoose.model<ISubscriber>("Subscriber", SubscriberSchema);
