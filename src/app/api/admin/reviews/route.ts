import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { guardAdmin } from "../_lib/guard";
import { recomputeProductRating } from "../_lib/inventory";
import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { readJson, parseWith, serverError, pageParams } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = pageParams(url, 25, 100);
    const status = url.searchParams.get("status") ?? "pending";

    const filter: Record<string, unknown> = {};
    if (["pending", "approved", "rejected"].includes(status)) filter.status = status;

    const [rows, total, counts] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ productId: { _id: Types.ObjectId; title: string; slug: string } }>(
          "productId",
          "title slug"
        )
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    return NextResponse.json({
      reviews: rows.map((r) => ({
        _id: String(r._id),
        productId: r.productId?._id ? String(r.productId._id) : "",
        productTitle: r.productId?.title ?? "Deleted product",
        productSlug: r.productId?.slug ?? "",
        authorName: r.authorName,
        rating: r.rating,
        title: r.title ?? "",
        body: r.body,
        verifiedPurchase: r.verifiedPurchase,
        status: r.status,
        createdAt: r.createdAt,
      })),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return serverError("admin/reviews:GET", err);
  }
}

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

const schema = z.object({
  ids: z.array(objectId).min(1).max(100),
  action: z.enum(["approve", "reject", "delete"]),
});

export async function PATCH(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const parsed = parseWith(schema, await readJson(req));
  if (!parsed.ok) return parsed.response;
  const { ids, action } = parsed.data;

  try {
    await connectDB();
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    const affected = await Review.find({ _id: { $in: objectIds } }).select("productId");
    const productIds = [...new Set(affected.map((r) => String(r.productId)))];

    if (action === "delete") {
      await Review.deleteMany({ _id: { $in: objectIds } });
    } else {
      await Review.updateMany(
        { _id: { $in: objectIds } },
        { $set: { status: action === "approve" ? "approved" : "rejected" } }
      );
    }

    // Averages are recomputed from approved reviews only, so moderating either way
    // keeps the product's public rating honest.
    await Promise.all(productIds.map((pid) => recomputeProductRating(pid)));

    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (err) {
    return serverError("admin/reviews:PATCH", err);
  }
}
