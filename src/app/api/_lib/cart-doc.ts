import "server-only";
import { NextResponse } from "next/server";
import type { HydratedDocument } from "mongoose";
import { Cart, type ICart } from "@/models/Cart";
import { getOrCreateCart } from "@/lib/cart";
import { priceCart } from "@/lib/pricing";

/**
 * getOrCreateCart returns a plain object; mutations need the live document.
 * Going through it first also guarantees the guest cookie is issued.
 */
export async function loadCartDoc(): Promise<HydratedDocument<ICart>> {
  const snapshot = await getOrCreateCart();
  const doc = await Cart.findById(snapshot._id);
  if (doc) return doc;
  return Cart.create({ token: snapshot.token, userId: snapshot.userId ?? null });
}

export async function cartResponse(cart: Pick<ICart, "items" | "couponCode">, status = 200) {
  const priced = await priceCart(cart.items, cart.couponCode);
  return NextResponse.json({ cart: priced }, { status });
}
