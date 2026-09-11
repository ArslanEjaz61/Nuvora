import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink, Package } from "lucide-react";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export interface OrderViewItem {
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  sku: string;
  slug: string;
  image?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderViewAddress {
  label?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  email: string;
  status: string;
  paymentStatus: string;
  items: OrderViewItem[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  couponCode?: string | null;
  shippingAddress?: OrderViewAddress | null;
  billingAddress?: OrderViewAddress | null;
  fulfillment?: {
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
  } | null;
  timeline: { status: string; note?: string; at: string }[];
  customerNote?: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface OrderSummaryView {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  currency: string;
  itemCount: number;
  firstItem: { title: string; image?: string | null; slug: string } | null;
  createdAt: string;
}

const statusTone: Record<string, string> = {
  pending: "bg-gold-100 text-gold-700",
  paid: "bg-teal-100 text-teal-800",
  processing: "bg-teal-100 text-teal-800",
  shipped: "bg-teal-900 text-white",
  delivered: "bg-teal-900 text-white",
  cancelled: "bg-ink-200 text-ink-700",
  refunded: "bg-ink-200 text-ink-700",
  unpaid: "bg-gold-100 text-gold-700",
  failed: "bg-ink-200 text-ink-700",
  expired: "bg-ink-200 text-ink-700",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        statusTone[status] ?? "bg-ink-100 text-ink-700",
        className
      )}
    >
      {status}
    </span>
  );
}

function AddressBlock({
  title,
  address,
}: {
  title: string;
  address?: OrderViewAddress | null;
}) {
  return (
    <div>
      <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-ink-500">
        {title}
      </h3>
      {address ? (
        <address className="mt-3 text-sm not-italic leading-relaxed text-ink-700">
          <span className="block text-ink-900">{address.fullName}</span>
          <span className="block">{address.line1}</span>
          {address.line2 && <span className="block">{address.line2}</span>}
          <span className="block">
            {address.city}, {address.state} {address.postalCode}
          </span>
          <span className="block">{address.country}</span>
          {address.phone && <span className="mt-1 block text-ink-500">{address.phone}</span>}
        </address>
      ) : (
        <p className="mt-3 text-sm text-ink-500">Not provided.</p>
      )}
    </div>
  );
}

/** Shared between the signed-in order detail page and guest order tracking. */
export function OrderDetailView({ order }: { order: OrderView }) {
  const totals: { label: string; value: number; accent?: boolean }[] = [
    { label: "Subtotal", value: order.subtotal },
    ...(order.discountTotal > 0
      ? [{ label: `Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, value: -order.discountTotal }]
      : []),
    { label: "Shipping", value: order.shippingTotal },
    ...(order.taxTotal > 0 ? [{ label: "Tax", value: order.taxTotal }] : []),
  ];

  const tracking = order.fulfillment;
  const hasTracking = Boolean(tracking?.carrier || tracking?.trackingNumber);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-200 pb-6">
        <div>
          <h1 className="font-display text-2xl text-ink-900 md:text-3xl">
            Order {order.orderNumber}
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Placed {formatDate(order.createdAt)} · {order.items.length}{" "}
            {order.items.length === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={order.status} />
          <StatusPill status={order.paymentStatus} />
        </div>
      </div>

      {hasTracking && (
        <section className="rounded-card border border-teal-200 bg-teal-50 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg text-teal-900">
            <Package size={18} aria-hidden />
            Shipment
          </h2>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {tracking?.carrier && (
              <div className="flex gap-2">
                <dt className="text-ink-500">Carrier</dt>
                <dd className="text-ink-900">{tracking.carrier}</dd>
              </div>
            )}
            {tracking?.trackingNumber && (
              <div className="flex gap-2">
                <dt className="text-ink-500">Tracking number</dt>
                <dd className="break-all text-ink-900">{tracking.trackingNumber}</dd>
              </div>
            )}
            {tracking?.shippedAt && (
              <div className="flex gap-2">
                <dt className="text-ink-500">Shipped</dt>
                <dd className="text-ink-900">{formatDate(tracking.shippedAt)}</dd>
              </div>
            )}
            {tracking?.deliveredAt && (
              <div className="flex gap-2">
                <dt className="text-ink-500">Delivered</dt>
                <dd className="text-ink-900">{formatDate(tracking.deliveredAt)}</dd>
              </div>
            )}
          </dl>
          {tracking?.trackingUrl && (
            <a
              href={tracking.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-teal-800 underline underline-offset-4 hover:text-teal-900"
            >
              Track this shipment
              <ExternalLink size={14} aria-hidden />
            </a>
          )}
        </section>
      )}

      <section>
        <h2 className="font-display text-lg text-ink-900">Items</h2>
        <ul className="mt-4 divide-y divide-ink-200 border-y border-ink-200">
          {order.items.map((item) => (
            <li key={`${item.productId}-${item.variantId}`} className="flex gap-4 py-4">
              <Link
                href={`/products/${item.slug}`}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-ink-200 bg-ink-50"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid h-full place-items-center text-[10px] text-ink-400">
                    No image
                  </span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${item.slug}`}
                  className="line-clamp-2 text-sm font-medium text-ink-900 hover:text-teal-900"
                >
                  {item.title}
                </Link>
                {item.variantTitle && (
                  <p className="mt-0.5 text-xs text-ink-500">{item.variantTitle}</p>
                )}
                <p className="mt-1 text-xs text-ink-500">
                  {formatPrice(item.unitPrice)} × {item.quantity}
                </p>
              </div>

              <div className="shrink-0 text-sm font-semibold text-ink-900">
                {formatPrice(item.lineTotal)}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-lg text-ink-900">Summary</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            {totals.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-ink-500">{row.label}</dt>
                <dd className="text-ink-900">
                  {row.value < 0 ? `−${formatPrice(-row.value)}` : formatPrice(row.value)}
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-ink-200 pt-3 text-base">
              <dt className="font-medium text-ink-900">Total</dt>
              <dd className="font-semibold text-ink-900">{formatPrice(order.grandTotal)}</dd>
            </div>
          </dl>

          {order.customerNote && (
            <div className="mt-6 rounded-card bg-ink-50 p-4">
              <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-ink-500">
                Your note
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{order.customerNote}</p>
            </div>
          )}
        </section>

        <section className="grid gap-8 sm:grid-cols-2 lg:gap-6">
          <AddressBlock title="Shipping address" address={order.shippingAddress} />
          <AddressBlock title="Billing address" address={order.billingAddress} />
        </section>
      </div>

      {order.timeline.length > 0 && (
        <section className="border-t border-ink-200 pt-8">
          <h2 className="font-display text-lg text-ink-900">Progress</h2>
          <ol className="mt-5 space-y-0">
            {order.timeline.map((event, i) => {
              const isLast = i === order.timeline.length - 1;
              return (
                <li key={`${event.status}-${i}`} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    {isLast ? (
                      <Circle size={18} className="text-teal-600" aria-hidden />
                    ) : (
                      <CheckCircle2 size={18} className="text-teal-700" aria-hidden />
                    )}
                    {!isLast && <span className="w-px flex-1 bg-ink-200" aria-hidden />}
                  </div>
                  <div className={cn("pb-6", isLast && "pb-0")}>
                    <p className="text-sm font-medium capitalize text-ink-900">{event.status}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{formatDate(event.at)}</p>
                    {event.note && (
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{event.note}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
