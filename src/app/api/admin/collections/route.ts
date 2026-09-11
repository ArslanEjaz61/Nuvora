import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { guardAdmin } from "../_lib/guard";
import { uniqueSlug } from "../_lib/slug";
import { connectDB } from "@/lib/db";
import { Collection } from "@/models/Collection";
import { Product } from "@/models/Product";
import { collectionInputSchema } from "@/lib/validation";
import { readJson, parseWith, serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const collections = await Collection.find().sort({ sortOrder: 1, title: 1 }).lean();

    const counts = await Product.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $unwind: "$collections" },
      { $group: { _id: "$collections", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    return NextResponse.json({
      collections: collections.map((c) => ({
        ...c,
        _id: String(c._id),
        parent: c.parent ? String(c.parent) : null,
        productCount: countMap.get(String(c._id)) ?? 0,
      })),
    });
  } catch (err) {
    return serverError("admin/collections:GET", err);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const parsed = parseWith(collectionInputSchema, await readJson(req));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  try {
    await connectDB();
    const slug = await uniqueSlug(Collection, input.slug || input.title);
    const created = await Collection.create({
      ...input,
      slug,
      parent: input.parent ? new Types.ObjectId(input.parent) : null,
    });
    return NextResponse.json(
      { collection: { ...created.toObject(), _id: String(created._id) } },
      { status: 201 }
    );
  } catch (err) {
    return serverError("admin/collections:POST", err);
  }
}
