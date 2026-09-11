import mongoose, { Schema, Model, Types } from "mongoose";
import { AddressSchema, IAddress } from "./User";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded" | "expired";

export interface IOrderItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  title: string;
  variantTitle: string;
  sku: string;
  image?: string;
  slug: string;
  /** Unit price in integer cents, snapshotted server-side at checkout. */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface IOrderEvent {
  status: string;
  note?: string;
  at: Date;
}

export interface IOrder {
  _id: Types.ObjectId;
  orderNumber: string;
  userId?: Types.ObjectId | null;
  email: string;
  items: IOrderItem[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  couponCode?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  shippingAddress?: IAddress;
  billingAddress?: IAddress;
  fulfillment?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
  };
  timeline: IOrderEvent[];
  customerNote?: string;
  inventoryApplied: boolean;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    title: { type: String, required: true },
    variantTitle: { type: String, default: "" },
    sku: { type: String, required: true },
    image: String,
    slug: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    shippingTotal: { type: Number, default: 0, min: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    couponCode: String,
    status: {
      type: String,
      enum: ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded", "expired"],
      default: "unpaid",
      index: true,
    },
    // Sparse + unique: guards against a replayed webhook creating a second order.
    stripeSessionId: { type: String, index: true, sparse: true, unique: true },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    shippingAddress: AddressSchema,
    billingAddress: AddressSchema,
    fulfillment: {
      carrier: String,
      trackingNumber: String,
      trackingUrl: String,
      shippedAt: Date,
      deliveredAt: Date,
    },
    timeline: {
      type: [
        new Schema<IOrderEvent>(
          {
            status: { type: String, required: true },
            note: String,
            at: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    customerNote: String,
    // Flips once stock has been decremented, so a repeated webhook can't double-decrement.
    inventoryApplied: { type: Boolean, default: false },
    paidAt: Date,
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ userId: 1, createdAt: -1 });

export const Order: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) ||
  mongoose.model<IOrder>("Order", OrderSchema);
