import { Types } from "mongoose";
import { requireAdminPage } from "../_lib/guard";
import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { serialize } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import { ReviewsQueue, type ReviewRow } from "@/components/admin/reviews/ReviewsQueue";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireAdminPage("/admin/reviews");
  await connectDB();

  const { page: pageParam, status: statusParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const status = ["pending", "approved", "rejected"].includes(statusParam ?? "")
    ? (statusParam as "pending" | "approved" | "rejected")
    : "pending";
  const skip = (page - 1) * PAGE_SIZE;

  const [rows, total, counts] = await Promise.all([
    Review.find({ status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PAGE_SIZE)
      .populate<{ productId: { _id: Types.ObjectId; title: string; slug: string } | null }>(
        "productId",
        "title slug"
      )
      .lean(),
    Review.countDocuments({ status }),
    Review.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  return (
    <>
      <PageHeader title="Reviews" description="Moderate customer reviews before they go live." />
      <ReviewsQueue
        rows={
          serialize(
            rows.map((r) => ({
              _id: String(r._id),
              productTitle: r.productId?.title ?? "Deleted product",
              productSlug: r.productId?.slug ?? "",
              authorName: r.authorName,
              rating: r.rating,
              title: r.title ?? "",
              body: r.body,
              verifiedPurchase: r.verifiedPurchase,
              status: r.status,
              createdAt: r.createdAt,
            }))
          ) as unknown as ReviewRow[]
        }
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        total={total}
        status={status}
        counts={Object.fromEntries(counts.map((c) => [c._id, c.count]))}
      />
    </>
  );
}
