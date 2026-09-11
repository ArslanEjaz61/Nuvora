import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { Order, type IOrder } from "@/models/Order";
import { jsonError, parseWith, readJson, serverError, tooManyRequests } from "../../_lib/http";
import { serializeOrder } from "../serialize";

export const dynamic = "force-dynamic";

const lookupSchema = z.object({
  orderNumber: z.string().trim().min(4).max(40),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export async function POST(req: Request) {
  try {
    const ip = await getClientIp();
    const limit = rateLimit(`order-lookup:${ip}`, 10, 60 * 60 * 1000);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfter, "Too many lookups. Try again later.");
    }

    const parsed = parseWith(lookupSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;

    await connectDB();

    // Both fields must match — the order number alone is not a credential.
    const order = await Order.findOne({
      orderNumber: parsed.data.orderNumber.trim().toUpperCase(),
      email: parsed.data.email,
    }).lean<IOrder | null>();

    if (!order) {
      return jsonError("We couldn't find an order with those details.", 404);
    }

    return NextResponse.json({ order: serializeOrder(order) });
  } catch (err) {
    return serverError("orders/lookup", err);
  }
}
