import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { guardAdmin } from "../../_lib/guard";
import { syncProductInventory } from "../../_lib/inventory";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { ProductVariant } from "@/models/ProductVariant";
import { readJson, parseWith, jsonError, serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled"]),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("tracking"),
    carrier: z.string().trim().min(1).max(80),
    trackingNumber: z.string().trim().min(1).max(120),
    trackingUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  }),
  z.object({ action: z.literal("deliver") }),
  z.object({ action: z.literal("note"), note: z.string().trim().min(1).max(1000) }),
  z.object({ action: z.literal("cancel"), note: z.string().trim().max(500).optional() }),
]);

/**
 * Puts stock back for every line of a cancelled order. `inventoryApplied` is the
 * idempotency flag: the caller must have already flipped it false atomically, so
 * two concurrent cancels can never both reach this.
 */
async function restock(items: Array<{ variantId: Types.ObjectId; quantity: number }>) {
  if (items.length === 0) return;
  await ProductVariant.bulkWrite(
    items.map((i) => ({
      updateOne: {
        filter: { _id: i.variantId },
        update: { $inc: { inventoryQuantity: i.quantity } },
      },
    }))
  );
}

export async function GET(_req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  try {
    await connectDB();
    const order = await Order.findById(id).lean();
    if (!order) return jsonError("Order not found", 404);
    return NextResponse.json({ order: { ...order, _id: String(order._id) } });
  } catch (err) {
    return serverError("admin/orders/[id]:GET", err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  const parsed = parseWith(actionSchema, await readJson(req));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;
  const actor = guard.session.email;

  try {
    await connectDB();
    const order = await Order.findById(id);
    if (!order) return jsonError("Order not found", 404);

    if (input.action === "cancel") {
      if (order.status === "cancelled") {
        return jsonError("That order is already cancelled.", 409);
      }

      // Atomic flip: only the update that actually clears inventoryApplied restocks,
      // so a double-click or a retried request can never restock twice.
      const claimed = await Order.findOneAndUpdate(
        { _id: order._id, inventoryApplied: true, status: { $ne: "cancelled" } },
        { $set: { inventoryApplied: false, status: "cancelled" } },
        { new: false }
      );

      if (claimed) {
        await restock(claimed.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })));
        const productIds = [...new Set(claimed.items.map((i) => String(i.productId)))];
        await Promise.all(productIds.map((pid) => syncProductInventory(pid)));
      } else {
        await Order.updateOne({ _id: order._id }, { $set: { status: "cancelled" } });
      }

      await Order.updateOne(
        { _id: order._id },
        {
          $push: {
            timeline: {
              status: "cancelled",
              note: input.note
                ? `${input.note} — by ${actor}`
                : claimed
                  ? `Cancelled by ${actor}. Stock returned.`
                  : `Cancelled by ${actor}.`,
              at: new Date(),
            },
          },
        }
      );

      const fresh = await Order.findById(id).lean();
      return NextResponse.json({
        order: fresh ? { ...fresh, _id: String(fresh._id) } : null,
        restocked: Boolean(claimed),
      });
    }

    const set: Record<string, unknown> = {};
    let event: { status: string; note?: string } | null = null;

    if (input.action === "status") {
      set.status = input.status;
      if (input.status === "shipped" && !order.fulfillment?.shippedAt) {
        set["fulfillment.shippedAt"] = new Date();
      }
      if (input.status === "delivered" && !order.fulfillment?.deliveredAt) {
        set["fulfillment.deliveredAt"] = new Date();
      }
      event = { status: input.status, note: input.note ? `${input.note} — by ${actor}` : `Status set to ${input.status} by ${actor}` };
    }

    if (input.action === "tracking") {
      set["fulfillment.carrier"] = input.carrier;
      set["fulfillment.trackingNumber"] = input.trackingNumber;
      if (input.trackingUrl) set["fulfillment.trackingUrl"] = input.trackingUrl;
      set["fulfillment.shippedAt"] = order.fulfillment?.shippedAt ?? new Date();
      if (order.status === "paid" || order.status === "processing" || order.status === "pending") {
        set.status = "shipped";
      }
      event = {
        status: "shipped",
        note: `Tracking added: ${input.carrier} ${input.trackingNumber} — by ${actor}`,
      };
    }

    if (input.action === "deliver") {
      set.status = "delivered";
      set["fulfillment.deliveredAt"] = order.fulfillment?.deliveredAt ?? new Date();
      event = { status: "delivered", note: `Marked delivered by ${actor}` };
    }

    if (input.action === "note") {
      event = { status: "note", note: `${input.note} — ${actor}` };
    }

    await Order.updateOne(
      { _id: order._id },
      {
        ...(Object.keys(set).length ? { $set: set } : {}),
        ...(event ? { $push: { timeline: { ...event, at: new Date() } } } : {}),
      }
    );

    const fresh = await Order.findById(id).lean();
    return NextResponse.json({ order: fresh ? { ...fresh, _id: String(fresh._id) } : null });
  } catch (err) {
    return serverError("admin/orders/[id]:PATCH", err);
  }
}
