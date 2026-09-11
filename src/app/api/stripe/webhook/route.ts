import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { connectDB } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { Cart } from "@/models/Cart";
import { Coupon } from "@/models/Coupon";
import { Order, type IOrder } from "@/models/Order";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";

// Signature verification needs the untouched bytes, which the edge runtime and
// any JSON parsing would destroy.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe:webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe:webhook] missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Raw text, never req.json() — the signature covers the exact body bytes.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[stripe:webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    await connectDB();

    switch (event.type) {
      case "checkout.session.completed":
        await handleSessionCompleted(event.data.object);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      case "checkout.session.expired":
        await handleSessionExpired(event.data.object);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // A 500 makes Stripe retry, which is what we want for a transient DB fault.
    console.error(`[stripe:webhook] handler failed for ${event.type}`, err);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}

async function findOrder(opts: {
  orderId?: string | null;
  sessionId?: string | null;
  paymentIntentId?: string | null;
}) {
  if (opts.orderId) {
    const byId = await Order.findById(opts.orderId).lean<IOrder | null>();
    if (byId) return byId;
  }
  if (opts.sessionId) {
    const bySession = await Order.findOne({ stripeSessionId: opts.sessionId }).lean<IOrder | null>();
    if (bySession) return bySession;
  }
  if (opts.paymentIntentId) {
    return Order.findOne({ stripePaymentIntentId: opts.paymentIntentId }).lean<IOrder | null>();
  }
  return null;
}

/**
 * Flips the order to paid and applies inventory exactly once.
 *
 * The filter excludes orders that are already paid, so a replayed or duplicated
 * event matches nothing and no stock is decremented a second time. Inventory is
 * only touched when this very update is the one that set inventoryApplied.
 */
async function markPaid(order: IOrder, paymentIntentId?: string | null) {
  const previous = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: "paid" } },
    {
      $set: {
        paymentStatus: "paid",
        status: "paid",
        paidAt: new Date(),
        inventoryApplied: true,
        ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
      },
      $push: { timeline: { status: "paid", note: "Payment confirmed by Stripe.", at: new Date() } },
    },
    { new: false }
  ).lean<IOrder | null>();

  if (!previous) return false;
  if (previous.inventoryApplied) return false;

  await applyInventory(previous);

  if (previous.couponCode) {
    await Coupon.updateOne(
      { code: previous.couponCode.toUpperCase() },
      { $inc: { redemptionCount: 1 } }
    );
  }

  return true;
}

async function applyInventory(order: IOrder) {
  await Promise.all(
    order.items.map(async (item) => {
      await ProductVariant.updateOne(
        { _id: item.variantId },
        { $inc: { inventoryQuantity: -item.quantity } }
      );
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { soldCount: item.quantity, totalInventory: -item.quantity } }
      );
    })
  );
}

async function handleSessionCompleted(session: Stripe.Checkout.Session) {
  const order = await findOrder({
    orderId: session.metadata?.orderId ?? session.client_reference_id,
    sessionId: session.id,
  });

  if (!order) {
    console.error(`[stripe:webhook] no order for checkout session ${session.id}`);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
    await markPaid(order, paymentIntentId);
  } else if (paymentIntentId) {
    await Order.updateOne(
      { _id: order._id, paymentStatus: { $ne: "paid" } },
      { $set: { stripePaymentIntentId: paymentIntentId } }
    );
  }

  const cartId = session.metadata?.cartId;
  if (cartId) {
    await Cart.updateOne({ _id: cartId }, { $set: { items: [], couponCode: null } });
  } else if (order.userId) {
    await Cart.updateOne({ userId: order.userId }, { $set: { items: [], couponCode: null } });
  }
}

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  const order = await findOrder({
    orderId: intent.metadata?.orderId,
    paymentIntentId: intent.id,
  });

  if (!order) return;
  await markPaid(order, intent.id);
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  const order = await findOrder({
    orderId: intent.metadata?.orderId,
    paymentIntentId: intent.id,
  });

  if (!order) return;

  await Order.updateOne(
    { _id: order._id, paymentStatus: { $ne: "paid" } },
    {
      $set: { paymentStatus: "failed", stripePaymentIntentId: intent.id },
      $push: {
        timeline: {
          status: "payment_failed",
          note: intent.last_payment_error?.message ?? "Payment failed.",
          at: new Date(),
        },
      },
    }
  );
}

async function handleSessionExpired(session: Stripe.Checkout.Session) {
  const order = await findOrder({
    orderId: session.metadata?.orderId ?? session.client_reference_id,
    sessionId: session.id,
  });

  if (!order) return;

  // Nothing to release: stock is only ever taken once payment is confirmed.
  await Order.updateOne(
    { _id: order._id, paymentStatus: { $ne: "paid" } },
    {
      $set: { paymentStatus: "expired", status: "cancelled" },
      $push: {
        timeline: { status: "expired", note: "Checkout session expired.", at: new Date() },
      },
    }
  );
}
