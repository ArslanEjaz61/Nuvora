import { connectDB } from "@/lib/db";
import { couponSchema } from "@/lib/validation";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { cartResponse, loadCartDoc } from "../../_lib/cart-doc";
import { parseWith, readJson, serverError, tooManyRequests } from "../../_lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ip = await getClientIp();
    // Codes are short and guessable, so apply-attempts are throttled hard.
    const limit = rateLimit(`coupon:${ip}`, 10, 60_000);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfter, "Too many code attempts. Wait a minute and retry.");
    }

    const parsed = parseWith(couponSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;

    await connectDB();
    const doc = await loadCartDoc();
    doc.couponCode = parsed.data.code.trim().toUpperCase();
    await doc.save();

    // An invalid code still returns 200 — priceCart reports it via couponError
    // and the UI renders that inline next to the field.
    return cartResponse(doc);
  } catch (err) {
    return serverError("cart/coupon:POST", err);
  }
}

export async function DELETE() {
  try {
    await connectDB();
    const doc = await loadCartDoc();
    doc.couponCode = null;
    await doc.save();
    return cartResponse(doc);
  } catch (err) {
    return serverError("cart/coupon:DELETE", err);
  }
}
