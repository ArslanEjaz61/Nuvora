"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { ProductCardData } from "@/types";

export function SearchResults({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ProductCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = useCallback(async (term: string, pageNumber: number) => {
    if (!term.trim()) {
      setResults([]);
      setTotal(0);
      setSearched(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: term.trim(),
        page: String(pageNumber),
        limit: "24",
      });
      const res = await fetch(`/api/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.products ?? []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      }
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run(initialQuery, 1);
    setPage(1);
  }, [initialQuery, run]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function goToPage(next: number) {
    setPage(next);
    void run(query, next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="container-page py-6">
      <form onSubmit={onSubmit} className="flex max-w-xl gap-2">
        <div className="flex h-12 flex-1 items-center gap-2.5 rounded border border-ink-200 px-3.5 focus-within:border-teal-600">
          <Search size={18} className="shrink-0 text-ink-400" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Search furniture, décor and more…"
            aria-label="Search products"
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
          />
        </div>
        <Button type="submit" size="lg">
          Search
        </Button>
      </form>

      {loading && <p className="mt-8 text-sm text-ink-500">Searching…</p>}

      {!loading && searched && (
        <p className="mt-6 text-sm text-ink-500" aria-live="polite">
          {total} result{total === 1 ? "" : "s"}
        </p>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="py-16 text-center">
          <p className="font-display text-xl text-ink-900">No matches found</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500">
            Try a different word, check the spelling, or browse the collections instead.
          </p>
          <ButtonLink href="/collections" className="mt-5">
            Browse collections
          </ButtonLink>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {results.map((product, i) => (
            <ProductCard key={product._id} product={product} priority={i < 4} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </Button>
          <span className="px-3 text-sm text-ink-600">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages || loading}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
