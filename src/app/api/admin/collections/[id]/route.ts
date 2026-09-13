import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { guardAdmin } from "../../_lib/guard";
import { uniqueSlug } from "../../_lib/slug";
import { connectDB } from "@/lib/db";
import { Collection } from "@/models/Collection";
import { Product } from "@/models/Product";
import { collectionInputSchema } from "@/lib/validation";
import { readJson, parseWith, onlyProvided, jsonError, serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  const rawBody = await readJson(req);
  const parsed = parseWith(collectionInputSchema.partial(), rawBody);
  if (!parsed.ok) return parsed.response;
  const input = onlyProvided(rawBody, parsed.data);

  try {
    await connectDB();
    const existing = await Collection.findById(id);
    if (!existing) return jsonError("Collection not found", 404);

    if (input.parent && input.parent === id) {
      return jsonError("A collection can't be its own parent.", 400);
    }

    const set: Record<string, unknown> = { ...input };
    if (input.slug !== undefined || input.title !== undefined) {
      set.slug = await uniqueSlug(Collection, input.slug || input.title || existing.title, id);
    }
    if (input.parent !== undefined) {
      set.parent = input.parent ? new Types.ObjectId(input.parent) : null;
    }

    const collection = await Collection.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true, runValidators: true }
    ).lean();

    return NextResponse.json({
      collection: collection ? { ...collection, _id: String(collection._id) } : null,
    });
  } catch (err) {
    return serverError("admin/collections/[id]:PATCH", err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  try {
    await connectDB();
    const objectId = new Types.ObjectId(id);
    const collection = await Collection.findById(objectId);
    if (!collection) return jsonError("Collection not found", 404);

    await Promise.all([
      // Children are promoted to top level rather than orphaned behind a dead parent.
      Collection.updateMany({ parent: objectId }, { $set: { parent: null } }),
      Product.updateMany({ collections: objectId }, { $pull: { collections: objectId } }),
    ]);
    await Collection.deleteOne({ _id: objectId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("admin/collections/[id]:DELETE", err);
  }
}
