"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { DataTable, type Column } from "../DataTable";
import { StatusPill } from "../StatusPill";
import { EmptyState } from "../EmptyState";
import { Button } from "../ui";
import { useToast } from "../Toast";
import { useConfirm } from "../ConfirmDialog";

export interface ProductRow {
  _id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  status: string;
  image?: string;
  variantCount: number;
  inventory: number;
  featured: boolean;
}

type BulkAction = "activate" | "archive" | "draft" | "delete";

export function ProductsTable({ rows, hasFilters }: { rows: ProductRow[]; hasFilters: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function runBulk(action: BulkAction) {
    if (selected.length === 0) return;
    if (action === "delete") {
      const ok = await confirm({
        title: `Delete ${selected.length} product${selected.length > 1 ? "s" : ""}?`,
        message:
          "This also removes their variants, reviews and any wishlist entries. It can't be undone.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "That didn't work.");
      }
      toast.success(
        action === "delete"
          ? `${selected.length} product${selected.length > 1 ? "s" : ""} deleted.`
          : `${selected.length} product${selected.length > 1 ? "s" : ""} updated.`
      );
      setSelected([]);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<ProductRow>[] = [
    {
      key: "product",
      header: "Product",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-ink-200 bg-ink-100">
            {p.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={p.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package className="h-4 w-4 text-ink-400" />
            )}
          </span>
          <div className="min-w-0">
            <Link
              href={`/admin/products/${p._id}/edit`}
              className="block max-w-[220px] truncate font-medium text-ink-900 hover:text-teal-800"
            >
              {p.title}
            </Link>
            <p className="truncate text-xs text-ink-500">/{p.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "skus",
      header: "SKUs",
      cell: (p) => <span className="text-ink-600">{p.variantCount}</span>,
    },
    {
      key: "price",
      header: "Price",
      cell: (p) => (
        <div className="whitespace-nowrap">
          <span className="font-medium">{formatPrice(p.price)}</span>
          {p.compareAtPrice && p.compareAtPrice > p.price && (
            <span className="ml-1.5 text-xs text-ink-400 line-through">
              {formatPrice(p.compareAtPrice)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "inventory",
      header: "Inventory",
      cell: (p) =>
        p.variantCount === 0 ? (
          <span className="text-xs text-ink-400">No variants</span>
        ) : (
          <span className={p.inventory === 0 ? "font-medium text-red-600" : "text-ink-600"}>
            {p.inventory} in stock
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => (
        <div className="flex flex-wrap gap-1">
          <StatusPill status={p.status} />
          {p.featured && <StatusPill status="featured" tone="warning" />}
        </div>
      ),
    },
  ];

  return (
    <>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 bg-teal-50/60 px-4 py-2.5">
          <span className="text-xs font-medium text-teal-900">
            {selected.length} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => runBulk("activate")}>
              Activate
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => runBulk("archive")}>
              Archive
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => runBulk("delete")}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className={pending ? "opacity-60 transition-opacity" : undefined}>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p._id}
          selectable
          selectedIds={selected}
          onToggle={(id) =>
            setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
          }
          onToggleAll={(ids, next) => setSelected(next ? ids : [])}
          empty={
            <EmptyState
              icon={Package}
              title={hasFilters ? "No products match those filters" : "No products yet"}
              description={
                hasFilters
                  ? "Try clearing the search or switching the status filter."
                  : "Add your first product to start building the catalogue."
              }
              action={
                !hasFilters ? (
                  <Link href="/admin/products/new">
                    <Button size="sm">New product</Button>
                  </Link>
                ) : undefined
              }
            />
          }
        />
      </div>
      {dialog}
    </>
  );
}

export default ProductsTable;
