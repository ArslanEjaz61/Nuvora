import { NextResponse } from "next/server";
import type { QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { Product, type IProduct } from "@/models/Product";
import { pageParams, serverError } from "../_lib/http";
import { PRODUCT_CARD_FIELDS, toProductCards } from "../_lib/product-cards";

export const dynamic = "force-dynamic";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const { page, limit, skip } = pageParams(url, 12, 50);

    if (!q) {
      return NextResponse.json({ products: [], total: 0, page: 1, pages: 1, query: "" });
    }

    await connectDB();

    let products: IProduct[] = [];
    let total = 0;

    // The weighted text index is the primary path; it needs whole words, so
    // short or partial queries fall through to the prefix regex below.
    if (q.length >= 3) {
      const textFilter: QueryFilter<IProduct> = { status: "active", $text: { $search: q } };
      [products, total] = await Promise.all([
        Product.find(textFilter, { score: { $meta: "textScore" } })
          .select(PRODUCT_CARD_FIELDS)
          .sort({ score: { $meta: "textScore" }, soldCount: -1 })
          .skip(skip)
          .limit(limit)
          .lean<IProduct[]>(),
        Product.countDocuments(textFilter),
      ]);
    }

    if (total === 0) {
      const rx = new RegExp(escapeRegex(q), "i");
      const regexFilter: QueryFilter<IProduct> = {
        status: "active",
        $or: [{ title: rx }, { tags: rx }, { brand: rx }],
      };
      [products, total] = await Promise.all([
        Product.find(regexFilter)
          .select(PRODUCT_CARD_FIELDS)
          .sort({ soldCount: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean<IProduct[]>(),
        Product.countDocuments(regexFilter),
      ]);
    }

    return NextResponse.json({
      products: await toProductCards(products),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      query: q,
    });
  } catch (err) {
    return serverError("search", err);
  }
}
