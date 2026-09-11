import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { findCart } from "@/lib/cart";
import { priceCart } from "@/lib/pricing";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getSiteUrl, getStripe } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validation";
import { Order } from "@/models/Order";
import { ProductVariant, type IProductVariant } from "@/models/ProductVariant";
import { generateOrderNumber } from "../_lib/order-number";
import { jsonError, parseWith, readJson, serverError, tooManyRequests } from "../_lib/http";

export const dynamic = "force-dynamic";

const STRIPE_MINIMUM_CENTS = 50;

export async function POST(req: Request) {
  try {
    const ip = await getClientIp();
    const limit = rateLimit(`checkout:${ip}`, 20, 60 * 60 * 1000);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfter, "Too many checkout attempts. Try again later.");
    }

    const parsed = parseWith(checkoutSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

    await connectDB();

    const cart = await findCart();
    if (!cart || cart.items.length === 0) {
      return jsonError("Your cart is empty.", 400);
    }

    // Every figure below comes from the database, never from the request body.
    const priced = await priceCart(cart.items, cart.couponCode);

    if (priced.lines.length === 0 || priced.itemCount === 0) {
      return jsonError("Your cart is empty.", 400);
    }

    const unavailable = priced.lines.filter((line) => !line.inStock || line.quantity < 1);
    if (unavailable.length > 0) {
      return jsonError(
        `${unavailable.map((l) => l.title).join(", ")} ${
          unavailable.length === 1 ? "is" : "are"
        } out of stock. Remove ${unavailable.length === 1 ? "it" : "them"} to continue.`,
        400,
        { unavailable: unavailable.map((l) => ({ variantId: l.variantId, title: l.title })) }
      );
    }

    // Re-read stock at this instant; the priced snapshot could be seconds old.
    const variants = await ProductVariant.find({
      _id: { $in: priced.lines.map((l) => l.variantId) },
      active: true,
    })
      .select("_id inventoryQuantity inventoryPolicy")
      .lean<Pick<IProductVariant, "_id" | "inventoryQuantity" | "inventoryPolicy">[]>();

    const stockMap = new Map(variants.map((v) => [String(v._id), v]));

    for (const line of priced.lines) {
      const variant = stockMap.get(line.variantId);
      if (!variant) {
        return jsonError(`${line.title} is no longer available.`, 400, {
          variantId: line.variantId,
        });
      }
      const available =
        variant.inventoryPolicy === "continue" ? Infinity : Math.max(0, variant.inventoryQuantity);
      if (line.quantity > available) {
        return jsonError(
          available === 0
            ? `${line.title} just sold out.`
            : `Only ${available} of ${line.title} left. Lower the quantity to continue.`,
          400,
          { variantId: line.variantId, available: available === Infinity ? null : available }
        );
      }
    }

    if (priced.grandTotal < STRIPE_MINIMUM_CENTS) {
      return jsonError("This order total is too low to process. Please contact us.", 400);
    }

    const session = await getSession();
    const billing = input.billingSameAsShipping
      ? input.shippingAddress
      : (input.billingAddress ?? input.shippingAddress);

    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      userId: session ? session.userId : null,
      email: input.email,
      items: priced.lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        title: line.title,
        variantTitle: line.variantTitle,
        sku: line.sku,
        image: line.image,
        slug: line.slug,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
      subtotal: priced.subtotal,
      discountTotal: priced.discountTotal,
      shippingTotal: priced.shippingTotal,
      taxTotal: priced.taxTotal,
      grandTotal: priced.grandTotal,
      currency: priced.currency,
      couponCode: priced.coupon?.code,
      status: "pending",
      paymentStatus: "unpaid",
      inventoryApplied: false,
      shippingAddress: input.shippingAddress,
      billingAddress: billing,
      customerNote: input.customerNote || undefined,
      timeline: [{ status: "pending", note: "Order created, awaiting payment.", at: new Date() }],
    });

    const currency = priced.currency.toLowerCase();
    const stripe = getStripe();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priced.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency,
        unit_amount: line.unitPrice,
        product_data: {
          name: line.variantTitle ? `${line.title} — ${line.variantTitle}` : line.title,
          images: line.image?.startsWith("http") ? [line.image] : undefined,
          metadata: { productId: line.productId, variantId: line.variantId, sku: line.sku },
        },
      },
    }));

    if (priced.taxTotal > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: priced.taxTotal,
          product_data: { name: "Tax" },
        },
      });
    }

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: lineItems,
      client_reference_id: String(order._id),
      customer_email: input.email,
      metadata: {
        orderId: String(order._id),
        orderNumber,
        cartId: String(cart._id),
      },
      payment_intent_data: {
        metadata: { orderId: String(order._id), orderNumber },
      },
      success_url: `${getSiteUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getSiteUrl()}/cart`,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    };

    if (priced.shippingTotal > 0) {
      params.shipping_options = [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: "Standard shipping",
            fixed_amount: { amount: priced.shippingTotal, currency },
          },
        },
      ];
    }

    if (priced.discountTotal > 0) {
      // The discount is a real Stripe object so the amount charged matches the
      // total we computed — it is never silently dropped.
      const stripeCoupon = await stripe.coupons.create({
        amount_off: priced.discountTotal,
        currency,
        duration: "once",
        name: priced.coupon?.code ? `${priced.coupon.code} discount` : "Discount",
        metadata: { orderNumber },
      });
      params.discounts = [{ coupon: stripeCoupon.id }];
    }

    const checkoutSession = await stripe.checkout.sessions.create(params);

    if (!checkoutSession.url) {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: { status: "cancelled" },
          $push: {
            timeline: { status: "cancelled", note: "Stripe returned no checkout URL.", at: new Date() },
          },
        }
      ).catch(() => undefined);
      return jsonError("We couldn't start checkout. Please try again.", 502);
    }

    await Order.updateOne(
      { _id: order._id },
      { $set: { stripeSessionId: checkoutSession.id } }
    );

    return NextResponse.json({ url: checkoutSession.url, orderId: String(order._id) });
  } catch (err) {
    return serverError("checkout", err);
  }
}
