import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { requireAdminPage } from "../../_lib/guard";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Review } from "@/models/Review";
import { serialize } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import { CustomerDetail } from "@/components/admin/customers/CustomerDetail";
import type { Customer, OrderRow, ReviewRow } from "@/components/admin/customers/CustomerDetail";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminPage("/admin/customers");
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();

  await connectDB();
  const [user, orders, reviews] = await Promise.all([
    User.findById(id).select("-passwordHash").lean(),
    Order.find({ userId: id })
      .sort({ createdAt: -1 })
      .select("orderNumber grandTotal status paymentStatus createdAt")
      .lean(),
    Review.find({ userId: id })
      .sort({ createdAt: -1 })
      .populate<{ productId: { title: string; slug: string } | null }>("productId", "title slug")
      .lean(),
  ]);

  if (!user) notFound();

  const lifetimeSpend = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.grandTotal, 0);

  return (
    <>
      <PageHeader
        title={`${user.firstName} ${user.lastName}`.trim() || user.email}
        description={user.email}
      />
      <CustomerDetail
        customer={
          serialize({
            _id: String(user._id),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            marketingOptIn: user.marketingOptIn,
            createdAt: user.createdAt,
            addresses: user.addresses ?? [],
          }) as unknown as Customer
        }
        orders={
          serialize(orders.map((o) => ({ ...o, _id: String(o._id) }))) as unknown as OrderRow[]
        }
        reviews={
          serialize(
            reviews.map((r) => ({
              _id: String(r._id),
              productTitle: r.productId?.title ?? "Deleted product",
              productSlug: r.productId?.slug ?? "",
              rating: r.rating,
              title: r.title ?? "",
              body: r.body,
              status: r.status,
              createdAt: r.createdAt,
            }))
          ) as unknown as ReviewRow[]
        }
        lifetimeSpend={lifetimeSpend}
        isSelf={session.userId === String(user._id)}
      />
    </>
  );
}
