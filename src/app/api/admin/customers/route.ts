import { NextResponse } from "next/server";
import { guardAdmin } from "../_lib/guard";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { serverError, pageParams } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = pageParams(url, 25, 100);
    const q = url.searchParams.get("q")?.trim();

    const filter: Record<string, unknown> = {};
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: "i" } },
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-passwordHash")
        .lean(),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const stats = await Order.aggregate<{ _id: unknown; orderCount: number; lifetimeSpend: number }>([
      { $match: { userId: { $in: userIds }, paymentStatus: "paid" } },
      { $group: { _id: "$userId", orderCount: { $sum: 1 }, lifetimeSpend: { $sum: "$grandTotal" } } },
    ]);
    const statByUser = new Map(stats.map((s) => [String(s._id), s]));

    return NextResponse.json({
      customers: users.map((u) => {
        const stat = statByUser.get(String(u._id));
        return {
          _id: String(u._id),
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          orderCount: stat?.orderCount ?? 0,
          lifetimeSpend: stat?.lifetimeSpend ?? 0,
          createdAt: u.createdAt,
        };
      }),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return serverError("admin/customers:GET", err);
  }
}
