import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Order, type IOrder } from "@/models/Order";
import { authError, jsonError, serverError } from "../../_lib/http";
import { serializeOrder } from "../serialize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await requireUser();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) return jsonError("Order not found.", 404);

    await connectDB();

    // userId is part of the query, so someone else's order is indistinguishable
    // from one that does not exist.
    const order = await Order.findOne({ _id: id, userId: session.userId }).lean<IOrder | null>();
    if (!order) return jsonError("Order not found.", 404);

    return NextResponse.json({ order: serializeOrder(order) });
  } catch (err) {
    return authError(err) ?? serverError("orders/[id]:GET", err);
  }
}
