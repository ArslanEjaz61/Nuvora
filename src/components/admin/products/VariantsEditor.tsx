"use client";

import { useMemo, useState } from "react";
import { Layers, Plus, Trash2, Wand2 } from "lucide-react";
import { slugify } from "@/lib/utils";
import { Button, Card, CardHeader, Input, Select } from "../ui";
import { MoneyInput } from "../MoneyInput";
import { EmptyState } from "../EmptyState";
import { useToast } from "../Toast";
import { useConfirm } from "../ConfirmDialog";
import { ImageUploader, type UploadedImage } from "../ImageUploader";
import type { ProductOption } from "./OptionsEditor";

export interface VariantRow {
  _id: string;
  productId: string;
  sku: string;
  title: string;
  options: Array<{ name: string; value: string }>;
  price: number;
  compareAtPrice: number | null;
  inventoryQuantity: number;
  inventoryPolicy: "deny" | "continue";
  lowStockThreshold: number;
  active: boolean;
  image?: UploadedImage;
}

function cartesian(options: ProductOption[]): Array<Array<{ name: string; value: string }>> {
  const usable = options.filter((o) => o.name.trim() && o.values.length > 0);
  if (usable.length === 0) return [];
  return usable.reduce<Array<Array<{ name: string; value: string }>>>(
    (acc, option) =>
      acc.flatMap((combo) =>
        option.values.map((value) => [...combo, { name: option.name.trim(), value }])
      ),
    [[]]
  );
}

function comboKey(options: Array<{ name: string; value: string }>) {
  return options.map((o) => `${o.name}:${o.value}`).join("|");
}

