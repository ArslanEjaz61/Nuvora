"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { FormAlert } from "@/components/account/Field";
import { ProductCard } from "@/components/product/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import type { ProductCardData } from "@/types";

export function WishlistGrid({ initialItems }: { initialItems: ProductCardData[] }) {
  const [items, setItems] = useState(initialItems);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(productId: string) {
    setError(null);
    setRemoving(productId);
    const previous = items;
    setItems((current) => current.filter((item) => item._id !== productId));

    try {
      const res = await fetch("/api/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        setItems(previous);
        setError("We couldn't remove that item. Please try again.");
      }
    } catch {
      setItems(previous);
      setError("Something went wrong. Please try again.");
    } finally {
      setRemoving(null);
    }
  }

  if (items.length === 0) {
    return <WishlistEmpty />;
  }

  return (
    <div>
      {error && (
        <div className="mb-5">
          <FormAlert tone="error">{error}</FormAlert>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item._id} className="flex flex-col">
            <ProductCard product={item} />
            <button
              type="button"
              onClick={() => handleRemove(item._id)}
              disabled={removing === item._id}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded px-2 py-2 text-xs text-ink-500 transition-colors hover:bg-ink-50 hover:text-red-600 disabled:opacity-60"
            >
              <Trash2 size={13} aria-hidden />
              {removing === item._id ? "Removing…" : "Remove from wishlist"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function WishlistEmpty() {
  return (
    <div className="rounded-card border border-dashed border-ink-300 bg-ink-50 px-6 py-16 text-center">
      <h2 className="font-display text-xl text-ink-900">Nothing saved yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        Tap the heart on any product to keep it here while you decide. Your wishlist stays with
        your account, on every device.
      </p>
      <ButtonLink href="/collections" className="mt-6">
        Browse collections
      </ButtonLink>
    </div>
  );
}
