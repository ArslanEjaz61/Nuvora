import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { requireAdminPage } from "../../_lib/guard";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { serialize } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import { OrderDetail } from "@/components/admin/orders/OrderDetail";
import type { OrderData, OtherOrder } from "@/components/admin/orders/OrderDetail";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("/admin/orders");
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();

  await connectDB();
  const order = await Order.findById(id).lean();
  if (!order) notFound();

  const otherOrders = order.userId
    ? await Order.find({ userId: order.userId, _id: { $ne: order._id } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderNumber grandTotal status paymentStatus createdAt")
        .lean()
    : [];

  return (
    <>
      <PageHeader title={order.orderNumber} description={order.email} />
      <OrderDetail
        order={serialize({ ...order, _id: String(order._id) }) as unknown as OrderData}
        otherOrders={
          serialize(otherOrders.map((o) => ({ ...o, _id: String(o._id) }))) as unknown as OtherOrder[]
        }
      />
    </>
  );
}
