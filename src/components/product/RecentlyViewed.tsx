"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

interface ViewedProduct {
  _id: string;
  title: string;
  slug: string;
  price: number;
  image?: string;
}

const STORAGE_KEY = "nuvora_recently_viewed";
const MAX_ITEMS = 8;

/**
 * Per-browser history kept in localStorage — no account needed, and it never
 * leaves the device.
 */
export function RecentlyViewed({ currentProduct }: { currentProduct: ViewedProduct }) {
  const [items, setItems] = useState<ViewedProduct[]>([]);

  useEffect(() => {
    let stored: ViewedProduct[] = [];
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      stored = [];
    }

    setItems(stored.filter((p) => p._id !== currentProduct._id).slice(0, MAX_ITEMS));

    const next = [
      currentProduct,
      ...stored.filter((p) => p._id !== currentProduct._id),
    ].slice(0, MAX_ITEMS);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode or full storage — the feature is optional, so ignore.
    }
  }, [currentProduct]);

  if (items.length === 0) return null;

  return (
    <section className="container-page border-t border-ink-200 py-10">
      <h2 className="mb-5 font-display text-xl text-ink-900">Recently viewed</h2>
      <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <Link
            key={item._id}
            href={`/products/${item.slug}`}
            className="group w-36 shrink-0 sm:w-44"
          >
            <div className="relative aspect-square overflow-hidden rounded bg-ink-50">
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="176px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-ink-700 group-hover:text-teal-900">
              {item.title}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-ink-900">
              {formatPrice(item.price)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
