import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { guardAdmin } from "../_lib/guard";
import { uniqueSlug } from "../_lib/slug";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";
import { Wishlist } from "@/models/Wishlist";
import { productInputSchema } from "@/lib/validation";
import { readJson, parseWith, serverError, pageParams } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = pageParams(url, 20, 100);

    const q = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status")?.trim();
    const collection = url.searchParams.get("collection")?.trim();

    const filter: Record<string, unknown> = {};
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
      ];
    }
    if (status && ["draft", "active", "archived"].includes(status)) filter.status = status;
    if (collection && Types.ObjectId.isValid(collection)) {
      filter.collections = new Types.ObjectId(collection);
    }

    const [items, total] = await Promise.all([
      Product.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    const ids = items.map((p) => p._id);
    const variantStats = await ProductVariant.aggregate<{
      _id: Types.ObjectId;
      variantCount: number;
      inventory: number;
    }>([
      { $match: { productId: { $in: ids } } },
      {
        $group: {
          _id: "$productId",
          variantCount: { $sum: 1 },
          inventory: { $sum: "$inventoryQuantity" },
        },
      },
    ]);
    const byProduct = new Map(variantStats.map((s) => [String(s._id), s]));

    return NextResponse.json({
      items: items.map((p) => ({
        ...p,
        _id: String(p._id),
        collections: (p.collections ?? []).map(String),
        variantCount: byProduct.get(String(p._id))?.variantCount ?? 0,
        inventory: byProduct.get(String(p._id))?.inventory ?? 0,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return serverError("admin/products:GET", err);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const parsed = parseWith(productInputSchema, await readJson(req));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  try {
    await connectDB();
    const slug = await uniqueSlug(Product, input.slug || input.title);

    const product = await Product.create({
      ...input,
      slug,
      compareAtPrice: input.compareAtPrice ?? undefined,
      collections: input.collections.map((id) => new Types.ObjectId(id)),
    });

    return NextResponse.json({ product: { ...product.toObject(), _id: String(product._id) } }, { status: 201 });
  } catch (err) {
    return serverError("admin/products:POST", err);
  }
}

const bulkSchema = z.object({
  ids: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(200),
  action: z.enum(["activate", "archive", "draft", "delete"]),
});

/** Bulk activate / archive / delete from the product list's selection toolbar. */
export async function PATCH(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const parsed = parseWith(bulkSchema, await readJson(req));
  if (!parsed.ok) return parsed.response;
  const { ids, action } = parsed.data;

  try {
    await connectDB();
    const objectIds = ids.map((id) => new Types.ObjectId(id));

    if (action === "delete") {
      await Promise.all([
        Product.deleteMany({ _id: { $in: objectIds } }),
        ProductVariant.deleteMany({ productId: { $in: objectIds } }),
        Wishlist.updateMany(
          { "items.productId": { $in: objectIds } },
          { $pull: { items: { productId: { $in: objectIds } } } }
        ),
      ]);
      return NextResponse.json({ ok: true, deleted: ids.length });
    }

    const status = action === "activate" ? "active" : action === "archive" ? "archived" : "draft";
    const res = await Product.updateMany({ _id: { $in: objectIds } }, { $set: { status } });
    return NextResponse.json({ ok: true, modified: res.modifiedCount });
  } catch (err) {
    return serverError("admin/products:PATCH", err);
  }
}
