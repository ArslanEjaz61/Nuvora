import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Order, type IOrder } from "@/models/Order";
import { authError, pageParams, serverError } from "../_lib/http";
import { serializeOrderSummary } from "./serialize";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await requireUser();
    const { page, limit, skip } = pageParams(new URL(req.url), 10, 50);

    await connectDB();

    const filter = { userId: session.userId };
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IOrder[]>(),
      Order.countDocuments(filter),
    ]);

    return NextResponse.json({
      orders: orders.map(serializeOrderSummary),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return authError(err) ?? serverError("orders:GET", err);
  }
}
