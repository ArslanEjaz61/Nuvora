import mongoose, { Schema, Model, Types } from "mongoose";

export type CouponType = "percent" | "fixed" | "free_shipping";

export interface ICoupon {
  _id: Types.ObjectId;
  code: string;
  description?: string;
  type: CouponType;
  /** percent: 1-100. fixed: integer cents off. free_shipping: ignored. */
  value: number;
  minSubtotal: number;
  maxRedemptions?: number | null;
  redemptionCount: number;
  perCustomerLimit: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  active: boolean;
  appliesTo: {
    collections: Types.ObjectId[];
    products: Types.ObjectId[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: String,
    type: {
      type: String,
      enum: ["percent", "fixed", "free_shipping"],
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    maxRedemptions: { type: Number, default: null },
    redemptionCount: { type: Number, default: 0, min: 0 },
    perCustomerLimit: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
    appliesTo: {
      collections: [{ type: Schema.Types.ObjectId, ref: "Collection" }],
      products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    },
  },
  { timestamps: true }
);

export const Coupon: Model<ICoupon> =
  (mongoose.models.Coupon as Model<ICoupon>) ||
  mongoose.model<ICoupon>("Coupon", CouponSchema);
