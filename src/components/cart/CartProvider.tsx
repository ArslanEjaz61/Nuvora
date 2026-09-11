"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { CartSummary } from "@/types";

const EMPTY: CartSummary = {
  lines: [],
  subtotal: 0,
  discountTotal: 0,
  shippingTotal: 0,
  taxTotal: 0,
  grandTotal: 0,
  currency: "USD",
  itemCount: 0,
  coupon: null,
};

interface CartContextValue {
  cart: CartSummary;
  isOpen: boolean;
  isPending: boolean;
  error: string | null;
  openCart: () => void;
  closeCart: () => void;
  addItem: (productId: string, variantId: string, quantity?: number) => Promise<void>;
  updateItem: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<string | null>;
  removeCoupon: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  initialCart,
}: {
  children: React.ReactNode;
  initialCart?: CartSummary;
}) {
  const [cart, setCart] = useState<CartSummary>(initialCart ?? EMPTY);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  // Server owns every total, so each mutation returns the freshly priced cart.
  const send = useCallback(
    async (url: string, method: string, body?: unknown): Promise<CartSummary | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong. Try again.");
          return null;
        }
        setCart(data.cart);
        return data.cart as CartSummary;
      } catch {
        setError("Network error. Check your connection and try again.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    await send("/api/cart", "GET");
  }, [send]);

  useEffect(() => {
    if (!initialCart) void refresh();
  }, [initialCart, refresh]);

  const addItem = useCallback(
    async (productId: string, variantId: string, quantity = 1) => {
      const result = await send("/api/cart", "POST", { productId, variantId, quantity });
      if (result) setIsOpen(true);
    },
    [send]
  );

  const updateItem = useCallback(
    async (variantId: string, quantity: number) => {
      await send("/api/cart", "PATCH", { variantId, quantity });
    },
    [send]
  );

  const removeItem = useCallback(
    async (variantId: string) => {
      await send("/api/cart", "PATCH", { variantId, quantity: 0 });
    },
    [send]
  );

  const applyCoupon = useCallback(
    async (code: string): Promise<string | null> => {
      const result = await send("/api/cart/coupon", "POST", { code });
      if (!result) return "That code isn't valid.";
      return result.couponError ?? null;
    },
    [send]
  );

  const removeCoupon = useCallback(async () => {
    await send("/api/cart/coupon", "DELETE");
  }, [send]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isOpen,
      isPending: isPending || loading,
      error,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      updateItem,
      removeItem,
      applyCoupon,
      removeCoupon,
      refresh,
    }),
    [
      cart,
      isOpen,
      isPending,
      loading,
      error,
      addItem,
      updateItem,
      removeItem,
      applyCoupon,
      removeCoupon,
      refresh,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
