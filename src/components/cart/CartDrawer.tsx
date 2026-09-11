"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "./CartProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/pricing.client";

export function CartDrawer() {
  const { cart, isOpen, closeCart, updateItem, removeItem, applyCoupon, removeCoupon, isPending } =
    useCart();
  const [code, setCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);

  if (!isOpen) return null;

  const remaining = FREE_SHIPPING_THRESHOLD - (cart.subtotal - cart.discountTotal);
  const progress = Math.min(
    100,
    ((cart.subtotal - cart.discountTotal) / FREE_SHIPPING_THRESHOLD) * 100
  );

  async function submitCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    const err = await applyCoupon(code.trim());
    setCouponError(err);
    if (!err) setCode("");
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeCart}
        className="animate-fade-in absolute inset-0 bg-ink-900/40"
      />

      <div className="animate-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-drawer">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-200 px-5">
          <h2 className="font-display text-lg text-ink-900">
            Your cart{" "}
            {cart.itemCount > 0 && (
              <span className="font-sans text-sm text-ink-500">({cart.itemCount})</span>
            )}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="grid h-10 w-10 place-items-center text-ink-600 transition-colors hover:text-ink-900"
          >
            <X size={22} />
          </button>
        </div>

        {cart.lines.length > 0 && remaining > 0 && (
          <div className="shrink-0 border-b border-ink-100 bg-teal-50 px-5 py-3">
            <p className="text-xs text-teal-900">
              You&apos;re {formatPrice(remaining)} away from free shipping
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-teal-100">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {cart.lines.length > 0 && remaining <= 0 && (
          <div className="shrink-0 border-b border-ink-100 bg-teal-50 px-5 py-3">
            <p className="text-xs font-medium text-teal-900">
              Your order ships free.
            </p>
          </div>
        )}

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag size={44} className="text-ink-300" strokeWidth={1.25} />
            <div>
              <p className="font-display text-lg text-ink-900">Your cart is empty</p>
              <p className="mt-1 text-sm text-ink-500">
                Once you add something, it will show up here.
              </p>
            </div>
            <Button onClick={closeCart}>Start shopping</Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto px-5">
              {cart.lines.map((line) => (
                <li key={line.variantId} className="flex gap-4 py-4">
                  <Link
                    href={`/products/${line.slug}`}
                    onClick={closeCart}
                    className="relative h-24 w-20 shrink-0 overflow-hidden rounded bg-ink-50"
                  >
                    {line.image && (
                      <Image
                        src={line.image}
                        alt={line.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/products/${line.slug}`}
                      onClick={closeCart}
                      className="line-clamp-2 text-sm text-ink-800 hover:text-teal-900"
                    >
                      {line.title}
                    </Link>
                    {line.variantTitle && (
                      <p className="mt-0.5 text-xs text-ink-500">{line.variantTitle}</p>
                    )}

                    {!line.inStock && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        Out of stock — remove to check out
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded border border-ink-200">
                        <button
                          type="button"
                          onClick={() => updateItem(line.variantId, line.quantity - 1)}
                          disabled={isPending || line.quantity <= 1}
                          aria-label="Decrease quantity"
                          className="grid h-8 w-8 place-items-center text-ink-600 transition-colors hover:text-ink-900 disabled:opacity-40"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItem(line.variantId, line.quantity + 1)}
                          disabled={isPending || line.quantity >= line.maxQuantity}
                          aria-label="Increase quantity"
                          className="grid h-8 w-8 place-items-center text-ink-600 transition-colors hover:text-ink-900 disabled:opacity-40"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-ink-900">
                          {formatPrice(line.lineTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(line.variantId)}
                          aria-label={`Remove ${line.title}`}
                          className="text-ink-400 transition-colors hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="shrink-0 space-y-3 border-t border-ink-200 px-5 py-4">
              {cart.coupon ? (
                <div className="flex items-center justify-between rounded bg-teal-50 px-3 py-2">
                  <span className="text-xs font-medium text-teal-900">
                    {cart.coupon.code} applied
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCoupon()}
                    className="text-xs text-teal-700 underline hover:text-teal-900"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={submitCoupon} className="flex gap-2">
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
              {couponError && <p className="text-xs text-red-600">{couponError}</p>}

              <dl className="space-y-1.5 text-sm">
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
                <div className="flex justify-between border-t border-ink-200 pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatPrice(cart.grandTotal)}</dd>
                </div>
              </dl>

              <ButtonLink
                href="/checkout"
                onClick={closeCart}
                fullWidth
                size="lg"
                className="mt-1"
              >
                Checkout
              </ButtonLink>
              <button
                type="button"
                onClick={closeCart}
                className="w-full py-1 text-center text-xs text-ink-500 underline hover:text-ink-900"
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
