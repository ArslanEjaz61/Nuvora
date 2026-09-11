import { NextResponse } from "next/server";
import { guardAdmin } from "../_lib/guard";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Collection } from "@/models/Collection";
import { ProductVariant } from "@/models/ProductVariant";
import { listAssets } from "@/lib/cloudinary";
import { jsonError, serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    const cursor = new URL(req.url).searchParams.get("cursor") ?? undefined;
    const { assets, nextCursor } = await listAssets(cursor);

    await connectDB();
    const publicIds = assets.map((a) => a.publicId);

    const [productRefs, variantRefs, collectionRefs] = await Promise.all([
      Product.find({ "images.publicId": { $in: publicIds } })
        .select("title images.publicId")
        .lean(),
      ProductVariant.find({ "image.publicId": { $in: publicIds } })
        .select("title image.publicId")
        .lean(),
      Collection.find({ "image.publicId": { $in: publicIds } })
        .select("title image.publicId")
        .lean(),
    ]);

    const usage = new Map<string, string[]>();
    const note = (publicId: string | undefined, label: string) => {
      if (!publicId) return;
      const list = usage.get(publicId) ?? [];
      if (!list.includes(label)) list.push(label);
      usage.set(publicId, list);
    };

    for (const p of productRefs) for (const img of p.images ?? []) note(img.publicId, p.title);
    for (const v of variantRefs) note(v.image?.publicId, v.title);
    for (const c of collectionRefs) note(c.image?.publicId, c.title);

    return NextResponse.json({
      assets: assets.map((a) => ({ ...a, usedBy: usage.get(a.publicId) ?? [] })),
      nextCursor,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "CLOUDINARY_NOT_CONFIGURED") {
      return jsonError("Cloudinary isn't configured. Add your keys to .env.local", 503);
    }
    return serverError("admin/media:GET", err);
  }
}
