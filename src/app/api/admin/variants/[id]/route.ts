import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { guardAdmin } from "../../_lib/guard";
import { syncProductInventory } from "../../_lib/inventory";
import { connectDB } from "@/lib/db";
import { ProductVariant } from "@/models/ProductVariant";
import { variantInputSchema } from "@/lib/validation";
import { readJson, parseWith, onlyProvided, jsonError, serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = variantInputSchema
  .partial()
  .omit({ productId: true })
  .extend({ position: z.number().int().min(0).optional() });

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  const rawBody = await readJson(req);
  const parsed = parseWith(patchSchema, rawBody);
  if (!parsed.ok) return parsed.response;
  const input = onlyProvided(rawBody, parsed.data);

  try {
    await connectDB();
    const existing = await ProductVariant.findById(id).select("productId");
    if (!existing) return jsonError("Variant not found", 404);

    const set: Record<string, unknown> = { ...input };
    if (input.sku) set.sku = input.sku.toUpperCase();

    const unset = input.compareAtPrice === null ? { compareAtPrice: "" } : undefined;
    if (unset) delete set.compareAtPrice;

    const variant = await ProductVariant.findByIdAndUpdate(
      id,
      unset ? { $set: set, $unset: unset } : { $set: set },
      { new: true, runValidators: true }
    ).lean();

    await syncProductInventory(existing.productId);

    return NextResponse.json({
      variant: variant
        ? { ...variant, _id: String(variant._id), productId: String(variant.productId) }
        : null,
    });
  } catch (err) {
    if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
      return jsonError("That SKU is already used by another variant.", 409);
    }
    return serverError("admin/variants/[id]:PATCH", err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  try {
    await connectDB();
    const variant = await ProductVariant.findByIdAndDelete(id);
    if (!variant) return jsonError("Variant not found", 404);
    await syncProductInventory(variant.productId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("admin/variants/[id]:DELETE", err);
  }
}
