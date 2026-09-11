import mongoose, { Schema, Model, Types } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  quantity: number;
  addedAt: Date;
}

export interface ICart {
  _id: Types.ObjectId;
  /** Anonymous carts key off a signed cookie token; logged-in carts off userId. */
  token: string;
  userId?: Types.ObjectId | null;
  items: ICartItem[];
  couponCode?: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CartSchema = new Schema<ICart>(
  {
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    items: { type: [CartItemSchema], default: [] },
    couponCode: { type: String, default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// TTL index — Mongo reaps abandoned carts 30 days after last touch.
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Cart: Model<ICart> =
  (mongoose.models.Cart as Model<ICart>) || mongoose.model<ICart>("Cart", CartSchema);
