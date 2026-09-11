"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Field, FormAlert } from "@/components/account/Field";
import { OrderDetailView, type OrderView } from "@/components/account/order-view";
import { Button } from "@/components/ui/Button";

// Deliberately generic: never confirm that the order number or the email alone
// matched something.
const GENERIC_ERROR = "We couldn't find an order with those details.";

export function OrderTracker() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.order) {
        setOrder(null);
        setError(GENERIC_ERROR);
        return;
      }

      setOrder(data.order as OrderView);
    } catch {
      setOrder(null);
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (order) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOrder(null)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-teal-900"
        >
          <Search size={15} aria-hidden />
          Look up another order
        </button>
        <OrderDetailView order={order} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-card border border-ink-200 bg-white p-6 shadow-card sm:p-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <FormAlert tone="error">{error}</FormAlert>}

        <Field
          label="Order number"
          name="orderNumber"
          placeholder="NUV-XXXXXX"
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          invalid={Boolean(error)}
          hint="You'll find this on your order confirmation email."
        />

        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={Boolean(error)}
        />

        <Button type="submit" size="lg" fullWidth disabled={pending} className="mt-2">
          {pending ? "Looking…" : "Find my order"}
        </Button>
      </form>
    </div>
  );
}
