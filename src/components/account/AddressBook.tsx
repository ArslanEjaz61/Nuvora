"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { Field, FormAlert, inputClass } from "@/components/account/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

type Draft = Omit<SavedAddress, "id">;

const emptyDraft: Draft = {
  label: "",
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  phone: "",
  isDefaultShipping: false,
  isDefaultBilling: false,
};

export function AddressBook({ initialAddresses }: { initialAddresses: SavedAddress[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SavedAddress | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(address: SavedAddress) {
    setEditing(address);
    setOpen(true);
  }

  async function handleDelete(address: SavedAddress) {
    setListError(null);
    try {
      const res = await fetch(`/api/account/addresses/${address.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setListError(data?.error ?? "We couldn't remove that address.");
        return;
      }
      setAddresses(data.addresses ?? addresses.filter((a) => a.id !== address.id));
    } catch {
      setListError("Something went wrong. Please try again.");
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink-900 md:text-3xl">Addresses</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Saved addresses make checkout a single step.
          </p>
        </div>
        <Button type="button" onClick={openNew} className="shrink-0">
          <Plus size={16} aria-hidden />
          Add address
        </Button>
      </header>

      {listError && (
        <div className="mb-5">
          <FormAlert tone="error">{listError}</FormAlert>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-300 bg-ink-50 p-10 text-center">
          <MapPin size={28} className="mx-auto text-ink-400" aria-hidden />
          <h2 className="mt-4 font-display text-lg text-ink-900">No addresses saved</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            Add the address you want your orders delivered to and we&rsquo;ll fill it in for you
            at checkout.
          </p>
          <Button type="button" onClick={openNew} className="mt-6">
            Add your first address
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex flex-col rounded-card border border-ink-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                {address.label && (
                  <span className="text-xs font-semibold uppercase tracking-widest text-ink-500">
                    {address.label}
                  </span>
                )}
                {address.isDefaultShipping && (
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-teal-800">
                    Default shipping
                  </span>
                )}
                {address.isDefaultBilling && (
                  <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold-700">
                    Default billing
                  </span>
                )}
              </div>

              <address className="mt-3 text-sm not-italic leading-relaxed text-ink-700">
                <span className="block font-medium text-ink-900">{address.fullName}</span>
                <span className="block">{address.line1}</span>
                {address.line2 && <span className="block">{address.line2}</span>}
                <span className="block">
                  {address.city}, {address.state} {address.postalCode}
                </span>
                <span className="block">{address.country}</span>
                {address.phone && (
                  <span className="mt-1 block text-ink-500">{address.phone}</span>
                )}
              </address>

              <div className="mt-5 flex items-center gap-4 border-t border-ink-200 pt-4">
                <button
                  type="button"
                  onClick={() => openEdit(address)}
                  className="inline-flex items-center gap-1.5 text-sm text-teal-800 transition-colors hover:text-teal-900"
                >
                  <Pencil size={14} aria-hidden />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(address)}
                  className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-red-600"
                >
                  <Trash2 size={14} aria-hidden />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <AddressModal
          address={editing}
          onClose={() => setOpen(false)}
          onSaved={(items) => {
            setAddresses(items);
            setOpen(false);
          }}
        />
      )}

      {confirmDelete && (
        <Modal title="Delete this address?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm leading-relaxed text-ink-600">
            {confirmDelete.fullName}, {confirmDelete.line1}, {confirmDelete.city} will be removed
            from your account. Orders already placed are not affected.
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setConfirmDelete(null)}
            >
              Keep it
            </Button>
            <Button
              type="button"
              fullWidth
              onClick={() => handleDelete(confirmDelete)}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800"
            >
              Delete address
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AddressModal({
  address,
  onClose,
  onSaved,
}: {
  address: SavedAddress | null;
  onClose: () => void;
  onSaved: (items: SavedAddress[]) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    address ? { ...address } : { ...emptyDraft }
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch(
        address ? `/api/account/addresses/${address.id}` : "/api/account/addresses",
        {
          method: address ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, country: draft.country.toUpperCase() }),
        }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "We couldn't save that address.");
        setPending(false);
        return;
      }

      onSaved(data.addresses ?? []);
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <Modal title={address ? "Edit address" : "Add an address"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <FormAlert tone="error">{error}</FormAlert>}

        <Field
          label="Label (optional)"
          placeholder="Home, office…"
          maxLength={40}
          value={draft.label}
          onChange={(e) => set("label", e.target.value)}
        />

        <Field
          label="Full name"
          autoComplete="name"
          required
          value={draft.fullName}
          onChange={(e) => set("fullName", e.target.value)}
        />

        <Field
          label="Address"
          autoComplete="address-line1"
          required
          value={draft.line1}
          onChange={(e) => set("line1", e.target.value)}
        />

        <Field
          label="Apartment, suite, etc. (optional)"
          autoComplete="address-line2"
          value={draft.line2}
          onChange={(e) => set("line2", e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="City"
            autoComplete="address-level2"
            required
            value={draft.city}
            onChange={(e) => set("city", e.target.value)}
          />
          <Field
            label="State / province"
            autoComplete="address-level1"
            required
            value={draft.state}
            onChange={(e) => set("state", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Postal code"
            autoComplete="postal-code"
            required
            value={draft.postalCode}
            onChange={(e) => set("postalCode", e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="address-country" className="text-sm font-medium text-ink-800">
              Country
            </label>
            <input
              id="address-country"
              className={cn(inputClass, "uppercase")}
              autoComplete="country"
              maxLength={2}
              required
              value={draft.country}
              onChange={(e) => set("country", e.target.value.toUpperCase())}
            />
            <p className="text-xs text-ink-500">Two-letter country code, e.g. US.</p>
          </div>
        </div>

        <Field
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          value={draft.phone}
          onChange={(e) => set("phone", e.target.value)}
        />

        <div className="space-y-2.5 rounded border border-ink-200 bg-ink-50 p-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={draft.isDefaultShipping}
              onChange={(e) => set("isDefaultShipping", e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 accent-teal-900"
            />
            Use as my default shipping address
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={draft.isDefaultBilling}
              onChange={(e) => set("isDefaultBilling", e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 accent-teal-900"
            />
            Use as my default billing address
          </label>
        </div>

        <div className="mt-1 flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth disabled={pending}>
            {pending ? "Saving…" : "Save address"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink-900/40 p-0 animate-fade-in sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative my-auto w-full max-w-lg rounded-t-card bg-white p-5 shadow-card-hover outline-none sm:rounded-card sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
