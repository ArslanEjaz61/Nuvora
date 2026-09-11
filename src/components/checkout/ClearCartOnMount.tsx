"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/CartProvider";

/**
 * The webhook empties the cart server-side; this just re-reads it so the
 * header badge drops to zero without a manual refresh.
 */
export function ClearCartOnMount() {
  const { refresh } = useCart();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return null;
}
