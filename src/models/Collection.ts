import mongoose, { Schema, Model, Types } from "mongoose";

export interface ICollection {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  image?: { url: string; publicId?: string; alt?: string };
  parent?: Types.ObjectId | null;
  sortOrder: number;
  featured: boolean;
  showInNav: boolean;
  status: "active" | "hidden";
  seo?: { title?: string; description?: string };
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    image: {
      url: String,
      publicId: String,
      alt: String,
    },
    parent: { type: Schema.Types.ObjectId, ref: "Collection", default: null, index: true },
    sortOrder: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    showInNav: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "hidden"], default: "active", index: true },
    seo: {
      title: String,
      description: String,
    },
  },
  { timestamps: true }
);

CollectionSchema.index({ status: 1, sortOrder: 1 });

export const Collection: Model<ICollection> =
  (mongoose.models.Collection as Model<ICollection>) ||
  mongoose.model<ICollection>("Collection", CollectionSchema);
