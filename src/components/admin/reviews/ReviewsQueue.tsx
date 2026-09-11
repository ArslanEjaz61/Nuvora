"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, MessageSquareQuote, Trash2, X } from "lucide-react";
import { Pagination } from "../Pagination";
import { EmptyState } from "../EmptyState";
import { StatusPill, type PillTone } from "../StatusPill";
import { Card, Button } from "../ui";
import { useConfirm } from "../ConfirmDialog";
import { useToast } from "../Toast";
import { Rating } from "@/components/ui/Rating";
import { cn, formatDate } from "@/lib/utils";

export interface ReviewRow {
  _id: string;
  productTitle: string;
  productSlug: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const TABS: { value: ReviewRow["status"]; label: string; tone: PillTone }[] = [
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "approved", label: "Approved", tone: "success" },
  { value: "rejected", label: "Rejected", tone: "danger" },
];

export function ReviewsQueue({
  rows,
  page,
  totalPages,
  total,
  status,
  counts,
}: {
  rows: ReviewRow[];
  page: number;
  totalPages: number;
  total: number;
  status: ReviewRow["status"];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function act(ids: string[], action: "approve" | "reject" | "delete") {
    if (action === "delete") {
      const ok = await confirm({
        title: `Delete ${ids.length} review${ids.length > 1 ? "s" : ""}?`,
        destructive: true,
        confirmLabel: "Delete",
      });
      if (!ok) return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (!res.ok) throw new Error("That action failed.");
      toast.success(
        action === "approve"
          ? "Approved."
          : action === "reject"
            ? "Rejected."
            : "Deleted."
      );
      setSelected([]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 p-3.5 sm:p-4">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => router.push(`/admin/reviews?status=${tab.value}`)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
              status === tab.value ? "bg-teal-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px]",
                status === tab.value ? "bg-white/20" : "bg-white text-ink-500"
              )}
            >
              {counts[tab.value] ?? 0}
            </span>
          </button>
        ))}

        {selected.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-ink-500">{selected.length} selected</span>
            {status !== "approved" && (
              <Button size="sm" variant="secondary" onClick={() => act(selected, "approve")} loading={busy}>
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
            )}
            {status !== "rejected" && (
              <Button size="sm" variant="secondary" onClick={() => act(selected, "reject")} loading={busy}>
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => act(selected, "delete")} loading={busy}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title={`No ${status} reviews`}
          description={status === "pending" ? "New reviews will show up here for moderation." : undefined}
        />
      ) : (
        <ul className="divide-y divide-ink-100">
          {rows.map((r) => (
            <li key={r._id} className="flex gap-3 px-4 py-4 sm:px-5">
              <input
                type="checkbox"
                checked={selected.includes(r._id)}
                onChange={() => toggle(r._id)}
                className="mt-1 h-4 w-4 shrink-0 accent-teal-900"
                aria-label={`Select review by ${r.authorName}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Rating value={r.rating} showCount={false} size={13} />
                  <span className="text-sm font-medium text-ink-900">{r.authorName}</span>
                  {r.verifiedPurchase && <StatusPill status="verified" tone="info" />}
                  <Link href={`/products/${r.productSlug}`} className="text-xs text-teal-700 hover:underline">
                    {r.productTitle}
                  </Link>
                  <span className="ml-auto text-xs text-ink-400">{formatDate(r.createdAt)}</span>
                </div>
                {r.title && <p className="mt-1.5 text-sm font-medium text-ink-900">{r.title}</p>}
                <p className="mt-0.5 text-sm text-ink-600">{r.body}</p>

                <div className="mt-2 flex gap-1.5">
                  {status !== "approved" && (
                    <button
                      type="button"
                      onClick={() => act([r._id], "approve")}
                      className="rounded p-1 text-ink-400 transition hover:bg-teal-50 hover:text-teal-700"
                      aria-label="Approve"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  {status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => act([r._id], "reject")}
                      className="rounded p-1 text-ink-400 transition hover:bg-gold-50 hover:text-gold-700"
                      aria-label="Reject"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => act([r._id], "delete")}
                    className="rounded p-1 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        basePath="/admin/reviews"
        params={{ status }}
      />
      {dialog}
    </Card>
  );
}

export default ReviewsQueue;
