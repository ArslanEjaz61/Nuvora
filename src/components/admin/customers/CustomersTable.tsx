"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { DataTable, type Column } from "../DataTable";
import { Pagination } from "../Pagination";
import { EmptyState } from "../EmptyState";
import { StatusPill } from "../StatusPill";
import { Card, Input } from "../ui";
import { formatDate, formatPrice } from "@/lib/utils";

export interface CustomerRow {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "customer" | "admin";
  orderCount: number;
  lifetimeSpend: number;
  createdAt: string;
}

export function CustomersTable({
  rows,
  page,
  totalPages,
  total,
  query,
}: {
  rows: CustomerRow[];
  page: number;
  totalPages: number;
  total: number;
  query: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(query);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    router.push(`/admin/customers${sp.toString() ? `?${sp}` : ""}`);
  }

  const columns: Column<CustomerRow>[] = [
    {
      key: "name",
      header: "Customer",
      cell: (c) => (
        <Link href={`/admin/customers/${c._id}`} className="block min-w-0">
          <p className="truncate font-medium text-ink-900 hover:text-teal-800">
            {c.firstName} {c.lastName}
          </p>
          <p className="truncate text-xs text-ink-500">{c.email}</p>
        </Link>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (c) => <StatusPill status={c.role} tone={c.role === "admin" ? "brand" : "neutral"} />,
    },
    {
      key: "orders",
      header: "Orders",
      cell: (c) => <span className="text-ink-800">{c.orderCount}</span>,
    },
    {
      key: "spend",
      header: "Lifetime spend",
      cell: (c) => <span className="font-medium text-ink-900">{formatPrice(c.lifetimeSpend)}</span>,
    },
    {
      key: "joined",
      header: "Joined",
      cell: (c) => <span className="text-ink-500">{formatDate(c.createdAt)}</span>,
    },
  ];

  return (
    <Card>
      <div className="border-b border-ink-200 p-3.5 sm:p-4">
        <form onSubmit={submitSearch} className="flex max-w-sm gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or email…"
              className="pl-9"
            />
          </div>
        </form>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r._id}
        empty={
          <EmptyState
            icon={Users}
            title={query ? "No customers match your search" : "No customers yet"}
            description={query ? undefined : "Customers appear here once someone creates an account."}
          />
        }
      />
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        basePath="/admin/customers"
        params={{ q: query || undefined }}
      />
    </Card>
  );
}

export default CustomersTable;
