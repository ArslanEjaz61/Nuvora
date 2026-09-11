import { NextResponse } from "next/server";
import { Types, type PipelineStage } from "mongoose";
import { z } from "zod";
import { guardAdmin } from "../_lib/guard";
import { syncProductInventory } from "../_lib/inventory";
import { connectDB } from "@/lib/db";
import { ProductVariant } from "@/models/ProductVariant";
import { readJson, parseWith, serverError, pageParams } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface InventoryRow {
  _id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  title: string;
  sku: string;
  inventoryQuantity: number;
  inventoryPolicy: "deny" | "continue";
  lowStockThreshold: number;
  active: boolean;
}

export async function GET(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = pageParams(url, 50, 200);
    const q = url.searchParams.get("q")?.trim();
    const filter = url.searchParams.get("filter") ?? "all";

    const match: Record<string, unknown> = {};
    if (filter === "low") match.$expr = { $lte: ["$inventoryQuantity", "$lowStockThreshold"] };
    if (filter === "out") match.inventoryQuantity = 0;

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $addFields: {
          productTitle: { $ifNull: [{ $first: "$product.title" }, "Unknown product"] },
          productSlug: { $ifNull: [{ $first: "$product.slug" }, ""] },
        },
      },
    ];

    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { sku: { $regex: q, $options: "i" } },
            { title: { $regex: q, $options: "i" } },
            { productTitle: { $regex: q, $options: "i" } },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        rows: [
          { $sort: { productTitle: 1, position: 1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              productId: 1,
              productTitle: 1,
              productSlug: 1,
              title: 1,
              sku: 1,
              inventoryQuantity: 1,
              inventoryPolicy: 1,
              lowStockThreshold: 1,
              active: 1,
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    });

    const [result] = await ProductVariant.aggregate(pipeline);
    const rows = (result?.rows ?? []) as Array<Record<string, unknown>>;
    const total = (result?.total?.[0]?.count ?? 0) as number;

    return NextResponse.json({
      rows: rows.map((r) => ({ ...r, _id: String(r._id), productId: String(r.productId) })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return serverError("admin/inventory:GET", err);
  }
}

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

const patchSchema = z.union([
  z.object({
    mode: z.literal("set"),
    variantId: objectId,
    quantity: z.number().int().min(0).max(1_000_000),
  }),
  z.object({
    mode: z.literal("adjust"),
    variantIds: z.array(objectId).min(1).max(500),
    delta: z.number().int().min(-100_000).max(100_000),
  }),
]);

export async function PATCH(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const parsed = parseWith(patchSchema, await readJson(req));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  try {
    await connectDB();

    if (input.mode === "set") {
      const variant = await ProductVariant.findByIdAndUpdate(
        input.variantId,
        { $set: { inventoryQuantity: input.quantity } },
        { new: true }
      ).select("productId inventoryQuantity");
      if (!variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });
      await syncProductInventory(variant.productId);
      return NextResponse.json({ ok: true, inventoryQuantity: variant.inventoryQuantity });
    }

    const ids = input.variantIds.map((id) => new Types.ObjectId(id));
    const affected = await ProductVariant.find({ _id: { $in: ids } }).select("productId");

    await ProductVariant.updateMany({ _id: { $in: ids } }, { $inc: { inventoryQuantity: input.delta } });
    // The schema floors quantity at 0; a negative adjustment past zero is clamped here.
    await ProductVariant.updateMany(
      { _id: { $in: ids }, inventoryQuantity: { $lt: 0 } },
      { $set: { inventoryQuantity: 0 } }
    );

    const productIds = [...new Set(affected.map((v) => String(v.productId)))];
    await Promise.all(productIds.map((pid) => syncProductInventory(pid)));

    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (err) {
    return serverError("admin/inventory:PATCH", err);
  }
}
