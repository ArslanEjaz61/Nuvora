"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass } from "./ui";

export interface FilterSelect {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

/** Pushes search + select state into the URL so server components can read it. */
export function FilterBar({
  searchPlaceholder = "Search…",
  selects = [],
  showSearch = true,
}: {
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  showSearch?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) apply({ q });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = Array.from(params.keys()).some((k) => k !== "page");

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 px-4 py-3">
      {showSearch && (
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(inputClass, "pl-9")}
          />
        </div>
      )}

      {selects.map((s) => (
        <select
          key={s.name}
          value={params.get(s.name) ?? ""}
          onChange={(e) => apply({ [s.name]: e.target.value })}
          aria-label={s.label}
          className={cn(inputClass, "w-auto min-w-36")}
        >
          <option value="">{s.label}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}

      {active && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.push(pathname);
          }}
          className="inline-flex items-center gap-1 rounded-card px-2 py-1.5 text-xs font-medium text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}

export default FilterBar;
