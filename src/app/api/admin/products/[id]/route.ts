import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { guardAdmin } from "../../_lib/guard";
import { uniqueSlug } from "../../_lib/slug";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";
import { Wishlist } from "@/models/Wishlist";
import { Review } from "@/models/Review";
import { productInputSchema } from "@/lib/validation";
import { readJson, parseWith, jsonError, serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function badId(id: string) {
  return !Types.ObjectId.isValid(id);
}

export async function GET(_req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (badId(id)) return jsonError("Not found", 404);

  try {
    await connectDB();
    const [product, variants] = await Promise.all([
      Product.findById(id).lean(),
      ProductVariant.find({ productId: id }).sort({ position: 1 }).lean(),
    ]);
    if (!product) return jsonError("Product not found", 404);

    return NextResponse.json({
      product: { ...product, _id: String(product._id) },
      variants: variants.map((v) => ({ ...v, _id: String(v._id), productId: String(v.productId) })),
    });
  } catch (err) {
    return serverError("admin/products/[id]:GET", err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (badId(id)) return jsonError("Not found", 404);

  const parsed = parseWith(productInputSchema.partial(), await readJson(req));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  try {
    await connectDB();
    const existing = await Product.findById(id);
    if (!existing) return jsonError("Product not found", 404);

    const update: Record<string, unknown> = { ...input };

    if (input.slug !== undefined || input.title !== undefined) {
      const desired = input.slug || input.title || existing.title;
      update.slug = await uniqueSlug(Product, desired, id);
    }
    if (input.collections) {
      update.collections = input.collections.map((cid) => new Types.ObjectId(cid));
    }
    if (input.compareAtPrice === null) {
      delete update.compareAtPrice;
      update.$unset = { compareAtPrice: "" };
    }

    const { $unset, ...set } = update as { $unset?: Record<string, string> };
    const product = await Product.findByIdAndUpdate(
      id,
      $unset ? { $set: set, $unset } : { $set: set },
      { new: true, runValidators: true }
    ).lean();

    return NextResponse.json({ product: product ? { ...product, _id: String(product._id) } : null });
  } catch (err) {
    return serverError("admin/products/[id]:PATCH", err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (badId(id)) return jsonError("Not found", 404);

  try {
    await connectDB();
    const objectId = new Types.ObjectId(id);
    const product = await Product.findById(objectId);
    if (!product) return jsonError("Product not found", 404);

    await Promise.all([
      ProductVariant.deleteMany({ productId: objectId }),
      Wishlist.updateMany(
        { "items.productId": objectId },
        { $pull: { items: { productId: objectId } } }
      ),
      Review.deleteMany({ productId: objectId }),
      Product.deleteOne({ _id: objectId }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("admin/products/[id]:DELETE", err);
  }
}
