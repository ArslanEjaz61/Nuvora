import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  MessageSquareQuote,
  Package,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { requireAdminPage } from "./_lib/guard";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";
import { Review } from "@/models/Review";
import { formatDate, formatPrice } from "@/lib/utils";
import { StatCard } from "@/components/admin/StatCard";
import { StatusPill } from "@/components/admin/StatusPill";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

interface Bucket {
  sum: number;
  count: number;
}

function bucket(rows: Array<{ sum?: number; count?: number }> | undefined): Bucket {
  const r = rows?.[0];
  return { sum: r?.sum ?? 0, count: r?.count ?? 0 };
}

/** null when there is no prior period to compare against — never a fabricated 0%. */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : null;
  return ((current - previous) / previous) * 100;
}

export default async function AdminDashboardPage() {
  await requireAdminPage("/admin");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - DAY);
  const d7 = new Date(now.getTime() - 7 * DAY);
  const d14 = new Date(now.getTime() - 14 * DAY);
  const d30 = new Date(now.getTime() - 30 * DAY);
  const d60 = new Date(now.getTime() - 60 * DAY);

  const group = { $group: { _id: null, sum: { $sum: "$grandTotal" }, count: { $sum: 1 } } };

  const [revenueFacet] = await Order.aggregate<{
    today: Array<{ sum: number; count: number }>;
    prevToday: Array<{ sum: number; count: number }>;
    last7: Array<{ sum: number; count: number }>;
    prev7: Array<{ sum: number; count: number }>;
    last30: Array<{ sum: number; count: number }>;
    prev30: Array<{ sum: number; count: number }>;
    allTime: Array<{ sum: number; count: number }>;
  }>([
    { $match: { paymentStatus: "paid" } },
    { $addFields: { at: { $ifNull: ["$paidAt", "$createdAt"] } } },
    {
      $facet: {
        today: [{ $match: { at: { $gte: todayStart } } }, group],
        prevToday: [{ $match: { at: { $gte: yesterdayStart, $lt: todayStart } } }, group],
        last7: [{ $match: { at: { $gte: d7 } } }, group],
        prev7: [{ $match: { at: { $gte: d14, $lt: d7 } } }, group],
        last30: [{ $match: { at: { $gte: d30 } } }, group],
        prev30: [{ $match: { at: { $gte: d60, $lt: d30 } } }, group],
        allTime: [group],
      },
    },
  ]);

  const today = bucket(revenueFacet?.today);
  const prevToday = bucket(revenueFacet?.prevToday);
  const last7 = bucket(revenueFacet?.last7);
  const prev7 = bucket(revenueFacet?.prev7);
  const last30 = bucket(revenueFacet?.last30);
  const prev30 = bucket(revenueFacet?.prev30);
  const allTime = bucket(revenueFacet?.allTime);

  const [statusRows, topProducts, lowStock, pendingReviews, recentOrders, totalOrders] =
    await Promise.all([
      Order.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Product.find({ soldCount: { $gt: 0 } })
        .sort({ soldCount: -1 })
        .limit(5)
        .select("title slug soldCount price images")
        .lean(),
      ProductVariant.aggregate<{
        _id: unknown;
        sku: string;
        title: string;
        inventoryQuantity: number;
        lowStockThreshold: number;
        productTitle: string;
        productId: unknown;
      }>([
        {
          $match: {
            active: true,
            $expr: { $lte: ["$inventoryQuantity", "$lowStockThreshold"] },
          },
        },
        { $sort: { inventoryQuantity: 1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $project: {
            sku: 1,
            title: 1,
            inventoryQuantity: 1,
            lowStockThreshold: 1,
            productId: 1,
            productTitle: { $ifNull: [{ $first: "$product.title" }, "Unknown product"] },
          },
        },
      ]),
      Review.countDocuments({ status: "pending" }),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("orderNumber email grandTotal status paymentStatus createdAt")
        .lean(),
      Order.countDocuments(),
    ]);

  const aov30 = last30.count > 0 ? Math.round(last30.sum / last30.count) : 0;
  const statusCounts = statusRows.map((r) => ({ status: r._id, count: r.count }));
  const hasOrders = totalOrders > 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          hasOrders
            ? `${totalOrders} order${totalOrders === 1 ? "" : "s"} all time`
            : "Your store hasn't taken an order yet."
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue today"
          value={formatPrice(today.sum)}
          sub={`${today.count} paid order${today.count === 1 ? "" : "s"}`}
          delta={pctChange(today.sum, prevToday.sum)}
          empty={!hasOrders}
        />
        <StatCard
          label="Revenue · 7 days"
          value={formatPrice(last7.sum)}
          sub={`${last7.count} paid order${last7.count === 1 ? "" : "s"}`}
          delta={pctChange(last7.sum, prev7.sum)}
          empty={!hasOrders}
        />
        <StatCard
          label="Revenue · 30 days"
          value={formatPrice(last30.sum)}
          sub={`${last30.count} paid order${last30.count === 1 ? "" : "s"}`}
          delta={pctChange(last30.sum, prev30.sum)}
          empty={!hasOrders}
        />
        <StatCard
          label="Avg order value · 30d"
          value={formatPrice(aov30)}
          sub={
            allTime.count > 0
              ? `${formatPrice(Math.round(allTime.sum / allTime.count))} all time`
              : undefined
          }
          empty={last30.count === 0}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent orders"
            description="The last 10 orders placed."
            action={
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900"
              >
                All orders <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          {recentOrders.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No orders yet"
              description="Orders will appear here as soon as your first customer checks out."
            />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-2.5 font-semibold">Order</th>
                    <th className="px-4 py-2.5 font-semibold">Customer</th>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={String(o._id)} className="border-b border-ink-100 last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${String(o._id)}`}
                          className="font-medium text-teal-800 hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-ink-600">{o.email}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <StatusPill status={o.status} />
                          {o.paymentStatus !== "paid" && <StatusPill status={o.paymentStatus} />}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                        {formatPrice(o.grandTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Orders by status" />
            {statusCounts.length === 0 ? (
              <EmptyState icon={ReceiptText} title="No orders yet" />
            ) : (
              <ul className="divide-y divide-ink-100">
                {statusCounts.map((s) => (
                  <li key={s.status} className="flex items-center justify-between px-4 py-2.5">
                    <StatusPill status={s.status} />
                    <span className="text-sm font-medium text-ink-900">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Needs attention"
              action={
                pendingReviews > 0 ? (
                  <Link
                    href="/admin/reviews"
                    className="text-xs font-medium text-teal-700 hover:text-teal-900"
                  >
                    Moderate
                  </Link>
                ) : undefined
              }
            />
            <ul className="divide-y divide-ink-100 text-sm">
              <li className="flex items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-2 text-ink-600">
                  <MessageSquareQuote className="h-4 w-4 text-ink-400" /> Reviews pending
                </span>
                <span className="font-medium">{pendingReviews}</span>
              </li>
              <li className="flex items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-2 text-ink-600">
                  <AlertTriangle className="h-4 w-4 text-ink-400" /> Low-stock variants
                </span>
                <span className="font-medium">{lowStock.length}</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top products" description="By units sold." />
          {topProducts.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Nothing sold yet"
              description="Once products start selling, your best sellers show up here."
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {topProducts.map((p) => (
                <li key={String(p._id)} className="flex items-center gap-3 px-4 py-3">
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded border border-ink-200 bg-ink-100">
                    {p.images?.[0]?.url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.images[0].url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="m-2.5 h-5 w-5 text-ink-400" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/products/${String(p._id)}/edit`}
                      className="block truncate text-sm font-medium text-ink-900 hover:text-teal-800"
                    >
                      {p.title}
                    </Link>
                    <p className="text-xs text-ink-500">{formatPrice(p.price)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-ink-900">
                    {p.soldCount} sold
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Low stock"
            description="Variants at or below their threshold."
            action={
              <Link
                href="/admin/inventory?filter=low"
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900"
              >
                Inventory <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          {lowStock.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Everything is in stock"
              description="No active variant is at or below its low-stock threshold."
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {lowStock.map((v) => (
                <li key={String(v._id)} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{v.productTitle}</p>
                    <p className="truncate text-xs text-ink-500">
                      {v.title} · {v.sku}
                    </p>
                  </div>
                  <span
                    className={
                      v.inventoryQuantity === 0
                        ? "shrink-0 text-sm font-semibold text-red-600"
                        : "shrink-0 text-sm font-semibold text-gold-600"
                    }
                  >
                    {v.inventoryQuantity} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
