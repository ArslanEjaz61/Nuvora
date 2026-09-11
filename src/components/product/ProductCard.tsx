"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, Heart } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { Rating } from "@/components/ui/Rating";
import { cn, formatPrice, discountPercent } from "@/lib/utils";
import type { ProductCardData } from "@/types";

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductCardData;
  priority?: boolean;
  className?: string;
}) {
  const { addItem, isPending } = useCart();
  const [adding, setAdding] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const discount = discountPercent(product.price, product.compareAtPrice);
  const href = `/products/${product.slug}`;

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.defaultVariantId || !product.inStock) return;
    setAdding(true);
    await addItem(product._id, product.defaultVariantId);
    setAdding(false);
  }

  async function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !wishlisted;
    setWishlisted(next);
    try {
      const res = await fetch("/api/wishlist", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id }),
      });
      if (!res.ok) setWishlisted(!next);
    } catch {
      setWishlisted(!next);
    }
  }

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card border border-ink-200 bg-white transition-shadow duration-200 hover:shadow-card-hover",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-ink-50">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-105",
              product.secondaryImage && "group-hover:opacity-0"
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-400">
            No image
          </div>
        )}

        {/* Second shot cross-fades in on hover where the product has one */}
        {product.secondaryImage && (
          <Image
            src={product.secondaryImage}
            alt=""
            fill
            sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {discount && (
            <span className="rounded bg-teal-900 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
              Save {discount}%
            </span>
          )}
          {product.badge && (
            <span className="rounded bg-gold-500 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-900">
              {product.badge}
            </span>
          )}
          {!product.inStock && (
            <span className="rounded bg-ink-700 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
              Sold out
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wishlisted}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink-700 opacity-0 shadow-card transition-all duration-200 hover:text-teal-900 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Heart size={16} className={cn(wishlisted && "fill-teal-900 text-teal-900")} />
        </button>

        {product.inStock && product.defaultVariantId && (
          <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || isPending}
              className="flex h-10 w-full items-center justify-center gap-2 rounded bg-teal-900 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
            >
              <ShoppingBag size={15} />
              {adding ? "Adding…" : "Add to cart"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 md:p-4">
        <h3 className="line-clamp-2 font-sans text-sm leading-snug text-ink-800 transition-colors group-hover:text-teal-900">
          {product.title}
        </h3>

        {product.rating.count > 0 && (
          <Rating value={product.rating.average} count={product.rating.count} size={13} />
        )}

        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-base font-semibold text-ink-900">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-sm text-ink-400 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