export function VariantsEditor({
  productId,
  productTitle,
  savedOptions,
  basePrice,
  initialVariants,
}: {
  productId: string;
  productTitle: string;
  savedOptions: ProductOption[];
  basePrice: number;
  initialVariants: VariantRow[];
}) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = useState<VariantRow[]>(initialVariants);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const existingKeys = useMemo(
    () => new Set(rows.map((r) => comboKey(r.options))),
    [rows]
  );
  const missing = useMemo(
    () => cartesian(savedOptions).filter((c) => !existingKeys.has(comboKey(c))),
    [savedOptions, existingKeys]
  );

  function patchRow(id: string, patch: Partial<VariantRow>) {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
    setDirty((d) => ({ ...d, [id]: true }));
  }

  async function createVariant(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, ...body }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Could not create the variant.");
    return json.variant as VariantRow;
  }

  function skuFor(options: Array<{ name: string; value: string }>, index: number) {
    const base = slugify(productTitle).slice(0, 14).toUpperCase().replace(/-/g, "") || "PROD";
    const suffix = options.map((o) => slugify(o.value).slice(0, 4).toUpperCase()).join("-");
    return suffix ? `${base}-${suffix}` : `${base}-${index + 1}`;
  }

  async function generate() {
    if (missing.length === 0) return;
    setGenerating(true);
    const created: VariantRow[] = [];
    for (const [i, combo] of missing.entries()) {
      try {
        created.push(
          await createVariant({
            sku: skuFor(combo, rows.length + i),
            title: combo.map((o) => o.value).join(" / "),
            options: combo,
            price: basePrice,
            inventoryQuantity: 0,
            inventoryPolicy: "deny",
            lowStockThreshold: 5,
            active: true,
          })
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "A variant could not be created.");
      }
    }
    setRows((prev) => [...prev, ...created]);
    setGenerating(false);
    if (created.length) toast.success(`${created.length} variant${created.length > 1 ? "s" : ""} added.`);
  }

  async function addManual() {
    try {
      const variant = await createVariant({
        sku: skuFor([], rows.length),
        title: rows.length === 0 ? "Default" : `Variant ${rows.length + 1}`,
        options: [],
        price: basePrice,
        inventoryQuantity: 0,
        inventoryPolicy: "deny",
        lowStockThreshold: 5,
        active: true,
      });
      setRows((prev) => [...prev, variant]);
      toast.success("Variant added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the variant.");
    }
  }

  async function saveRow(row: VariantRow) {
    setSavingId(row._id);
    const snapshot = rows;
    try {
      const res = await fetch(`/api/admin/variants/${row._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: row.sku,
          title: row.title,
          options: row.options,
          price: row.price,
          compareAtPrice: row.compareAtPrice,
          inventoryQuantity: row.inventoryQuantity,
          inventoryPolicy: row.inventoryPolicy,
          lowStockThreshold: row.lowStockThreshold,
          active: row.active,
          image: row.image?.url ? row.image : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save the variant.");
      setDirty((d) => ({ ...d, [row._id]: false }));
      toast.success(`${row.sku} saved.`);
    } catch (err) {
      setRows(snapshot);
      toast.error(err instanceof Error ? err.message : "Could not save the variant.");
    } finally {
      setSavingId(null);
    }
  }

  async function removeRow(row: VariantRow) {
    const ok = await confirm({
      title: `Delete variant ${row.sku}?`,
      message: "Existing orders keep their snapshot, but this SKU can no longer be sold.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;

    const snapshot = rows;
    setRows((prev) => prev.filter((r) => r._id !== row._id));
    try {
      const res = await fetch(`/api/admin/variants/${row._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete the variant.");
      toast.success("Variant deleted.");
    } catch (err) {
      setRows(snapshot);
      toast.error(err instanceof Error ? err.message : "Could not delete the variant.");
    }
  }

  return (
    <Card>
      <CardHeader
        title="Variants"
        description="Each variant carries the price and stock the storefront actually sells."
        action={
          <div className="flex flex-wrap gap-2">
            {missing.length > 0 && (
              <Button size="sm" onClick={generate} loading={generating}>
                <Wand2 className="h-3.5 w-3.5" /> Generate {missing.length}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={addManual}>
              <Plus className="h-3.5 w-3.5" /> Add variant
            </Button>
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No variants yet"
          description={
            savedOptions.length > 0
              ? "Generate the matrix from your saved options, or add one manually."
              : "Add at least one variant — a product with no variant can't be bought."
          }
        />
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/70 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-3 py-2.5 font-semibold">Variant</th>
                <th className="px-3 py-2.5 font-semibold">SKU</th>
                <th className="px-3 py-2.5 font-semibold">Price</th>
                <th className="px-3 py-2.5 font-semibold">Compare at</th>
                <th className="px-3 py-2.5 font-semibold">Qty</th>
                <th className="px-3 py-2.5 font-semibold">Policy</th>
                <th className="px-3 py-2.5 font-semibold">Low at</th>
                <th className="px-3 py-2.5 font-semibold">Active</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-b border-ink-100 last:border-0 align-top">
                  <td className="px-3 py-2.5">
                    <Input
                      value={row.title}
                      onChange={(e) => patchRow(row._id, { title: e.target.value })}
                      className="min-w-36"
                      aria-label="Variant title"
                    />
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === row._id ? null : row._id)}
                      className="mt-1 text-xs font-medium text-teal-700 hover:text-teal-900"
                    >
                      {expanded === row._id ? "Hide image" : row.image?.url ? "Change image" : "Add image"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <Input
                      value={row.sku}
                      onChange={(e) => patchRow(row._id, { sku: e.target.value.toUpperCase() })}
                      className="min-w-32 font-mono text-xs"
                      aria-label="SKU"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <MoneyInput
                      value={row.price}
                      onChange={(c) => patchRow(row._id, { price: c ?? 0 })}
                      className="min-w-28"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <MoneyInput
                      allowEmpty
                      value={row.compareAtPrice}
                      onChange={(c) => patchRow(row._id, { compareAtPrice: c })}
                      className="min-w-28"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Input
                      type="number"
                      min={0}
                      value={row.inventoryQuantity}
                      onChange={(e) =>
                        patchRow(row._id, {
                          inventoryQuantity: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-20"
                      aria-label="Inventory quantity"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Select
                      value={row.inventoryPolicy}
                      onChange={(e) =>
                        patchRow(row._id, {
                          inventoryPolicy: e.target.value as VariantRow["inventoryPolicy"],
                        })
                      }
                      className="w-28"
                      aria-label="Inventory policy"
                    >
                      <option value="deny">Deny</option>
                      <option value="continue">Backorder</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5">
                    <Input
                      type="number"
                      min={0}
                      value={row.lowStockThreshold}
                      onChange={(e) =>
                        patchRow(row._id, {
                          lowStockThreshold: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-20"
                      aria-label="Low stock threshold"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(e) => patchRow(row._id, { active: e.target.checked })}
                      className="mt-2.5 h-4 w-4 accent-teal-900"
                      aria-label="Active"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={() => saveRow(row)}
                        loading={savingId === row._id}
                        disabled={!dirty[row._id]}
                      >
                        Save
                      </Button>
                      <button
                        type="button"
                        onClick={() => removeRow(row)}
                        className="rounded p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete variant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expanded && (
        <div className="border-t border-ink-200 p-4">
          <ImageUploader
            multiple={false}
            folder="nuvora/variants"
            label={`Image for ${rows.find((r) => r._id === expanded)?.sku ?? "variant"}`}
            hint="Shown when this variant is selected. Save the row afterwards."
            images={
              rows.find((r) => r._id === expanded)?.image?.url
                ? [rows.find((r) => r._id === expanded)!.image!]
                : []
            }
            onChange={(next) => patchRow(expanded, { image: next[0] })}
          />
        </div>
      )}
      {dialog}
    </Card>
  );
}

export default VariantsEditor;
