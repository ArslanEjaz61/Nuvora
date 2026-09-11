import { requireAdminPage } from "../_lib/guard";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { PageHeader } from "@/components/admin/PageHeader";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; paymentStatus?: string }>;
}) {
  await requireAdminPage("/admin/orders");
  await connectDB();

  const { page: pageParam, q, status, paymentStatus } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
  const PAYMENT_STATUSES = ["unpaid", "paid", "failed", "refunded", "expired"];

  const filter: Record<string, unknown> = {};
  if (status && STATUSES.includes(status)) filter.status = status;
  if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus)) filter.paymentStatus = paymentStatus;
  if (q?.trim()) {
    filter.$or = [
      { orderNumber: { $regex: q.trim(), $options: "i" } },
      { email: { $regex: q.trim(), $options: "i" } },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PAGE_SIZE)
      .select("orderNumber email grandTotal status paymentStatus fulfillment createdAt items")
      .lean(),
    Order.countDocuments(filter),
  ]);

  const rows = orders.map((o) => ({
    _id: String(o._id),
    orderNumber: o.orderNumber,
    email: o.email,
    grandTotal: o.grandTotal,
    status: o.status,
    paymentStatus: o.paymentStatus,
    itemCount: (o.items ?? []).reduce((n, i) => n + i.quantity, 0),
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"}.`} />
      <OrdersTable
        rows={rows}
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        total={total}
        query={q ?? ""}
        status={status ?? ""}
        paymentStatus={paymentStatus ?? ""}
      />
    </>
  );
}
