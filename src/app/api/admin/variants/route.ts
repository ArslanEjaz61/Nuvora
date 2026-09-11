import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { guardAdmin } from "../_lib/guard";
import { syncProductInventory } from "../_lib/inventory";
import { connectDB } from "@/lib/db";
import { ProductVariant } from "@/models/ProductVariant";
import { Product } from "@/models/Product";
import { variantInputSchema } from "@/lib/validation";
import { readJson, parseWith, jsonError, serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const productId = new URL(req.url).searchParams.get("productId");
    if (!productId || !Types.ObjectId.isValid(productId)) {
      return jsonError("A valid productId is required.", 400);
    }
    const variants = await ProductVariant.find({ productId }).sort({ position: 1 }).lean();
    return NextResponse.json({
      variants: variants.map((v) => ({ ...v, _id: String(v._id), productId: String(v.productId) })),
    });
  } catch (err) {
    return serverError("admin/variants:GET", err);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const parsed = parseWith(variantInputSchema, await readJson(req));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  try {
    await connectDB();
    const product = await Product.exists({ _id: input.productId });
    if (!product) return jsonError("That product no longer exists.", 404);

    const count = await ProductVariant.countDocuments({ productId: input.productId });
    const variant = await ProductVariant.create({
      ...input,
      sku: input.sku.toUpperCase(),
      compareAtPrice: input.compareAtPrice ?? undefined,
      position: count,
    });

    await syncProductInventory(input.productId);

    return NextResponse.json(
      { variant: { ...variant.toObject(), _id: String(variant._id), productId: String(variant.productId) } },
      { status: 201 }
    );
  } catch (err) {
    if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
      return jsonError("That SKU is already used by another variant.", 409);
    }
    return serverError("admin/variants:POST", err);
  }
}
