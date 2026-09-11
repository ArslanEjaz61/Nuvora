import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { requireSessionFor } from "@/components/account/guard";
import { StatusPill } from "@/components/account/order-view";
import { ButtonLink } from "@/components/ui/Button";
import { connectDB } from "@/lib/db";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { Order, type IOrder } from "@/models/Order";

export const metadata: Metadata = {
  title: "Your orders",
  description: "Review and track every order you've placed with Nuvora.",
  robots: { index: false },
};

const PER_PAGE = 10;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const session = await requireSessionFor("/account/orders");
  const { page: pageParam } = await searchParams;

  const raw = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const requested = Number.parseInt(raw ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  await connectDB();

  const filter = { userId: session.userId };
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .lean<IOrder[]>(),
    Order.countDocuments(filter),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl text-ink-900 md:text-3xl">Your orders</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          {total === 0
            ? "Orders you place will appear here."
            : `${total} ${total === 1 ? "order" : "orders"} placed.`}
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-300 bg-ink-50 p-10 text-center">
          <Package size={28} className="mx-auto text-ink-400" aria-hidden />
          <h2 className="mt-4 font-display text-lg text-ink-900">No orders yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            When you place your first order it will show up here, with tracking as soon as it
            ships.
          </p>
          <ButtonLink href="/collections" className="mt-6">
            Browse collections
          </ButtonLink>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const thumbs = order.items.slice(0, 4);
            const extra = order.items.length - thumbs.length;

            return (
              <li
                key={String(order._id)}
                className="rounded-card border border-ink-200 bg-white p-4 transition-shadow hover:shadow-card sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/account/orders/${String(order._id)}`}
                      className="font-medium text-ink-900 hover:text-teal-900"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatDate(order.createdAt)} · {itemCount}{" "}
                      {itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={order.status} />
                    <StatusPill status={order.paymentStatus} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {thumbs.map((item, i) => (
                      <div
                        key={`${item.sku}-${i}`}
                        className="relative h-14 w-14 overflow-hidden rounded border border-ink-200 bg-ink-50"
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="grid h-full place-items-center text-[10px] text-ink-400">
                            —
                          </span>
                        )}
                      </div>
                    ))}
                    {extra > 0 && (
                      <span className="text-xs text-ink-500">+{extra} more</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-ink-900">
                      {formatPrice(order.grandTotal)}
                    </span>
                    <Link
                      href={`/account/orders/${String(order._id)}`}
                      className="inline-flex items-center gap-1 text-sm text-teal-800 hover:text-teal-900"
                    >
                      View details
                      <ChevronRight size={15} aria-hidden />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav
          aria-label="Order history pages"
          className="mt-8 flex items-center justify-between gap-4"
        >
          <PageLink href={`/account/orders?page=${page - 1}`} disabled={page <= 1}>
            <ChevronLeft size={15} aria-hidden />
            Previous
          </PageLink>
          <span className="text-sm text-ink-500">
            Page {page} of {pages}
          </span>
          <PageLink href={`/account/orders?page=${page + 1}`} disabled={page >= pages}>
            Next
            <ChevronRight size={15} aria-hidden />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex h-10 items-center gap-1.5 rounded border border-ink-300 px-3.5 text-sm transition-colors",
    disabled
      ? "pointer-events-none border-ink-200 text-ink-400"
      : "text-ink-800 hover:border-teal-900 hover:text-teal-900"
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
