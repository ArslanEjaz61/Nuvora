import type { Metadata } from "next";
import Link from "next/link";
import { OrderTracker } from "@/components/account/OrderTracker";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Enter your order number and email to see the status of your Nuvora order, including tracking once it ships.",
  alternates: { canonical: "/orders/track" },
};

export default function TrackOrderPage() {
  return (
    <div className="container-page py-10 md:py-14">
      <header className="mx-auto mb-8 max-w-md text-center">
        <h1 className="font-display text-2xl text-ink-900 md:text-3xl">Track your order</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          Enter the order number from your confirmation email along with the email address you
          used, and we&rsquo;ll show you where things stand.
        </p>
      </header>

      <OrderTracker />

      <p className="mx-auto mt-8 max-w-md text-center text-sm text-ink-500">
        Have an account?{" "}
        <Link
          href="/account/orders"
          className="font-medium text-teal-800 underline underline-offset-4 hover:text-teal-900"
        >
          See all of your orders
        </Link>
        .
      </p>
    </div>
  );
}
