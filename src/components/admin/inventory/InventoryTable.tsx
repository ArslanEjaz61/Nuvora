"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Search } from "lucide-react";
import { DataTable, type Column } from "../DataTable";
import { Pagination } from "../Pagination";
import { EmptyState } from "../EmptyState";
import { StatusPill } from "../StatusPill";
import { Button, Card, Input } from "../ui";
import { useToast } from "../Toast";
import { cn } from "@/lib/utils";

export interface InventoryRow {
  _id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  title: string;
  sku: string;
  inventoryQuantity: number;
  inventoryPolicy: "deny" | "continue";
  lowStockThreshold: number;
  active: boolean;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
] as const;

export function InventoryTable({
  rows,
  page,
  totalPages,
  total,
  query,
  activeFilter,
}: {
  rows: InventoryRow[];
  page: number;
  totalPages: number;
  total: number;
  query: string;
  activeFilter: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState(query);
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(rows.map((r) => [r._id, r.inventoryQuantity]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDelta, setBulkDelta] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: q.trim() || undefined, filter: activeFilter, page: undefined });
  }

  function navigate(params: { q?: string; filter?: string; page?: string }) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.filter && params.filter !== "all") sp.set("filter", params.filter);
    if (params.page) sp.set("page", params.page);
    router.push(`/admin/inventory${sp.toString() ? `?${sp}` : ""}`);
  }

  async function saveQuantity(row: InventoryRow) {
    const quantity = values[row._id];
    if (quantity === row.inventoryQuantity) return;
    setSaving(row._id);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "set", variantId: row._id, quantity }),
      });
      if (!res.ok) throw new Error("Could not update stock.");
      toast.success(`${row.sku} updated to ${quantity}.`);
      router.refresh();
    } catch (err) {
      setValues((v) => ({ ...v, [row._id]: row.inventoryQuantity }));
      toast.error(err instanceof Error ? err.message : "Could not update stock.");
    } finally {
      setSaving(null);
    }
  }

  async function applyBulk() {
    const delta = Number(bulkDelta);
    if (!Number.isFinite(delta) || delta === 0 || selected.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "adjust", variantIds: selected, delta }),
      });
      if (!res.ok) throw new Error("Could not adjust stock.");
      toast.success(`Adjusted ${selected.length} variant${selected.length > 1 ? "s" : ""}.`);
      setSelected([]);
      setBulkDelta("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not adjust stock.");
    } finally {
      setBulkBusy(false);
    }
  }

  const columns: Column<InventoryRow>[] = [
    {
      key: "product",
      header: "Product",
      cell: (r) => (
        <Link
          href={`/admin/products/${r.productId}/edit`}
          className="block min-w-0 text-teal-800 hover:underline"
        >
          <p className="truncate font-medium">{r.productTitle}</p>
          <p className="truncate text-xs font-normal text-ink-500">{r.title}</p>
        </Link>
      ),
    },
    { key: "sku", header: "SKU", cell: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    {
      key: "policy",
      header: "Policy",
      cell: (r) => (
        <StatusPill status={r.inventoryPolicy === "deny" ? "stop at 0" : "backorder"} tone="neutral" />
      ),
    },
    {
      key: "qty",
      header: "Quantity",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={values[r._id] ?? 0}
            onChange={(e) => setValues((v) => ({ ...v, [r._id]: Math.max(0, Number(e.target.value) || 0) }))}
            onBlur={() => saveQuantity(r)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            disabled={saving === r._id}
            className={cn(
              "h-8 w-20 rounded border border-ink-200 px-2 text-sm outline-none focus:border-teal-500",
              values[r._id] === 0 && "border-red-300 bg-red-50",
              values[r._id] > 0 && values[r._id] <= r.lowStockThreshold && "border-gold-300 bg-gold-50"
            )}
          />
          {values[r._id] === 0 && <StatusPill status="out" tone="danger" />}
          {values[r._id] > 0 && values[r._id] <= r.lowStockThreshold && (
            <StatusPill status="low" tone="warning" />
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusPill status={r.active ? "active" : "inactive"} />,
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
              placeholder="Search SKU or product…"
              className="pl-9"
            />
          </div>
        </form>

        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => navigate({ q: query || undefined, filter: f.value })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                activeFilter === f.value
                  ? "bg-teal-900 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {selected.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-ink-500">{selected.length} selected</span>
            <Input
              type="number"
              value={bulkDelta}
              onChange={(e) => setBulkDelta(e.target.value)}
              placeholder="± qty"
              className="h-8 w-20"
            />
            <Button size="sm" variant="secondary" onClick={applyBulk} loading={bulkBusy}>
              Adjust
            </Button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r._id}
        selectable
        selectedIds={selected}
        onToggle={(id) =>
          setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
        }
        onToggleAll={(ids, next) => setSelected(next ? ids : [])}
        empty={
          <EmptyState
            icon={Package}
            title={query || activeFilter !== "all" ? "No variants match" : "No inventory yet"}
            description={
              query || activeFilter !== "all"
                ? "Try a different search or filter."
                : "Add products with variants to start tracking stock."
            }
          />
        }
      />
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        basePath="/admin/inventory"
        params={{ q: query || undefined, filter: activeFilter !== "all" ? activeFilter : undefined }}
      />
    </Card>
  );
}

export default InventoryTable;
