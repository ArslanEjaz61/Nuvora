"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  ExternalLink,
  Package,
  Truck,
} from "lucide-react";
import { Card, CardHeader, Button, Input, Select, Textarea } from "../ui";
import { StatusPill } from "../StatusPill";
import { useConfirm } from "../ConfirmDialog";
import { useToast } from "../Toast";
import { formatDate, formatPrice } from "@/lib/utils";

interface OrderItem {
  title: string;
  variantTitle: string;
  sku: string;
  image?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Address {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface TimelineEvent {
  status: string;
  note?: string;
  at: string;
}

export interface OrderData {
  _id: string;
  orderNumber: string;
  email: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  couponCode?: string;
  status: string;
  paymentStatus: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  fulfillment?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippedAt?: string;
    deliveredAt?: string;
  };
  timeline: TimelineEvent[];
  customerNote?: string;
  createdAt: string;
}

export interface OtherOrder {
  _id: string;
  orderNumber: string;
  grandTotal: number;
  status: string;
  createdAt: string;
}

const NEXT_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

export function OrderDetail({ order, otherOrders }: { order: OrderData; otherOrders: OtherOrder[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [status, setStatus] = useState(order.status);
  const [statusNote, setStatusNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const [carrier, setCarrier] = useState(order.fulfillment?.carrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.fulfillment?.trackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.fulfillment?.trackingUrl ?? "");
  const [savingTracking, setSavingTracking] = useState(false);

  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/orders/${order._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "That action failed.");
    return data;
  }

  async function saveStatus() {
    if (status === order.status && !statusNote.trim()) return;
    setSavingStatus(true);
    try {
      await patch({ action: "status", status, note: statusNote.trim() || undefined });
      toast.success("Order status updated.");
      setStatusNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveTracking() {
    if (!carrier.trim() || !trackingNumber.trim()) {
      toast.error("Carrier and tracking number are required.");
      return;
    }
    setSavingTracking(true);
    try {
      await patch({
        action: "tracking",
        carrier: carrier.trim(),
        trackingNumber: trackingNumber.trim(),
        trackingUrl: trackingUrl.trim() || undefined,
      });
      toast.success("Tracking added — the order is marked shipped.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save tracking.");
    } finally {
      setSavingTracking(false);
    }
  }

  async function markDelivered() {
    try {
      await patch({ action: "deliver" });
      toast.success("Marked delivered.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark delivered.");
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await patch({ action: "note", note: note.trim() });
      toast.success("Note added.");
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add note.");
    } finally {
      setSavingNote(false);
    }
  }

  async function cancelOrder() {
    const ok = await confirm({
      title: "Cancel this order?",
      message:
        order.paymentStatus === "paid"
          ? "This order was paid. Stock for every line item will be returned to inventory."
          : "This order has not been paid, so no stock will be restocked.",
      destructive: true,
      confirmLabel: "Cancel order",
    });
    if (!ok) return;

    setCancelling(true);
    try {
      const result = await patch({ action: "cancel" });
      toast.success(result.restocked ? "Order cancelled and stock restored." : "Order cancelled.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel this order.");
    } finally {
      setCancelling(false);
    }
  }

  const stripeDashboardBase = "https://dashboard.stripe.com";

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="flex flex-col gap-4 xl:col-span-2">
        <Card>
          <CardHeader
            title="Items"
            action={
              <div className="flex gap-1.5">
                <StatusPill status={order.status} />
                <StatusPill status={order.paymentStatus} />
              </div>
            }
          />
          <ul className="divide-y divide-ink-100">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="h-14 w-12 shrink-0 overflow-hidden rounded border border-ink-200 bg-ink-100">
                  {item.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="m-3 h-6 w-6 text-ink-400" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{item.title}</p>
                  <p className="truncate text-xs text-ink-500">
                    {item.variantTitle} · {item.sku} · Qty {item.quantity}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-ink-900">
                  {formatPrice(item.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-ink-200 px-4 py-4 text-sm sm:px-5">
            <Row label="Subtotal" value={formatPrice(order.subtotal)} />
            {order.discountTotal > 0 && (
              <Row
                label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                value={`−${formatPrice(order.discountTotal)}`}
                accent
              />
            )}
            <Row label="Shipping" value={order.shippingTotal === 0 ? "Free" : formatPrice(order.shippingTotal)} />
            {order.taxTotal > 0 && <Row label="Tax" value={formatPrice(order.taxTotal)} />}
            <div className="flex justify-between border-t border-ink-200 pt-2 text-base font-semibold text-ink-900">
              <span>Total</span>
              <span>{formatPrice(order.grandTotal)}</span>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Fulfilment" />
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <div>
              <label className="text-xs font-medium text-ink-700">Carrier</label>
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} className="mt-1.5" placeholder="e.g. UPS" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-700">Tracking number</label>
              <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ink-700">Tracking URL (optional)</label>
              <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} className="mt-1.5" />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={saveTracking} loading={savingTracking}>
                <Truck className="h-3.5 w-3.5" /> Save & mark shipped
              </Button>
              {order.status !== "delivered" && order.status !== "cancelled" && (
                <Button variant="secondary" onClick={markDelivered}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark delivered
                </Button>
              )}
            </div>
            {order.fulfillment?.trackingUrl && (
              <a
                href={order.fulfillment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline sm:col-span-2"
              >
                Track package <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Timeline" />
          {order.timeline.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-500 sm:px-5">No events yet.</p>
          ) : (
            <ol className="space-y-0 px-4 py-4 sm:px-5">
              {[...order.timeline].reverse().map((event, i) => (
                <li key={i} className="relative border-l border-ink-200 pb-4 pl-4 last:pb-0">
                  <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-teal-700" />
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={event.status} />
                    <span className="text-xs text-ink-400">{formatDate(event.at)}</span>
                  </div>
                  {event.note && <p className="mt-1 text-sm text-ink-600">{event.note}</p>}
                </li>
              ))}
            </ol>
          )}

          <div className="flex gap-2 border-t border-ink-200 p-4 sm:p-5">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add an internal note…"
              rows={2}
              className="flex-1"
            />
            <Button onClick={addNote} loading={savingNote} className="self-end">
              Add
            </Button>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Update status" />
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {NEXT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
            <Input
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Optional note"
            />
            <Button onClick={saveStatus} loading={savingStatus}>
              Save status
            </Button>

            {order.status !== "cancelled" && (
              <Button variant="danger" onClick={cancelOrder} loading={cancelling}>
                <Ban className="h-3.5 w-3.5" /> Cancel order
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Customer" />
          <dl className="space-y-2 p-4 text-sm sm:p-5">
            <div>
              <dt className="text-xs text-ink-500">Email</dt>
              <dd className="text-ink-900">{order.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Order placed</dt>
              <dd className="text-ink-900">{formatDate(order.createdAt)}</dd>
            </div>
            {order.customerNote && (
              <div>
                <dt className="text-xs text-ink-500">Customer note</dt>
                <dd className="text-ink-900">{order.customerNote}</dd>
              </div>
            )}
          </dl>
          {otherOrders.length > 0 && (
            <div className="border-t border-ink-200 p-4 sm:p-5">
              <p className="mb-2 text-xs font-medium text-ink-700">Other orders</p>
              <ul className="space-y-1.5">
                {otherOrders.map((o) => (
                  <li key={o._id} className="flex items-center justify-between text-sm">
                    <Link href={`/admin/orders/${o._id}`} className="text-teal-800 hover:underline">
                      {o.orderNumber}
                    </Link>
                    <span className="text-ink-500">{formatPrice(o.grandTotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {order.shippingAddress && (
          <Card>
            <CardHeader title="Shipping address" />
            <AddressBlock address={order.shippingAddress} />
          </Card>
        )}

        {order.billingAddress && (
          <Card>
            <CardHeader title="Billing address" />
            <AddressBlock address={order.billingAddress} />
          </Card>
        )}

        {(order.stripeSessionId || order.stripePaymentIntentId) && (
          <Card>
            <CardHeader title="Payment" />
            <div className="space-y-2 p-4 text-xs sm:p-5">
              {order.stripePaymentIntentId && (
                <a
                  href={`${stripeDashboardBase}/payments/${order.stripePaymentIntentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-teal-700 hover:underline"
                >
                  View payment intent in Stripe <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {order.stripeSessionId && (
                <p className="break-all text-ink-400">Session: {order.stripeSessionId}</p>
              )}
              <p className="text-ink-500">
                Refunds are issued from the Stripe dashboard, not here.
              </p>
            </div>
          </Card>
        )}
      </div>
      {dialog}
    </div>
  );
}

function AddressBlock({ address }: { address: Address }) {
  return (
    <div className="p-4 text-sm leading-relaxed text-ink-700 sm:p-5">
      <p className="font-medium text-ink-900">{address.fullName}</p>
      <p>{address.line1}</p>
      {address.line2 && <p>{address.line2}</p>}
      <p>
        {address.city}, {address.state} {address.postalCode}
      </p>
      <p>{address.country}</p>
      {address.phone && <p className="mt-1 text-ink-500">{address.phone}</p>}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-teal-700" : "text-ink-600"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default OrderDetail;
