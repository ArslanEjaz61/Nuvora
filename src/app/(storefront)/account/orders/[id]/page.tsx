import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { ChevronLeft } from "lucide-react";
import { requireSessionFor } from "@/components/account/guard";
import { OrderDetailView, type OrderView } from "@/components/account/order-view";
import { connectDB } from "@/lib/db";
import { serialize } from "@/lib/utils";
import { Order, type IOrder } from "@/models/Order";
import { serializeOrder } from "@/app/api/orders/serialize";

export const metadata: Metadata = {
  title: "Order details",
  description: "The full detail of your Nuvora order.",
  robots: { index: false },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSessionFor(`/account/orders/${id}`);

  if (!Types.ObjectId.isValid(id)) notFound();

  await connectDB();

  // Scoped by userId so another customer's order id resolves to a 404, not a leak.
  const order = await Order.findOne({ _id: id, userId: session.userId }).lean<IOrder | null>();
  if (!order) notFound();

  const view = serialize(serializeOrder(order)) as unknown as OrderView;

  return (
    <div>
      <Link
        href="/account/orders"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-teal-900"
      >
        <ChevronLeft size={15} aria-hidden />
        All orders
      </Link>

      <OrderDetailView order={view} />
    </div>
  );
}
