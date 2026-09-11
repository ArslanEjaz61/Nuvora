"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgePercent, Pencil, Plus, Trash2 } from "lucide-react";
import { FormField } from "../FormField";
import { DataTable, type Column } from "../DataTable";
import { EmptyState } from "../EmptyState";
import { StatusPill, type PillTone } from "../StatusPill";
import { Button, Card, CardHeader, Checkbox, Input, Select } from "../ui";
import { MoneyInput } from "../MoneyInput";
import { useToast } from "../Toast";
import { useConfirm } from "../ConfirmDialog";
import { formatPrice } from "@/lib/utils";

export interface CouponRow {
  _id: string;
  code: string;
  description?: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minSubtotal: number;
  maxRedemptions?: number | null;
  redemptionCount: number;
  perCustomerLimit: number;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
}

type Draft = Omit<CouponRow, "_id" | "redemptionCount"> & { _id?: string };

const emptyDraft: Draft = {
  code: "",
  description: "",
  type: "percent",
  value: 10,
  minSubtotal: 0,
  maxRedemptions: null,
  perCustomerLimit: 0,
  startsAt: null,
  endsAt: null,
  active: true,
};

function computeState(row: CouponRow): { label: string; tone: PillTone } {
  const now = Date.now();
  if (!row.active) return { label: "disabled", tone: "neutral" };
  if (row.startsAt && new Date(row.startsAt).getTime() > now) return { label: "scheduled", tone: "info" };
  if (row.endsAt && new Date(row.endsAt).getTime() < now) return { label: "expired", tone: "danger" };
  if (row.maxRedemptions && row.redemptionCount >= row.maxRedemptions) {
    return { label: "exhausted", tone: "danger" };
  }
  return { label: "active", tone: "success" };
}

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CouponsManager({ rows }: { rows: CouponRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function save() {
    if (!draft) return;
    if (draft.code.trim().length < 3) {
      toast.error("Code must be at least 3 characters.");
      return;
    }
    if (draft.type === "percent" && draft.value > 100) {
      toast.error("A percentage discount can't exceed 100.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: draft.code.trim(),
        description: draft.description || "",
        type: draft.type,
        value: draft.type === "free_shipping" ? 0 : draft.value,
        minSubtotal: draft.minSubtotal,
        maxRedemptions: draft.maxRedemptions || null,
        perCustomerLimit: draft.perCustomerLimit,
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
        endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
        active: draft.active,
      };
      const res = await fetch(draft._id ? `/api/admin/coupons/${draft._id}` : "/api/admin/coupons", {
        method: draft._id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save the coupon.");
      toast.success(draft._id ? "Coupon saved." : "Coupon created.");
      setDraft(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the coupon.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: CouponRow) {
    const ok = await confirm({
      title: `Delete "${row.code}"?`,
      message: "Any orders that already used this code keep their discount recorded.",
      destructive: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/coupons/${row._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete the coupon.");
      toast.success("Coupon deleted.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the coupon.");
    }
  }

  const columns: Column<CouponRow>[] = [
    {
      key: "code",
      header: "Code",
      cell: (c) => (
        <div>
          <p className="font-mono font-medium text-ink-900">{c.code}</p>
          {c.description && <p className="truncate text-xs text-ink-500">{c.description}</p>}
        </div>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      cell: (c) =>
        c.type === "percent" ? (
          <span>{c.value}% off</span>
        ) : c.type === "fixed" ? (
          <span>{formatPrice(c.value)} off</span>
        ) : (
          <span>Free shipping</span>
        ),
    },
    {
      key: "usage",
      header: "Redeemed",
      cell: (c) => (
        <span className="tabular-nums">
          {c.redemptionCount}
          {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
        </span>
      ),
    },
    {
      key: "state",
      header: "State",
      cell: (c) => {
        const s = computeState(c);
        return <StatusPill status={s.label} tone={s.tone} />;
      },
    },
    {
      key: "actions",
      header: "",
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() =>
              setDraft({
                _id: c._id,
                code: c.code,
                description: c.description ?? "",
                type: c.type,
                value: c.value,
                minSubtotal: c.minSubtotal,
                maxRedemptions: c.maxRedemptions,
                perCustomerLimit: c.perCustomerLimit,
                startsAt: c.startsAt,
                endsAt: c.endsAt,
                active: c.active,
              })
            }
            className="rounded p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
            aria-label={`Edit ${c.code}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => remove(c)}
            className="rounded p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${c.code}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader
          title="All coupons"
          action={
            <Button size="sm" onClick={() => setDraft({ ...emptyDraft })}>
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          }
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c._id}
          empty={
            <EmptyState
              icon={BadgePercent}
              title="No coupons yet"
              action={
                <Button size="sm" onClick={() => setDraft({ ...emptyDraft })}>
                  Create the first one
                </Button>
              }
            />
          }
        />
      </Card>

      <Card className="h-fit">
        <CardHeader title={draft?._id ? "Edit coupon" : draft ? "New coupon" : "Editor"} />
        {!draft ? (
          <EmptyState icon={Pencil} title="Nothing selected" description="Pick a coupon to edit, or create a new one." />
        ) : (
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <FormField label="Code" required hint="Stored and matched in uppercase.">
              <Input
                value={draft.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="WELCOME10"
              />
            </FormField>
            <FormField label="Description (internal)">
              <Input value={draft.description} onChange={(e) => set("description", e.target.value)} />
            </FormField>
            <FormField label="Type">
              <Select value={draft.type} onChange={(e) => set("type", e.target.value as Draft["type"])}>
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed amount off</option>
                <option value="free_shipping">Free shipping</option>
              </Select>
            </FormField>

            {draft.type === "percent" && (
              <FormField label="Percent off" required>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={draft.value}
                  onChange={(e) => set("value", Number(e.target.value) || 0)}
                />
              </FormField>
            )}
            {draft.type === "fixed" && (
              <FormField label="Amount off" required>
                <MoneyInput value={draft.value} onChange={(cents) => set("value", cents ?? 0)} />
              </FormField>
            )}

            <FormField label="Minimum subtotal">
              <MoneyInput value={draft.minSubtotal} onChange={(cents) => set("minSubtotal", cents ?? 0)} />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Max redemptions" hint="Blank = unlimited">
                <Input
                  type="number"
                  min={1}
                  value={draft.maxRedemptions ?? ""}
                  onChange={(e) => set("maxRedemptions", e.target.value ? Number(e.target.value) : null)}
                />
              </FormField>
              <FormField label="Per-customer limit" hint="0 = unlimited">
                <Input
                  type="number"
                  min={0}
                  value={draft.perCustomerLimit}
                  onChange={(e) => set("perCustomerLimit", Number(e.target.value) || 0)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Starts">
                <Input
                  type="datetime-local"
                  value={toDatetimeLocal(draft.startsAt)}
                  onChange={(e) => set("startsAt", e.target.value || null)}
                />
              </FormField>
              <FormField label="Ends">
                <Input
                  type="datetime-local"
                  value={toDatetimeLocal(draft.endsAt)}
                  onChange={(e) => set("endsAt", e.target.value || null)}
                />
              </FormField>
            </div>

            <Checkbox label="Active" checked={draft.active} onChange={(e) => set("active", e.target.checked)} />

            <div className="flex gap-2">
              <Button onClick={save} loading={saving} className="flex-1">
                {draft._id ? "Save changes" : "Create coupon"}
              </Button>
              <Button variant="secondary" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
      {dialog}
    </div>
  );
}

export default CouponsManager;
