import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { guardAdmin } from "../../_lib/guard";
import { connectDB } from "@/lib/db";
import { Coupon } from "@/models/Coupon";
import { couponInputSchema } from "@/lib/validation";
import { readJson, parseWith, jsonError, serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// couponInputSchema is wrapped in a .refine(), so it has no .partial(). The edit
// form always submits every field, so the full schema is the right thing here.
const patchSchema = couponInputSchema;

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  const parsed = parseWith(patchSchema, await readJson(req));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  try {
    await connectDB();
    const coupon = await Coupon.findByIdAndUpdate(
      id,
      {
        $set: {
          ...input,
          code: input.code.toUpperCase(),
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          maxRedemptions: input.maxRedemptions ?? null,
        },
      },
      { new: true, runValidators: true }
    ).lean();
    if (!coupon) return jsonError("Coupon not found", 404);
    return NextResponse.json({ coupon: { ...coupon, _id: String(coupon._id) } });
  } catch (err) {
    if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
      return jsonError("A coupon with that code already exists.", 409);
    }
    return serverError("admin/coupons/[id]:PATCH", err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  try {
    await connectDB();
    const deleted = await Coupon.findByIdAndDelete(id);
    if (!deleted) return jsonError("Coupon not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("admin/coupons/[id]:DELETE", err);
  }
}
