"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function buildHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  if (page > 1) sp.set("page", String(page));
  else sp.delete("page");
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  page,
  totalPages,
  total,
  basePath,
  params = {},
}: {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between border-t border-ink-200 px-4 py-3 text-xs text-ink-500">
        <span>
          {total} {total === 1 ? "result" : "results"}
        </span>
      </div>
    );
  }

  const windowed: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, from + 4);
  for (let i = Math.max(1, to - 4); i <= to; i++) windowed.push(i);

  const linkBase =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-card border px-2 text-xs font-medium transition";

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 px-4 py-3">
      <span className="text-xs text-ink-500">
        Page {page} of {totalPages} · {total} {total === 1 ? "result" : "results"}
      </span>
      <div className="flex items-center gap-1">
        <Link
          href={buildHref(basePath, params, Math.max(1, page - 1))}
          aria-disabled={page === 1}
          className={cn(
            linkBase,
            "border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
            page === 1 && "pointer-events-none opacity-40"
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
        {windowed.map((p) => (
          <Link
            key={p}
            href={buildHref(basePath, params, p)}
            className={cn(
              linkBase,
              p === page
                ? "border-teal-900 bg-teal-900 text-white"
                : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
            )}
          >
            {p}
          </Link>
        ))}
        <Link
          href={buildHref(basePath, params, Math.min(totalPages, page + 1))}
          aria-disabled={page === totalPages}
          className={cn(
            linkBase,
            "border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
            page === totalPages && "pointer-events-none opacity-40"
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </nav>
  );
}

export default Pagination;
