"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReceiptText, Search } from "lucide-react";
import { DataTable, type Column } from "../DataTable";
import { Pagination } from "../Pagination";
import { EmptyState } from "../EmptyState";
import { StatusPill } from "../StatusPill";
import { Card, Input, Select } from "../ui";
import { formatDate, formatPrice } from "@/lib/utils";

export interface OrderRow {
  _id: string;
  orderNumber: string;
  email: string;
  grandTotal: number;
  status: string;
  paymentStatus: string;
  itemCount: number;
  createdAt: string;
}

const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
const PAYMENT_STATUSES = ["unpaid", "paid", "failed", "refunded", "expired"];

export function OrdersTable({
  rows,
  page,
  totalPages,
  total,
  query,
  status,
  paymentStatus,
}: {
  rows: OrderRow[];
  page: number;
  totalPages: number;
  total: number;
  query: string;
  status: string;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(query);

  function navigate(params: { q?: string; status?: string; paymentStatus?: string }) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.paymentStatus) sp.set("paymentStatus", params.paymentStatus);
    router.push(`/admin/orders${sp.toString() ? `?${sp}` : ""}`);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: q.trim() || undefined, status: status || undefined, paymentStatus: paymentStatus || undefined });
  }

  const columns: Column<OrderRow>[] = [
    {
      key: "order",
      header: "Order",
      cell: (o) => (
        <Link href={`/admin/orders/${o._id}`} className="font-medium text-teal-800 hover:underline">
          {o.orderNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (o) => <span className="max-w-[200px] truncate text-ink-600">{o.email}</span>,
    },
    { key: "items", header: "Items", cell: (o) => <span className="text-ink-600">{o.itemCount}</span> },
    { key: "date", header: "Date", cell: (o) => <span className="text-ink-500">{formatDate(o.createdAt)}</span> },
    {
      key: "status",
      header: "Status",
      cell: (o) => (
        <div className="flex flex-wrap gap-1">
          <StatusPill status={o.status} />
          {o.paymentStatus !== "paid" && <StatusPill status={o.paymentStatus} />}
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      cell: (o) => <span className="font-medium text-ink-900">{formatPrice(o.grandTotal)}</span>,
      className: "text-right",
      headClassName: "text-right",
    },
  ];

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 p-3.5 sm:p-4">
        <form onSubmit={submitSearch} className="flex max-w-xs flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Order number or email…"
              className="pl-9"
            />
          </div>
        </form>

        <Select
          value={status}
          onChange={(e) => navigate({ q: query || undefined, status: e.target.value || undefined, paymentStatus: paymentStatus || undefined })}
          className="w-auto"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>

        <Select
          value={paymentStatus}
          onChange={(e) => navigate({ q: query || undefined, status: status || undefined, paymentStatus: e.target.value || undefined })}
          className="w-auto"
        >
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r._id}
        empty={
          <EmptyState
            icon={ReceiptText}
            title={query || status || paymentStatus ? "No orders match" : "No orders yet"}
            description={
              query || status || paymentStatus
                ? "Try a different search or filter."
                : "Orders will appear here once customers start checking out."
            }
          />
        }
      />
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        basePath="/admin/orders"
        params={{ q: query || undefined, status: status || undefined, paymentStatus: paymentStatus || undefined }}
      />
    </Card>
  );
}

export default OrdersTable;
