import "server-only";
import { Types } from "mongoose";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";
import { Review } from "@/models/Review";

/** Keeps Product.totalInventory in step with the sum of its active variants. */
export async function syncProductInventory(productId: string | Types.ObjectId) {
  const id = typeof productId === "string" ? new Types.ObjectId(productId) : productId;
  const [row] = await ProductVariant.aggregate<{ total: number }>([
    { $match: { productId: id, active: true } },
    { $group: { _id: null, total: { $sum: "$inventoryQuantity" } } },
  ]);
  await Product.updateOne({ _id: id }, { $set: { totalInventory: row?.total ?? 0 } });
  return row?.total ?? 0;
}

/** Rating is derived from APPROVED reviews only — pending/rejected never count. */
export async function recomputeProductRating(productId: string | Types.ObjectId) {
  const id = typeof productId === "string" ? new Types.ObjectId(productId) : productId;
  const [row] = await Review.aggregate<{ average: number; count: number }>([
    { $match: { productId: id, status: "approved" } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const average = row ? Math.round(row.average * 10) / 10 : 0;
  const count = row?.count ?? 0;
  await Product.updateOne({ _id: id }, { $set: { rating: { average, count } } });
  return { average, count };
}
