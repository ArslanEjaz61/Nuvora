import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, MapPin, Package, User } from "lucide-react";
import { StatusPill } from "@/components/account/order-view";
import { requireSessionFor } from "@/components/account/guard";
import { ButtonLink } from "@/components/ui/Button";
import { connectDB } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/utils";
import { Order, type IOrder } from "@/models/Order";
import { User as UserModel, type IUser } from "@/models/User";

export const metadata: Metadata = {
  title: "Account overview",
  description: "Your Nuvora account at a glance.",
  robots: { index: false },
};

const quickLinks = [
  { href: "/account/orders", label: "All orders", description: "Track and review past orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", description: "Manage where we deliver", icon: MapPin },
  { href: "/wishlist", label: "Wishlist", description: "The pieces you've saved", icon: Heart },
  { href: "/account/profile", label: "Profile", description: "Name, phone and password", icon: User },
];

export default async function AccountOverviewPage() {
  const session = await requireSessionFor("/account");
  await connectDB();

  const [orders, user] = await Promise.all([
    Order.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean<IOrder[]>(),
    UserModel.findById(session.userId).select("firstName addresses").lean<IUser | null>(),
  ]);

  const addresses = user?.addresses ?? [];
  const defaultAddress = addresses.find((a) => a.isDefaultShipping) ?? addresses[0];
  const firstName = user?.firstName || session.firstName || "there";

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-2xl text-ink-900 md:text-3xl">Hello, {firstName}</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Here&rsquo;s what&rsquo;s happening with your Nuvora account.
        </p>
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-display text-lg text-ink-900">Recent orders</h2>
          {orders.length > 0 && (
            <Link
              href="/account/orders"
              className="group flex shrink-0 items-center gap-1.5 text-sm text-teal-800 hover:text-teal-900"
            >
              View all
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="rounded-card border border-dashed border-ink-300 bg-ink-50 p-8 text-center">
            <p className="text-sm text-ink-600">You haven&rsquo;t placed an order yet.</p>
            <ButtonLink href="/collections" className="mt-5">
              Start shopping
            </ButtonLink>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={String(order._id)}>
                <Link
                  href={`/account/orders/${String(order._id)}`}
                  className="flex items-center gap-4 rounded-card border border-ink-200 bg-white p-4 transition-shadow hover:shadow-card"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-ink-200 bg-ink-50">
                    {order.items[0]?.image ? (
                      <Image
                        src={order.items[0].image}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <Package size={18} className="absolute inset-0 m-auto text-ink-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {order.orderNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatDate(order.createdAt)} ·{" "}
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-semibold text-ink-900">
                      {formatPrice(order.grandTotal)}
                    </span>
                    <StatusPill status={order.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-display text-lg text-ink-900">Default address</h2>
          <Link
            href="/account/addresses"
            className="shrink-0 text-sm text-teal-800 hover:text-teal-900"
          >
            {defaultAddress ? "Manage" : "Add one"}
          </Link>
        </div>

        {defaultAddress ? (
          <address className="rounded-card border border-ink-200 bg-white p-5 text-sm not-italic leading-relaxed text-ink-700">
            <span className="block font-medium text-ink-900">{defaultAddress.fullName}</span>
            <span className="block">{defaultAddress.line1}</span>
            {defaultAddress.line2 && <span className="block">{defaultAddress.line2}</span>}
            <span className="block">
              {defaultAddress.city}, {defaultAddress.state} {defaultAddress.postalCode}
            </span>
            <span className="block">{defaultAddress.country}</span>
          </address>
        ) : (
          <div className="rounded-card border border-dashed border-ink-300 bg-ink-50 p-8 text-center">
            <p className="text-sm text-ink-600">
              No saved addresses yet. Add one to speed up checkout.
            </p>
            <ButtonLink href="/account/addresses" variant="outline" className="mt-5">
              Add an address
            </ButtonLink>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg text-ink-900">Quick links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-start gap-3 rounded-card border border-ink-200 bg-white p-4 transition-colors hover:border-teal-700"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-800">
                  <Icon size={17} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-900 group-hover:text-teal-900">
                    {link.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">{link.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
