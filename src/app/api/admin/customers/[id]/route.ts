import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { guardAdmin } from "../../_lib/guard";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Review } from "@/models/Review";
import { readJson, parseWith, jsonError, serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ role: z.enum(["customer", "admin"]) });

export async function GET(_req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  try {
    await connectDB();
    const [user, orders, reviews] = await Promise.all([
      User.findById(id).select("-passwordHash").lean(),
      Order.find({ userId: id })
        .sort({ createdAt: -1 })
        .select("orderNumber grandTotal status paymentStatus createdAt")
        .lean(),
      Review.find({ userId: id })
        .sort({ createdAt: -1 })
        .select("productId rating title body status createdAt")
        .populate<{ productId: { title: string; slug: string } | null }>("productId", "title slug")
        .lean(),
    ]);
    if (!user) return jsonError("Customer not found", 404);

    const lifetimeSpend = orders
      .filter((o) => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + o.grandTotal, 0);

    return NextResponse.json({
      customer: { ...user, _id: String(user._id) },
      orders: orders.map((o) => ({ ...o, _id: String(o._id) })),
      reviews: reviews.map((r) => ({
        ...r,
        _id: String(r._id),
        productTitle: r.productId?.title ?? "Deleted product",
        productSlug: r.productId?.slug ?? "",
        productId: undefined,
      })),
      lifetimeSpend,
    });
  } catch (err) {
    return serverError("admin/customers/[id]:GET", err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  const parsed = parseWith(schema, await readJson(req));
  if (!parsed.ok) return parsed.response;

  // An admin must never be able to lock themselves — or the last way in — out.
  if (id === guard.session.userId && parsed.data.role !== "admin") {
    return jsonError("You can't remove your own admin access.", 400);
  }

  try {
    await connectDB();

    if (parsed.data.role === "customer") {
      const admins = await User.countDocuments({ role: "admin" });
      const target = await User.findById(id).select("role");
      if (target?.role === "admin" && admins <= 1) {
        return jsonError("This is the only admin left. Promote someone else first.", 400);
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { role: parsed.data.role } },
      { new: true }
    )
      .select("-passwordHash")
      .lean();
    if (!user) return jsonError("Customer not found", 404);

    return NextResponse.json({ user: { ...user, _id: String(user._id) } });
  } catch (err) {
    return serverError("admin/customers/[id]:PATCH", err);
  }
}
