import mongoose, { Schema, Model, Types } from "mongoose";

export interface IReview {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  orderId?: Types.ObjectId | null;
  authorName: string;
  rating: number;
  title?: string;
  body: string;
  /** Set only when the reviewer has a paid order containing this product. */
  verifiedPurchase: boolean;
  status: "pending" | "approved" | "rejected";
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    authorName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true },
    body: { type: String, required: true, trim: true },
    verifiedPurchase: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    helpfulCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
// One review per customer per product.
ReviewSchema.index(
  { productId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } }
);

export const Review: Model<IReview> =
  (mongoose.models.Review as Model<IReview>) ||
  mongoose.model<IReview>("Review", ReviewSchema);
