/**
 * Client-safe mirror of the shipping threshold used for the cart's
 * progress bar. Server totals still come only from `lib/pricing.ts`;
 * this value is presentational. Keep it in step with
 * FREE_SHIPPING_THRESHOLD_CENTS.
 */
export const FREE_SHIPPING_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_CENTS ?? 9900
);
