import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order, type IOrder } from "@/models/Order";
import { jsonError, serverError } from "../../../_lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!id || !id.startsWith("cs_")) return jsonError("Order not found.", 404);

    await connectDB();

    const order = await Order.findOne({ stripeSessionId: id }).lean<IOrder | null>();
    if (!order) return jsonError("Order not found.", 404);

    // Deliberately narrow: enough to render the thank-you page and nothing more.
    // paymentStatus is whatever the webhook has recorded — this route never sets it.
    return NextResponse.json({
      orderNumber: order.orderNumber,
      email: order.email,
      grandTotal: order.grandTotal,
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      items: order.items.map((item) => ({
        title: item.variantTitle ? `${item.title} — ${item.variantTitle}` : item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        image: item.image ?? null,
      })),
    });
  } catch (err) {
    return serverError("checkout/session/[id]", err);
  }
}
