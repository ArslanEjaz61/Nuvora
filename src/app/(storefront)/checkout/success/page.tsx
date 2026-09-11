import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, Clock } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { ClearCartOnMount } from "@/components/checkout/ClearCartOnMount";
import { connectDB } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { Order, type IOrder } from "@/models/Order";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <Shell title="No order found">
        <p className="text-sm text-ink-600">
          We couldn&apos;t find an order to show. If you just paid, check your email for the
          confirmation.
        </p>
        <ButtonLink href="/" className="mt-6">
          Back to shop
        </ButtonLink>
      </Shell>
    );
  }

  await connectDB();
  const order = await Order.findOne({ stripeSessionId: sessionId }).lean<IOrder>();

  if (!order) {
    return (
      <Shell title="We couldn't find that order">
        <p className="text-sm text-ink-600">
          If your payment went through, a confirmation email is on its way. Contact us if it
          doesn&apos;t arrive.
        </p>
        <ButtonLink href="/contact" className="mt-6">
          Contact support
        </ButtonLink>
      </Shell>
    );
  }

  // The webhook is the only thing that marks an order paid, and it can land a
  // moment after the shopper returns here.
  const confirmed = order.paymentStatus === "paid";

  return (
    <>
      <ClearCartOnMount />
      <div className="container-page max-w-2xl py-14 md:py-20">
        <div className="text-center">
          {confirmed ? (
            <CheckCircle2 size={52} className="mx-auto text-teal-600" strokeWidth={1.3} />
          ) : (
            <Clock size={52} className="mx-auto text-gold-500" strokeWidth={1.3} />
          )}

          <h1 className="mt-5 font-display text-3xl text-ink-900">
            {confirmed ? "Thank you for your order" : "Payment is processing"}
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            {confirmed
              ? "Your order is confirmed. A receipt is on its way to your email."
              : "We're waiting on final confirmation from Stripe. This page will show as confirmed once it clears — your receipt will follow by email."}
          </p>

          <p className="mt-5 inline-block rounded bg-ink-50 px-4 py-2 text-sm">
            Order <span className="font-semibold text-ink-900">{order.orderNumber}</span>
          </p>
        </div>

        <div className="mt-10 rounded-card border border-ink-200 p-5 md:p-6">
          <h2 className="font-display text-lg text-ink-900">Order summary</h2>

          <ul className="mt-4 space-y-4">
            {order.items.map((item, i) => (
              <li key={i} className="flex gap-4">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-ink-50">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-900">{item.title}</p>
                  {item.variantTitle && (
                    <p className="text-xs text-ink-500">{item.variantTitle}</p>
                  )}
                  <p className="mt-1 text-xs text-ink-500">Qty {item.quantity}</p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-ink-900">
                  {formatPrice(item.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-2 border-t border-ink-200 pt-4 text-sm">
            <Row label="Subtotal" value={formatPrice(order.subtotal)} />
            {order.discountTotal > 0 && (
              <Row
                label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                value={`−${formatPrice(order.discountTotal)}`}
                accent
              />
            )}
            <Row
              label="Shipping"
              value={order.shippingTotal === 0 ? "Free" : formatPrice(order.shippingTotal)}
            />
            {order.taxTotal > 0 && <Row label="Tax" value={formatPrice(order.taxTotal)} />}
            <div className="flex justify-between border-t border-ink-200 pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(order.grandTotal)}</dd>
            </div>
          </dl>

          {order.shippingAddress && (
            <div className="mt-5 border-t border-ink-200 pt-4">
              <h3 className="text-sm font-medium text-ink-900">Shipping to</h3>
              <address className="mt-1.5 text-sm not-italic leading-relaxed text-ink-600">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && (
                  <>
                    <br />
                    {order.shippingAddress.line2}
                  </>
                )}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}
              </address>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/collections">Continue shopping</ButtonLink>
          <ButtonLink href="/account/orders" variant="outline">
            View your orders
          </ButtonLink>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-teal-700" : ""}`}>
      <dt className={accent ? "" : "text-ink-600"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-page max-w-lg py-20 text-center">
      <h1 className="font-display text-2xl text-ink-900">{title}</h1>
      <div className="mt-3">{children}</div>
    </div>
  );
}
