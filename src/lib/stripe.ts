import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Lazy so a missing key fails at the call site with a clear message rather than
 * crashing every route that happens to import this module.
 */
export function getStripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it to .env.local");
  }

  client = new Stripe(key, { typescript: true });
  return client;
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}
