"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, MessageSquareQuote, ReceiptText, ShieldCheck } from "lucide-react";
import { StatCard } from "../StatCard";
import { Card, CardHeader, Button } from "../ui";
import { StatusPill } from "../StatusPill";
import { EmptyState } from "../EmptyState";
import { useConfirm } from "../ConfirmDialog";
import { useToast } from "../Toast";
import { Rating } from "@/components/ui/Rating";
import { formatDate, formatPrice } from "@/lib/utils";

export interface Address {
  _id?: string;
  label?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export interface Customer {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: "customer" | "admin";
  marketingOptIn: boolean;
  createdAt: string;
  addresses: Address[];
}

export interface OrderRow {
  _id: string;
  orderNumber: string;
  grandTotal: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export interface ReviewRow {
  _id: string;
  productTitle: string;
  productSlug: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  createdAt: string;
}

export function CustomerDetail({
  customer,
  orders,
  reviews,
  lifetimeSpend,
  isSelf,
}: {
  customer: Customer;
  orders: OrderRow[];
  reviews: ReviewRow[];
  lifetimeSpend: number;
  isSelf: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [saving, setSaving] = useState(false);

  async function toggleRole() {
    const nextRole = customer.role === "admin" ? "customer" : "admin";
    const ok = await confirm({
      title: nextRole === "admin" ? "Grant admin access?" : "Remove admin access?",
      message:
        nextRole === "admin"
          ? `${customer.firstName} will be able to manage products, orders and every part of the store.`
          : `${customer.firstName} will lose access to the admin panel.`,
      destructive: nextRole === "customer",
      confirmLabel: nextRole === "admin" ? "Grant access" : "Remove access",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${customer._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not update this customer's role.");
      toast.success("Role updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update this customer's role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lifetime spend" value={formatPrice(lifetimeSpend)} />
        <StatCard label="Orders" value={String(orders.length)} />
        <StatCard label="Reviews" value={String(reviews.length)} />
        <StatCard label="Customer since" value={formatDate(customer.createdAt)} />
      </div>

      <Card>
        <CardHeader
          title="Profile"
          action={
            <Button
              size="sm"
              variant={customer.role === "admin" ? "secondary" : "primary"}
              onClick={toggleRole}
              loading={saving}
              disabled={isSelf}
              title={isSelf ? "You can't change your own admin access" : undefined}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {customer.role === "admin" ? "Remove admin access" : "Make admin"}
            </Button>
          }
        />
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2 sm:p-5">
          <div>
            <dt className="text-xs text-ink-500">Email</dt>
            <dd className="text-ink-900">{customer.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">Phone</dt>
            <dd className="text-ink-900">{customer.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">Role</dt>
            <dd>
              <StatusPill status={customer.role} tone={customer.role === "admin" ? "brand" : "neutral"} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">Marketing emails</dt>
            <dd className="text-ink-900">{customer.marketingOptIn ? "Subscribed" : "Not subscribed"}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Addresses" />
        {customer.addresses.length === 0 ? (
          <EmptyState icon={MapPin} title="No saved addresses" />
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {customer.addresses.map((a, i) => (
              <div key={a._id ?? i} className="rounded-card border border-ink-200 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-ink-900">{a.fullName}</p>
                  <div className="flex gap-1">
                    {a.isDefaultShipping && <StatusPill status="ship default" tone="info" />}
                    {a.isDefaultBilling && <StatusPill status="bill default" tone="info" />}
                  </div>
                </div>
                <p className="mt-1 text-ink-600">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {a.city}, {a.state} {a.postalCode}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Order history" />
        {orders.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No orders yet" />
        ) : (
          <ul className="divide-y divide-ink-100">
            {orders.map((o) => (
              <li key={o._id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div>
                  <Link
                    href={`/admin/orders/${o._id}`}
                    className="font-medium text-teal-800 hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                  <p className="text-xs text-ink-500">{formatDate(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={o.status} />
                  <span className="text-sm font-medium text-ink-900">
                    {formatPrice(o.grandTotal)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Reviews" />
        {reviews.length === 0 ? (
          <EmptyState icon={MessageSquareQuote} title="No reviews written" />
        ) : (
          <ul className="divide-y divide-ink-100">
            {reviews.map((r) => (
              <li key={r._id} className="px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Rating value={r.rating} showCount={false} size={13} />
                  <Link href={`/products/${r.productSlug}`} className="text-sm text-teal-800 hover:underline">
                    {r.productTitle}
                  </Link>
                  <StatusPill status={r.status} />
                  <span className="ml-auto text-xs text-ink-400">{formatDate(r.createdAt)}</span>
                </div>
                {r.title && <p className="mt-1 text-sm font-medium text-ink-900">{r.title}</p>}
                <p className="mt-0.5 text-sm text-ink-600">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {dialog}
    </div>
  );
}

export default CustomerDetail;
