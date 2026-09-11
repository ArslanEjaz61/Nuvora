import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { reviewSchema } from "@/lib/validation";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Review, type IReview } from "@/models/Review";
import {
  authError,
  jsonError,
  pageParams,
  parseWith,
  readJson,
  serverError,
  stripHtml,
  tooManyRequests,
} from "../_lib/http";

export const dynamic = "force-dynamic";

type Histogram = { 1: number; 2: number; 3: number; 4: number; 5: number };

function emptyHistogram(): Histogram {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");

    if (!productId || !Types.ObjectId.isValid(productId)) {
      return jsonError("A valid productId is required.", 400);
    }

    const { page, limit, skip } = pageParams(url, 10, 50);

    await connectDB();

    const filter = { productId: new Types.ObjectId(productId), status: "approved" as const };

    const [reviews, total, buckets] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IReview[]>(),
      Review.countDocuments(filter),
      Review.aggregate<{ _id: number; count: number }>([
        { $match: filter },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
      ]),
    ]);

    const histogram = emptyHistogram();
    let ratingSum = 0;
    for (const bucket of buckets) {
      const key = bucket._id as 1 | 2 | 3 | 4 | 5;
      if (key >= 1 && key <= 5) {
        histogram[key] = bucket.count;
        ratingSum += key * bucket.count;
      }
    }

    return NextResponse.json({
      reviews: reviews.map((review) => ({
        id: String(review._id),
        authorName: review.authorName,
        rating: review.rating,
        title: review.title ?? "",
        body: review.body,
        verifiedPurchase: review.verifiedPurchase,
        helpfulCount: review.helpfulCount,
        createdAt: review.createdAt,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      histogram,
      average: total > 0 ? Math.round((ratingSum / total) * 10) / 10 : 0,
    });
  } catch (err) {
    return serverError("reviews:GET", err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser();

    const ip = await getClientIp();
    const limit = rateLimit(`review:${session.userId}:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfter, "Too many reviews submitted. Try again later.");
    }

    const parsed = parseWith(reviewSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

    await connectDB();

    const product = await Product.findOne({ _id: input.productId, status: "active" })
      .select("_id")
      .lean();
    if (!product) return jsonError("That product no longer exists.", 404);

    const existing = await Review.findOne({
      productId: input.productId,
      userId: session.userId,
    })
      .select("_id")
      .lean();
    if (existing) return jsonError("You've already reviewed this product.", 409);

    const paidOrder = await Order.findOne({
      userId: session.userId,
      paymentStatus: "paid",
      "items.productId": new Types.ObjectId(input.productId),
    })
      .select("_id")
      .lean();

    const authorName = stripHtml(input.authorName) || session.firstName || "Customer";
    const body = stripHtml(input.body);
    if (body.length < 10) return jsonError("Tell us a little more.", 400);

    try {
      await Review.create({
        productId: input.productId,
        userId: session.userId,
        orderId: paidOrder?._id ?? null,
        authorName,
        rating: input.rating,
        title: input.title ? stripHtml(input.title) : undefined,
        body,
        verifiedPurchase: Boolean(paidOrder),
        // Everything queues for moderation; nothing a shopper writes goes live unreviewed.
        status: "pending",
      });
    } catch (err) {
      if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
        return jsonError("You've already reviewed this product.", 409);
      }
      throw err;
    }

    await recomputeProductRating(input.productId);

    return NextResponse.json(
      { ok: true, status: "pending", message: "Thanks! Your review will appear once approved." },
      { status: 201 }
    );
  } catch (err) {
    return authError(err) ?? serverError("reviews:POST", err);
  }
}

/** Only approved reviews count toward the public rating. */
async function recomputeProductRating(productId: string) {
  const [result] = await Review.aggregate<{ average: number; count: number }>([
    { $match: { productId: new Types.ObjectId(productId), status: "approved" } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    { $project: { _id: 0, average: 1, count: 1 } },
  ]);

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        "rating.average": result ? Math.round(result.average * 10) / 10 : 0,
        "rating.count": result ? result.count : 0,
      },
    }
  );
}
