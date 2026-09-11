"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";

interface SavedAddress {
  _id: string;
  label?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefaultShipping?: boolean;
}

const emptyAddress = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  phone: "",
};

export function CheckoutForm({
  defaultEmail,
  savedAddresses,
}: {
  defaultEmail: string;
  savedAddresses: SavedAddress[];
}) {
  const { cart, refresh } = useCart();
  const router = useRouter();

  const preferred =
    savedAddresses.find((a) => a.isDefaultShipping) ?? savedAddresses[0] ?? null;

  const [email, setEmail] = useState(defaultEmail);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    preferred?._id ?? "new"
  );
  const [shipping, setShipping] = useState(
    preferred ? toForm(preferred) : { ...emptyAddress }
  );
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState({ ...emptyAddress });
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function chooseAddress(id: string) {
    setSelectedAddressId(id);
    if (id === "new") {
      setShipping({ ...emptyAddress });
      return;
    }
    const found = savedAddresses.find((a) => a._id === id);
    if (found) setShipping(toForm(found));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Enter a valid email";
    if (!shipping.fullName.trim()) next.fullName = "Required";
    if (!shipping.line1.trim()) next.line1 = "Required";
    if (!shipping.city.trim()) next.city = "Required";
    if (!shipping.state.trim()) next.state = "Required";
    if (!shipping.postalCode.trim()) next.postalCode = "Required";

    if (!billingSame) {
      if (!billing.fullName.trim()) next.billingFullName = "Required";
      if (!billing.line1.trim()) next.billingLine1 = "Required";
      if (!billing.city.trim()) next.billingCity = "Required";
      if (!billing.state.trim()) next.billingState = "Required";
      if (!billing.postalCode.trim()) next.billingPostalCode = "Required";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          shippingAddress: shipping,
          billingAddress: billingSame ? undefined : billing,
          billingSameAsShipping: billingSame,
          customerNote: note,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "We couldn't start checkout. Try again.");
        return;
      }

      // Hand off to Stripe — payment never touches this app.
      window.location.href = data.url;
    } catch {
      setSubmitError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div className="container-page flex flex-col items-center gap-5 py-24 text-center">
        <ShoppingBag size={48} className="text-ink-300" strokeWidth={1.25} />
        <div>
          <h1 className="font-display text-2xl text-ink-900">Your cart is empty</h1>
          <p className="mt-2 text-sm text-ink-500">Add something before checking out.</p>
        </div>
        <ButtonLink href="/collections" size="lg">
          Browse collections
        </ButtonLink>
      </div>
    );
  }

  const blocked = cart.lines.some((l) => !l.inStock);

  return (
    <form onSubmit={onSubmit} className="container-page py-8 md:py-10">
      <h1 className="font-display text-3xl text-ink-900">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-lg text-ink-900">Contact</h2>
            <Field label="Email" error={errors.email} className="mt-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                className="h-11 w-full rounded border border-ink-200 px-3 text-sm outline-none focus:border-teal-600"
              />
            </Field>
            <p className="mt-2 text-xs text-ink-500">
              Your order confirmation goes here.{" "}
              <Link href="/login?next=/checkout" className="underline hover:text-teal-900">
                Sign in
              </Link>{" "}
              to use a saved address.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink-900">Shipping address</h2>

            {savedAddresses.length > 0 && (
              <div className="mt-3 space-y-2">
                {savedAddresses.map((address) => (
                  <label
                    key={address._id}
                    className="flex cursor-pointer items-start gap-3 rounded border border-ink-200 p-3 text-sm has-checked:border-teal-900"
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      checked={selectedAddressId === address._id}
                      onChange={() => chooseAddress(address._id)}
                      className="mt-0.5 accent-teal-900"
                    />
                    <span className="text-ink-700">
                      <span className="font-medium text-ink-900">{address.fullName}</span>
                      <br />
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                      {address.state} {address.postalCode}
                    </span>
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-3 rounded border border-ink-200 p-3 text-sm has-checked:border-teal-900">
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={selectedAddressId === "new"}
                    onChange={() => chooseAddress("new")}
                    className="accent-teal-900"
                  />
                  Use a different address
                </label>
              </div>
            )}

            {(selectedAddressId === "new" || savedAddresses.length === 0) && (
              <AddressFields
                values={shipping}
                onChange={setShipping}
                errors={errors}
                prefix=""
                autoCompletePrefix="shipping"
              />
            )}
          </section>

          <section>
            <label className="flex items-center gap-2.5 text-sm text-ink-800">
              <input
                type="checkbox"
                checked={billingSame}
                onChange={(e) => setBillingSame(e.target.checked)}
                className="h-4 w-4 accent-teal-900"
              />
              Billing address is the same as shipping
            </label>

            {!billingSame && (
              <>
                <h2 className="mt-5 font-display text-lg text-ink-900">Billing address</h2>
                <AddressFields
                  values={billing}
                  onChange={setBilling}
                  errors={errors}
                  prefix="billing"
                  autoCompletePrefix="billing"
                />
              </>
            )}
          </section>

          <section>
            <Field label="Order note (optional)">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Delivery instructions, gift message…"
                className="w-full rounded border border-ink-200 p-3 text-sm outline-none focus:border-teal-600"
              />
            </Field>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-card border border-ink-200 p-5 md:p-6">
            <h2 className="font-display text-lg text-ink-900">Order summary</h2>

            <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {cart.lines.map((line) => (
                <li key={line.variantId} className="flex gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded bg-ink-50">
                    {line.image && (
                      <Image
                        src={line.image}
                        alt={line.title}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                    <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-teal-900 px-1 text-[10px] font-semibold text-white">
                      {line.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs text-ink-800">{line.title}</p>
                    {line.variantTitle && (
                      <p className="text-xs text-ink-500">{line.variantTitle}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-ink-900">
                    {formatPrice(line.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2.5 border-t border-ink-200 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">Subtotal</dt>
                <dd className="tabular-nums text-ink-900">{formatPrice(cart.subtotal)}</dd>
              </div>
              {cart.discountTotal > 0 && (
                <div className="flex justify-between text-teal-700">
                  <dt>Discount{cart.coupon ? ` (${cart.coupon.code})` : ""}</dt>
                  <dd className="tabular-nums">−{formatPrice(cart.discountTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-600">Shipping</dt>
                <dd className="tabular-nums text-ink-900">
                  {cart.shippingTotal === 0 ? "Free" : formatPrice(cart.shippingTotal)}
                </dd>
              </div>
              {cart.taxTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-600">Tax</dt>
                  <dd className="tabular-nums text-ink-900">{formatPrice(cart.taxTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-ink-200 pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(cart.grandTotal)}</dd>
              </div>
            </dl>

            {submitError && (
              <p className="mt-4 rounded bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                {submitError}
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              className="mt-5"
              disabled={submitting || blocked}
            >
              {submitting ? "Redirecting…" : "Continue to payment"}
            </Button>

            {blocked && (
              <p className="mt-2 text-center text-xs text-red-600">
                An item in your cart is out of stock.
              </p>
            )}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-400">
              <Lock size={12} aria-hidden />
              Payment is handled by Stripe. Card details never reach our servers.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}

type AddressForm = typeof emptyAddress;

function toForm(address: SavedAddress): AddressForm {
  return {
    fullName: address.fullName,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country || "US",
    phone: address.phone ?? "",
  };
}

function AddressFields({
  values,
  onChange,
  errors,
  prefix,
  autoCompletePrefix,
}: {
  values: AddressForm;
  onChange: (next: AddressForm) => void;
  errors: Record<string, string>;
  prefix: string;
  autoCompletePrefix: string;
}) {
  const key = (name: string) =>
    prefix ? `${prefix}${name[0].toUpperCase()}${name.slice(1)}` : name;

  const set = (field: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...values, [field]: e.target.value });

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <Field label="Full name" error={errors[key("fullName")]} className="sm:col-span-2">
        <input
          value={values.fullName}
          onChange={set("fullName")}
          autoComplete={`${autoCompletePrefix} name`}
          aria-invalid={Boolean(errors[key("fullName")])}
          className="h-11 w-full rounded border border-ink-200 px-3 text-sm outline-none focus:border-teal-600"
        />
      </Field>

      <Field label="Address" error={errors[key("line1")]} className="sm:col-span-2">
        <input
          value={values.line1}
          onChange={set("line1")}
          autoComplete={`${autoCompletePrefix} address-line1`}
          aria-invalid={Boolean(errors[key("line1")])}
          className="h-11 w-full rounded border border-ink-200 px-3 text-sm outline-none focus:border-teal-600"
        />
      </Field>

      <Field label="Apartment, suite (optional)" className="sm:col-span-2">
        <input
          value={values.line2}
          onChange={set("line2")}
          autoComplete={`${autoCompletePrefix} address-line2`}
          className="h-11 w-full rounded border border-ink-200 px-3 text-sm outline-none focus:border-teal-600"
        />
      </Field>

      <Field label="City" error={errors[key("city")]}>
        <input
          value={values.city}
          onChange={set("city")}
          autoComplete={`${autoCompletePrefix} address-level2`}
          aria-invalid={Boolean(errors[key("city")])}
          className="h-11 w-full rounded border border-ink-200 px-3 text-sm outline-none focus:border-teal-600"
        />
      </Field>

      <Field label="State" error={errors[key("state")]}>
        <input
          value={values.state}
          onChange={set("state")}
          autoComplete={`${autoCompletePrefix} address-level1`}
          aria-invalid={Boolean(errors[key("state")])}
          className="h-11 w-full rounded border border-ink-200 px-3 text-sm outline-none focus:border-teal-600"
        />
      </Field>

      <Field label="ZIP / postal code" error={errors[key("postalCode")]}>
        <input
          value={values.postalCode}
          onChange={set("postalCode")}
          autoComplete={`${autoCompletePrefix} postal-code`}
          aria-invalid={Boolean(errors[key("postalCode")])}
          className="h-11 w-full rounded border border-ink-200 px-3 text-sm outline-none focus:border-teal-600"
        />
      </Field>

      <Field label="Phone (optional)">
        <input
          value={values.phone}
          onChange={set("phone")}
          type="tel"
          autoComplete={`${autoCompletePrefix} tel`}
          className="h-11 w-full rounded border border-ink-200 px-3 text-sm outline-none focus:border-teal-600"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-medium text-ink-900">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
