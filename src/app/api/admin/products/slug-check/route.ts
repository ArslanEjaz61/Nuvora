import { NextResponse } from "next/server";
import { guardAdmin } from "../../_lib/guard";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { slugify } from "@/lib/utils";
import { serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const url = new URL(req.url);
    const slug = slugify(url.searchParams.get("slug") ?? "");
    const excludeId = url.searchParams.get("excludeId");
    if (!slug) return NextResponse.json({ slug: "", available: false });

    const query: Record<string, unknown> = { slug };
    if (excludeId && /^[a-f\d]{24}$/i.test(excludeId)) query._id = { $ne: excludeId };

    const clash = await Product.exists(query);
    return NextResponse.json({ slug, available: !clash });
  } catch (err) {
    return serverError("admin/products/slug-check", err);
  }
}
