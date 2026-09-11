import mongoose, { Schema, Model, Types } from "mongoose";

export interface IWishlistItem {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  addedAt: Date;
}

export interface IWishlist {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  items: IWishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

const WishlistSchema = new Schema<IWishlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [
        new Schema<IWishlistItem>(
          {
            productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
            variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null },
            addedAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const Wishlist: Model<IWishlist> =
  (mongoose.models.Wishlist as Model<IWishlist>) ||
  mongoose.model<IWishlist>("Wishlist", WishlistSchema);
