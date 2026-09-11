import { Users } from "lucide-react";
import { requireAdminPage } from "../_lib/guard";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { PageHeader } from "@/components/admin/PageHeader";
import { CustomersTable } from "@/components/admin/customers/CustomersTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  await requireAdminPage("/admin/customers");
  await connectDB();

  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const filter: Record<string, unknown> = {};
  if (q?.trim()) {
    filter.$or = [
      { email: { $regex: q.trim(), $options: "i" } },
      { firstName: { $regex: q.trim(), $options: "i" } },
      { lastName: { $regex: q.trim(), $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).select("-passwordHash").lean(),
    User.countDocuments(filter),
  ]);

  const userIds = users.map((u) => u._id);
  const stats = await Order.aggregate<{ _id: unknown; orderCount: number; lifetimeSpend: number }>([
    { $match: { userId: { $in: userIds }, paymentStatus: "paid" } },
    { $group: { _id: "$userId", orderCount: { $sum: 1 }, lifetimeSpend: { $sum: "$grandTotal" } } },
  ]);
  const statByUser = new Map(stats.map((s) => [String(s._id), s]));

  const rows = users.map((u) => {
    const stat = statByUser.get(String(u._id));
    return {
      _id: String(u._id),
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      orderCount: stat?.orderCount ?? 0,
      lifetimeSpend: stat?.lifetimeSpend ?? 0,
      createdAt: u.createdAt.toISOString(),
    };
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${total} customer${total === 1 ? "" : "s"}.`}
      />
      <CustomersTable
        rows={rows}
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        total={total}
        query={q ?? ""}
      />
      {rows.length === 0 && total === 0 && (
        <p className="mt-4 flex items-center gap-2 text-sm text-ink-500">
          <Users className="h-4 w-4" /> No customers have signed up yet.
        </p>
      )}
    </>
  );
}
