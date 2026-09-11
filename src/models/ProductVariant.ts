import mongoose, { Schema, Model, Types } from "mongoose";

export interface IVariantOption {
  name: string;
  value: string;
}

export interface IProductVariant {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  sku: string;
  title: string;
  options: IVariantOption[];
  /** Authoritative price in integer cents. Checkout reads this, never the client. */
  price: number;
  compareAtPrice?: number;
  inventoryQuantity: number;
  /** deny = block sale at 0 stock; continue = allow backorder */
  inventoryPolicy: "deny" | "continue";
  lowStockThreshold: number;
  weightGrams?: number;
  image?: { url: string; publicId?: string; alt?: string };
  position: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    options: {
      type: [
        new Schema<IVariantOption>(
          { name: { type: String, required: true }, value: { type: String, required: true } },
          { _id: false }
        ),
      ],
      default: [],
    },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    inventoryQuantity: { type: Number, default: 0, min: 0 },
    inventoryPolicy: { type: String, enum: ["deny", "continue"], default: "deny" },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    weightGrams: Number,
    image: {
      url: String,
      publicId: String,
      alt: String,
    },
    position: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductVariantSchema.index({ productId: 1, position: 1 });

export const ProductVariant: Model<IProductVariant> =
  (mongoose.models.ProductVariant as Model<IProductVariant>) ||
  mongoose.model<IProductVariant>("ProductVariant", ProductVariantSchema);
