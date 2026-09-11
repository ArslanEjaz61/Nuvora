import { NextResponse } from "next/server";
import { guardAdmin } from "../_lib/guard";
import { connectDB } from "@/lib/db";
import { Coupon } from "@/models/Coupon";
import { couponInputSchema } from "@/lib/validation";
import { readJson, parseWith, jsonError, serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      coupons: coupons.map((c) => ({ ...c, _id: String(c._id) })),
    });
  } catch (err) {
    return serverError("admin/coupons:GET", err);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const parsed = parseWith(couponInputSchema, await readJson(req));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  try {
    await connectDB();
    const created = await Coupon.create({
      ...input,
      code: input.code.toUpperCase(),
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      maxRedemptions: input.maxRedemptions ?? null,
    });
    return NextResponse.json(
      { coupon: { ...created.toObject(), _id: String(created._id) } },
      { status: 201 }
    );
  } catch (err) {
    if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
      return jsonError("A coupon with that code already exists.", 409);
    }
    return serverError("admin/coupons:POST", err);
  }
}
