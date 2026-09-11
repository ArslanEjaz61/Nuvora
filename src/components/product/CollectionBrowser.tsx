"use client";

import { useCallback, useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { Button } from "@/components/ui/Button";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductCardData } from "@/types";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "best-selling", label: "Best selling" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
] as const;

interface Props {
  collectionSlug?: string;
  initialProducts: ProductCardData[];
  initialTotal: number;
  initialPages: number;
  priceRange: { min: number; max: number };
  availableTags: string[];
}

export function CollectionBrowser({
  collectionSlug,
  initialProducts,
  initialTotal,
  initialPages,
  priceRange,
  availableTags,
}: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [pages, setPages] = useState(initialPages);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string>("newest");
  const [tags, setTags] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), sort, limit: "24" });
      if (collectionSlug) params.set("collection", collectionSlug);
      if (tags.length) params.set("tags", tags.join(","));
      if (maxPrice !== null) params.set("maxPrice", String(maxPrice));

      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [collectionSlug, page, sort, tags, maxPrice]);

  // Skip the first render — the server already delivered page 1.
  useEffect(() => {
    if (!touched) return;
    void fetchProducts();
  }, [touched, fetchProducts]);

  function update(fn: () => void) {
    setTouched(true);
    fn();
  }

  function toggleTag(tag: string) {
    update(() => {
      setPage(1);
      setTags((current) =>
        current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
      );
    });
  }

  function clearFilters() {
    update(() => {
      setTags([]);
      setMaxPrice(null);
      setPage(1);
    });
  }

  const hasFilters = tags.length > 0 || maxPrice !== null;

  const filterPanel = (
    <div className="space-y-6">
      {priceRange.max > priceRange.min && (
        <div>
          <h3 className="text-sm font-medium text-ink-900">Max price</h3>
          <input
            type="range"
            min={priceRange.min}
            max={priceRange.max}
            step={100}
            value={maxPrice ?? priceRange.max}
            onChange={(e) =>
              update(() => {
                setPage(1);
                setMaxPrice(Number(e.target.value));
              })
            }
            className="mt-3 w-full accent-teal-700"
            aria-label="Maximum price"
          />
          <div className="mt-1 flex justify-between text-xs text-ink-500">
            <span>{formatPrice(priceRange.min)}</span>
            <span className="font-medium text-ink-900">
              {formatPrice(maxPrice ?? priceRange.max)}
            </span>
          </div>
        </div>
      )}

      {availableTags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ink-900">Filter by</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={tags.includes(tag)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  tags.includes(tag)
                    ? "border-teal-900 bg-teal-900 text-white"
                    : "border-ink-200 text-ink-700 hover:border-ink-400"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters} fullWidth>
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="container-page py-6 md:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500" aria-live="polite">
          {loading ? "Loading…" : `${total} product${total === 1 ? "" : "s"}`}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex h-10 items-center gap-2 rounded border border-ink-200 px-3.5 text-sm text-ink-800 transition-colors hover:border-ink-400 lg:hidden"
          >
            <SlidersHorizontal size={15} />
            Filters
            {hasFilters && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-teal-900 text-[10px] text-white">
                {tags.length + (maxPrice !== null ? 1 : 0)}
              </span>
            )}
          </button>

          <label className="flex items-center gap-2">
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) =>
                update(() => {
                  setPage(1);
                  setSort(e.target.value);
                })
              }
              className="h-10 rounded border border-ink-200 bg-white px-3 text-sm text-ink-800 outline-none focus:border-teal-600"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">{filterPanel}</aside>

        <div className="min-w-0 flex-1">
          {products.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-xl text-ink-900">Nothing matches those filters</p>
              <p className="mt-2 text-sm text-ink-500">
                Try widening your price range or clearing a filter.
              </p>
              {hasFilters && (
                <Button variant="outline" className="mt-5" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div
              className={cn(
                "grid grid-cols-2 gap-3 transition-opacity md:grid-cols-3 md:gap-5",
                loading && "opacity-50"
              )}
            >
              {products.map((product, i) => (
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
                onClick={() => update(() => setPage((p) => p - 1))}
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
                onClick={() => update(() => setPage((p) => p + 1))}
              >
                Next
              </Button>
            </nav>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-ink-900/40"
          />
          <div className="animate-slide-in-right absolute inset-y-0 right-0 w-[85%] max-w-sm overflow-y-auto bg-white p-5 shadow-drawer">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg">Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="grid h-10 w-10 place-items-center text-ink-600"
              >
                <X size={22} />
              </button>
            </div>
            {filterPanel}
            <Button fullWidth className="mt-6" onClick={() => setFiltersOpen(false)}>
              Show {total} result{total === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
