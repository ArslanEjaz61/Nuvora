import "server-only";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { isSecureCookie } from "./cookie-flags";
import { Cart, type ICart } from "@/models/Cart";
import { getSession } from "./auth";

const CART_COOKIE = "nuvora_cart";
const CART_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Returns the caller's cart, creating one if needed.
 *
 * Anonymous shoppers are tracked by an opaque cookie token. On login the
 * anonymous cart is merged into the user's cart so nothing is lost.
 */
export async function getOrCreateCart(): Promise<ICart> {
  await connectDB();

  const store = await cookies();
  const session = await getSession();
  let token = store.get(CART_COOKIE)?.value;

  if (session) {
    const userCart = await Cart.findOne({ userId: session.userId });

    if (token) {
      const guestCart = await Cart.findOne({ token, userId: null });
      if (guestCart) {
        if (userCart) {
          mergeItems(userCart, guestCart);
          userCart.expiresAt = nextExpiry();
          await userCart.save();
          await guestCart.deleteOne();
          return userCart.toObject();
        }
        guestCart.userId = session.userId as never;
        guestCart.expiresAt = nextExpiry();
        await guestCart.save();
        return guestCart.toObject();
      }
    }

    if (userCart) return userCart.toObject();

    const created = await Cart.create({
      token: randomBytes(24).toString("hex"),
      userId: session.userId,
    });
    return created.toObject();
  }

  if (token) {
    const existing = await Cart.findOne({ token });
    if (existing) return existing.toObject();
  }

  token = randomBytes(24).toString("hex");
  const created = await Cart.create({ token });
  store.set(CART_COOKIE, token, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: CART_MAX_AGE,
  });

  return created.toObject();
}

/** Read-only lookup — never creates a cart or sets a cookie. */
export async function findCart(): Promise<ICart | null> {
  await connectDB();
  const session = await getSession();

  if (session) {
    const userCart = await Cart.findOne({ userId: session.userId }).lean<ICart>();
    if (userCart) return userCart;
  }

  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return null;

  return Cart.findOne({ token }).lean<ICart>();
}

function mergeItems(target: ICart, source: ICart) {
  for (const item of source.items) {
    const match = target.items.find(
      (existing) => String(existing.variantId) === String(item.variantId)
    );
    if (match) {
      match.quantity = Math.min(99, match.quantity + item.quantity);
    } else {
      target.items.push(item);
    }
  }
  if (!target.couponCode && source.couponCode) {
    target.couponCode = source.couponCode;
  }
}

function nextExpiry() {
  return new Date(Date.now() + CART_MAX_AGE * 1000);
}

export { CART_COOKIE };
