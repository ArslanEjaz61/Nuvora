"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Minus, Plus, ShoppingBag, Truck, RotateCcw } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { Rating } from "@/components/ui/Rating";
import { cn, formatPrice, discountPercent } from "@/lib/utils";

export interface VariantOption {
  name: string;
  value: string;
}

export interface PurchaseVariant {
  _id: string;
  title: string;
  sku: string;
  options: VariantOption[];
  price: number;
  compareAtPrice?: number;
  inventoryQuantity: number;
  inventoryPolicy: "deny" | "continue";
  lowStockThreshold: number;
}

export function ProductPurchasePanel({
  productId,
  title,
  shortDescription,
  rating,
  options,
  variants,
  brand,
}: {
  productId: string;
  title: string;
  shortDescription?: string;
  rating: { average: number; count: number };
  options: { name: string; values: string[] }[];
  variants: PurchaseVariant[];
  brand?: string;
}) {
  const { addItem, isPending } = useCart();

  const firstSellable = useMemo(
    () =>
      variants.find((v) => v.inventoryPolicy === "continue" || v.inventoryQuantity > 0) ??
      variants[0],
    [variants]
  );

  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const option of firstSellable?.options ?? []) initial[option.name] = option.value;
    return initial;
  });
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  // Matches on every option axis, so partial selections resolve to nothing.
  const selectedVariant = useMemo(() => {
    if (!options.length) return variants[0];
    return variants.find((variant) =>
      variant.options.every((option) => selection[option.name] === option.value)
    );
  }, [options.length, selection, variants]);

  const available = selectedVariant
    ? selectedVariant.inventoryPolicy === "continue"
      ? 99
      : selectedVariant.inventoryQuantity
    : 0;
  const inStock = available > 0;
  const lowStock =
    selectedVariant &&
    selectedVariant.inventoryPolicy === "deny" &&
    available > 0 &&
    available <= selectedVariant.lowStockThreshold;

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, available)));
  }, [available]);

  const price = selectedVariant?.price ?? variants[0]?.price ?? 0;
  const compareAt = selectedVariant?.compareAtPrice ?? variants[0]?.compareAtPrice;
  const discount = discountPercent(price, compareAt);

  /** A value is offered only if some variant pairs it with the current picks. */
  function isValueAvailable(optionName: string, value: string) {
    return variants.some((variant) => {
      const matchesThis = variant.options.some(
        (o) => o.name === optionName && o.value === value
      );
      if (!matchesThis) return false;
      return variant.options.every(
        (o) =>
          o.name === optionName ||
          !selection[o.name] ||
          selection[o.name] === o.value
      );
    });
  }

  async function handleAdd() {
    if (!selectedVariant || !inStock) return;
    await addItem(productId, selectedVariant._id, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  async function toggleWishlist() {
    const next = !wishlisted;
    setWishlisted(next);
    try {
      const res = await fetch("/api/wishlist", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId: selectedVariant?._id }),
      });
      if (!res.ok) setWishlisted(!next);
    } catch {
      setWishlisted(!next);
    }
  }

  return (
    <div>
      {brand && (
        <p className="text-xs uppercase tracking-widest text-ink-500">{brand}</p>
      )}
      <h1 className="mt-1 font-display text-2xl leading-tight text-ink-900 md:text-3xl">
        {title}
      </h1>

      {rating.count > 0 && (
        <a href="#reviews" className="mt-2.5 inline-flex items-center gap-2">
          <Rating value={rating.average} count={rating.count} />
          <span className="text-xs text-ink-500 underline">Read reviews</span>
        </a>
      )}

      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-semibold text-ink-900 md:text-3xl">
          {formatPrice(price)}
        </span>
        {compareAt && compareAt > price && (
          <>
            <span className="text-lg text-ink-400 line-through">{formatPrice(compareAt)}</span>
            <span className="rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
              Save {discount}%
            </span>
          </>
        )}
      </div>

      {shortDescription && (
        <p className="mt-4 text-sm leading-relaxed text-ink-600">{shortDescription}</p>
      )}

      {options.map((option) => (
        <div key={option.name} className="mt-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-ink-900">{option.name}</span>
            {selection[option.name] && (
              <span className="text-xs text-ink-500">{selection[option.name]}</span>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {option.values.map((value) => {
              const isSelected = selection[option.name] === value;
              const isAvailable = isValueAvailable(option.name, value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelection((s) => ({ ...s, [option.name]: value }))}
                  aria-pressed={isSelected}
                  className={cn(
                    "min-w-12 rounded border px-3.5 py-2 text-sm transition-colors",
                    isSelected
                      ? "border-teal-900 bg-teal-900 text-white"
                      : "border-ink-200 text-ink-800 hover:border-ink-400",
                    !isAvailable && !isSelected && "text-ink-300 line-through hover:border-ink-200"
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded border border-ink-200">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="grid h-11 w-11 place-items-center text-ink-600 transition-colors hover:text-ink-900 disabled:opacity-40"
          >
            <Minus size={16} />
          </button>
          <span className="w-10 text-center text-sm tabular-nums">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(available, q + 1))}
            disabled={quantity >= available}
            aria-label="Increase quantity"
            className="grid h-11 w-11 place-items-center text-ink-600 transition-colors hover:text-ink-900 disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>

        <Button
          onClick={handleAdd}
          disabled={!inStock || isPending || !selectedVariant}
          size="lg"
          className="min-w-48 flex-1"
        >
          <ShoppingBag size={17} />
          {!selectedVariant
            ? "Choose options"
            : !inStock
              ? "Sold out"
              : added
                ? "Added to cart"
                : "Add to cart"}
        </Button>

        <button
          type="button"
          onClick={toggleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wishlisted}
          className="grid h-13 w-13 shrink-0 place-items-center rounded border border-ink-200 text-ink-700 transition-colors hover:border-teal-900 hover:text-teal-900"
        >
          <Heart size={18} className={cn(wishlisted && "fill-teal-900 text-teal-900")} />
        </button>
      </div>

      {lowStock && (
        <p className="mt-3 text-sm text-gold-700">
          Only {available} left in stock
        </p>
      )}

      {selectedVariant && (
        <p className="mt-3 text-xs text-ink-400">SKU: {selectedVariant.sku}</p>
      )}

      <dl className="mt-7 space-y-3 border-t border-ink-200 pt-6 text-sm">
        <div className="flex items-start gap-3">
          <Truck size={18} className="mt-0.5 shrink-0 text-teal-700" aria-hidden />
          <div>
            <dt className="font-medium text-ink-900">Free shipping over $99</dt>
            <dd className="text-ink-500">Flat rate below that, calculated at checkout.</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <RotateCcw size={18} className="mt-0.5 shrink-0 text-teal-700" aria-hidden />
          <div>
            <dt className="font-medium text-ink-900">30-day returns</dt>
            <dd className="text-ink-500">Unused and in original packaging.</dd>
          </div>
        </div>
      </dl>
    </div>
  );
}
