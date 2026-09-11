import mongoose, { Schema, Model, Types } from "mongoose";

export type ProductStatus = "draft" | "active" | "archived";

export interface IProductImage {
  url: string;
  publicId?: string;
  alt?: string;
  width?: number;
  height?: number;
}

/** An option axis, e.g. { name: "Color", values: ["Oak", "Walnut"] } */
export interface IProductOption {
  name: string;
  values: string[];
}

export interface IProduct {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  images: IProductImage[];
  collections: Types.ObjectId[];
  /** Display price in integer cents. Authoritative price lives on the variant. */
  price: number;
  compareAtPrice?: number;
  currency: string;
  status: ProductStatus;
  tags: string[];
  options: IProductOption[];
  brand?: string;
  material?: string;
  rating: { average: number; count: number };
  seo?: { title?: string; description?: string };
  featured: boolean;
  totalInventory: number;
  soldCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: String,
    alt: String,
    width: Number,
    height: Number,
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    shortDescription: { type: String, trim: true },
    images: { type: [ProductImageSchema], default: [] },
    collections: [{ type: Schema.Types.ObjectId, ref: "Collection", index: true }],
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    options: {
      type: [
        new Schema<IProductOption>(
          { name: { type: String, required: true }, values: { type: [String], default: [] } },
          { _id: false }
        ),
      ],
      default: [],
    },
    brand: String,
    material: String,
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    seo: {
      title: String,
      description: String,
    },
    featured: { type: Boolean, default: false, index: true },
    totalInventory: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Drives /search — weighted so a title hit outranks a description hit.
ProductSchema.index(
  { title: "text", description: "text", tags: "text", brand: "text" },
  { weights: { title: 10, tags: 5, brand: 3, description: 1 }, name: "product_search" }
);
ProductSchema.index({ status: 1, featured: -1, createdAt: -1 });
ProductSchema.index({ status: 1, price: 1 });

export const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ||
  mongoose.model<IProduct>("Product", ProductSchema);
