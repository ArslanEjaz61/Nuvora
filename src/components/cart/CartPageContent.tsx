"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, Lock } from "lucide-react";
import { useCart } from "./CartProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/pricing.client";

export function CartPageContent() {
  const { cart, updateItem, removeItem, applyCoupon, removeCoupon, isPending } = useCart();
  const [code, setCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);

  const hasBlockedLine = cart.lines.some((line) => !line.inStock);
  const remaining = FREE_SHIPPING_THRESHOLD - (cart.subtotal - cart.discountTotal);

  async function submitCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    const err = await applyCoupon(code.trim());
    setCouponError(err);
    if (!err) setCode("");
  }

  if (cart.lines.length === 0) {
    return (
      <div className="container-page flex flex-col items-center justify-center gap-5 py-24 text-center">
        <ShoppingBag size={48} className="text-ink-300" strokeWidth={1.25} />
        <div>
          <h1 className="font-display text-2xl text-ink-900">Your cart is empty</h1>
          <p className="mt-2 text-sm text-ink-500">
            Browse the collections and add something you love.
          </p>
        </div>
        <ButtonLink href="/collections" size="lg">
          Start shopping
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="container-page py-8 md:py-10">
      <h1 className="font-display text-3xl text-ink-900">
        Your cart <span className="font-sans text-base text-ink-500">({cart.itemCount})</span>
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
        <section aria-label="Cart items">
          <ul className="divide-y divide-ink-100 border-y border-ink-200">
            {cart.lines.map((line) => (
              <li key={line.variantId} className="flex gap-4 py-5 md:gap-6">
                <Link
                  href={`/products/${line.slug}`}
                  className="relative h-28 w-24 shrink-0 overflow-hidden rounded bg-ink-50 md:h-36 md:w-32"
                >
                  {line.image && (
                    <Image
                      src={line.image}
                      alt={line.title}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${line.slug}`}
                        className="line-clamp-2 text-sm font-medium text-ink-900 hover:text-teal-900 md:text-base"
                      >
                        {line.title}
                      </Link>
                      {line.variantTitle && (
                        <p className="mt-1 text-xs text-ink-500">{line.variantTitle}</p>
                      )}
                      <p className="mt-1 text-xs text-ink-400">SKU: {line.sku}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-ink-900 md:text-base">
                        {formatPrice(line.lineTotal)}
                      </p>
                      {line.quantity > 1 && (
                        <p className="mt-0.5 text-xs text-ink-500">
                          {formatPrice(line.unitPrice)} each
                        </p>
                      )}
                    </div>
                  </div>

                  {!line.inStock && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      Out of stock — remove this item to continue
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded border border-ink-200">
                      <button
                        type="button"
                        onClick={() => updateItem(line.variantId, line.quantity - 1)}
                        disabled={isPending || line.quantity <= 1}
                        aria-label="Decrease quantity"
                        className="grid h-9 w-9 place-items-center text-ink-600 transition-colors hover:text-ink-900 disabled:opacity-40"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-9 text-center text-sm tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateItem(line.variantId, line.quantity + 1)}
                        disabled={isPending || line.quantity >= line.maxQuantity}
                        aria-label="Increase quantity"
                        className="grid h-9 w-9 place-items-center text-ink-600 transition-colors hover:text-ink-900 disabled:opacity-40"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(line.variantId)}
                      className="flex items-center gap-1.5 text-xs text-ink-500 transition-colors hover:text-red-600"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/collections"
            className="mt-6 inline-block text-sm text-teal-800 underline-offset-4 hover:underline"
          >
            ← Continue shopping
          </Link>
        </section>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-card border border-ink-200 p-5 md:p-6">
            <h2 className="font-display text-lg text-ink-900">Order summary</h2>

            {cart.coupon ? (
              <div className="mt-4 flex items-center justify-between rounded bg-teal-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-teal-900">{cart.coupon.code} applied</p>
                  {cart.coupon.description && (
                    <p className="truncate text-xs text-teal-700">{cart.coupon.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeCoupon()}
                  className="shrink-0 text-xs text-teal-700 underline hover:text-teal-900"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={submitCoupon} className="mt-4 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Discount code"
                  aria-label="Discount code"
                  className="h-10 min-w-0 flex-1 rounded border border-ink-200 px-3 text-sm outline-none focus:border-teal-600"
                />
                <Button type="submit" variant="outline" size="sm" disabled={isPending}>
                  Apply
                </Button>
              </form>
            )}
            {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}

            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">Subtotal</dt>
                <dd className="tabular-nums text-ink-900">{formatPrice(cart.subtotal)}</dd>
              </div>
              {cart.discountTotal > 0 && (
                <div className="flex justify-between text-teal-700">
                  <dt>Discount</dt>
                  <dd className="tabular-nums">−{formatPrice(cart.discountTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-600">Shipping</dt>
                <dd className="tabular-nums text-ink-900">
                  {cart.shippingTotal === 0 ? "Free" : formatPrice(cart.shippingTotal)}
                </dd>
              </div>
              {cart.taxTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-600">Tax</dt>
                  <dd className="tabular-nums text-ink-900">{formatPrice(cart.taxTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-ink-200 pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(cart.grandTotal)}</dd>
              </div>
            </dl>

            {remaining > 0 && (
              <p className="mt-3 text-xs text-ink-500">
                Add {formatPrice(remaining)} more for free shipping.
              </p>
            )}

            <ButtonLink href="/checkout" fullWidth size="lg" className="mt-5">
              Checkout
            </ButtonLink>

            {hasBlockedLine && (
              <p className="mt-2 text-center text-xs text-red-600">
                Remove out-of-stock items to check out.
              </p>
            )}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-400">
              <Lock size={12} aria-hidden />
              Secure checkout powered by Stripe
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
