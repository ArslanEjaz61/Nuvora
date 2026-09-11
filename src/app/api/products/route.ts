import { NextResponse } from "next/server";
import { Types, type QueryFilter, type SortOrder } from "mongoose";
import { connectDB } from "@/lib/db";
import { Collection } from "@/models/Collection";
import { Product, type IProduct } from "@/models/Product";
import { jsonError, pageParams, serverError } from "../_lib/http";
import { PRODUCT_CARD_FIELDS, toProductCards } from "../_lib/product-cards";

export const dynamic = "force-dynamic";

const SORTS: Record<string, Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  "best-selling": { soldCount: -1, createdAt: -1 },
  rating: { "rating.average": -1, "rating.count": -1 },
};

function intParam(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  // Money stays in integer cents — a fractional filter value is rejected outright.
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { page, limit, skip } = pageParams(url, 12, 50);

    const sortKey = url.searchParams.get("sort") ?? "newest";
    const sort = SORTS[sortKey];
    if (!sort) return jsonError("Unknown sort option.", 400);

    await connectDB();

    const base: QueryFilter<IProduct> = { status: "active" };

    const collectionParam = url.searchParams.get("collection");
    if (collectionParam) {
      const collection = Types.ObjectId.isValid(collectionParam)
        ? await Collection.findOne({ _id: collectionParam, status: "active" }).select("_id").lean()
        : await Collection.findOne({ slug: collectionParam.toLowerCase(), status: "active" })
            .select("_id")
            .lean();

      if (!collection) {
        return NextResponse.json({
          products: [],
          total: 0,
          page: 1,
          pages: 1,
          priceRange: { min: 0, max: 0 },
          availableTags: [],
        });
      }
      base.collections = collection._id;
    }

    const tagsParam = url.searchParams.get("tags");
    const tags = tagsParam
      ? tagsParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];
    if (tags.length > 0) base.tags = { $in: tags };

    // The facets describe the collection before price narrowing, so the slider
    // bounds and tag list don't collapse as the shopper drags the handles.
    const [facets] = await Product.aggregate<{
      min: number;
      max: number;
      tags: string[];
    }>([
      { $match: base },
      {
        $group: {
          _id: null,
          min: { $min: "$price" },
          max: { $max: "$price" },
          tags: { $addToSet: "$tags" },
        },
      },
      {
        $project: {
          _id: 0,
          min: 1,
          max: 1,
          tags: {
            $sortArray: {
              input: {
                $reduce: {
                  input: "$tags",
                  initialValue: [],
                  in: { $setUnion: ["$$value", "$$this"] },
                },
              },
              sortBy: 1,
            },
          },
        },
      },
    ]);

    const priceRange = { min: facets?.min ?? 0, max: facets?.max ?? 0 };

    const filter: QueryFilter<IProduct> = { ...base };
    const minPrice = intParam(url.searchParams.get("minPrice"));
    const maxPrice = intParam(url.searchParams.get("maxPrice"));
    if (minPrice !== null || maxPrice !== null) {
      filter.price = {
        ...(minPrice !== null ? { $gte: minPrice } : {}),
        ...(maxPrice !== null ? { $lte: maxPrice } : {}),
      };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select(PRODUCT_CARD_FIELDS)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean<IProduct[]>(),
      Product.countDocuments(filter),
    ]);

    return NextResponse.json({
      products: await toProductCards(products),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      priceRange,
      availableTags: facets?.tags ?? [],
      sort: sortKey,
    });
  } catch (err) {
    return serverError("products", err);
  }
}
