import { NextResponse } from "next/server";
import { guardAdmin } from "../_lib/guard";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { serverError, pageParams } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
const PAYMENT_STATUSES = ["unpaid", "paid", "failed", "refunded", "expired"];

export async function GET(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = pageParams(url, 25, 100);
    const q = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status")?.trim();
    const paymentStatus = url.searchParams.get("paymentStatus")?.trim();

    const filter: Record<string, unknown> = {};
    if (status && STATUSES.includes(status)) filter.status = status;
    if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus)) filter.paymentStatus = paymentStatus;
    if (q) {
      filter.$or = [
        { orderNumber: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("orderNumber email grandTotal status paymentStatus fulfillment createdAt items")
        .lean(),
      Order.countDocuments(filter),
    ]);

    return NextResponse.json({
      items: items.map((o) => ({
        _id: String(o._id),
        orderNumber: o.orderNumber,
        email: o.email,
        grandTotal: o.grandTotal,
        status: o.status,
        paymentStatus: o.paymentStatus,
        itemCount: (o.items ?? []).reduce((n, i) => n + i.quantity, 0),
        shippedAt: o.fulfillment?.shippedAt ?? null,
        createdAt: o.createdAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return serverError("admin/orders:GET", err);
  }
}
