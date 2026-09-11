import { requireAdminPage } from "../_lib/guard";
import { connectDB } from "@/lib/db";
import { Coupon } from "@/models/Coupon";
import { serialize } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import { CouponsManager, type CouponRow } from "@/components/admin/coupons/CouponsManager";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireAdminPage("/admin/coupons");
  await connectDB();

  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();

  return (
    <>
      <PageHeader
        title="Coupons"
        description={`${coupons.length} coupon${coupons.length === 1 ? "" : "s"}.`}
      />
      <CouponsManager
        rows={serialize(coupons.map((c) => ({ ...c, _id: String(c._id) }))) as unknown as CouponRow[]}
      />
    </>
  );
}
