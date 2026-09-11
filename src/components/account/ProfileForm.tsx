"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormAlert } from "@/components/account/Field";
import { Button } from "@/components/ui/Button";

export interface ProfileValues {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  marketingOptIn: boolean;
}

export function ProfileForm({ user }: { user: ProfileValues }) {
  return (
    <div className="space-y-12">
      <DetailsForm user={user} />
      <PasswordForm />
    </div>
  );
}

function DetailsForm({ user }: { user: ProfileValues }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone);
  const [marketingOptIn, setMarketingOptIn] = useState(user.marketingOptIn);
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(
    null
  );
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setPending(true);

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, marketingOptIn }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({ tone: "error", message: data?.error ?? "We couldn't save your details." });
        return;
      }

      setStatus({ tone: "success", message: "Your details have been saved." });
      // The header greets the customer by first name, so refresh the server tree.
      router.refresh();
    } catch {
      setStatus({ tone: "error", message: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2 className="font-display text-lg text-ink-900">Your details</h2>
      <p className="mt-1 text-sm text-ink-500">
        We use these on your orders and delivery updates.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex max-w-xl flex-col gap-4" noValidate>
        {status && <FormAlert tone={status.tone}>{status.message}</FormAlert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="First name"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Field
            label="Last name"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <Field
          label="Email"
          type="email"
          value={user.email}
          readOnly
          disabled
          hint="Contact us if you need to change the email on your account."
          className="opacity-80"
        />

        <Field
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-600">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-teal-900"
          />
          Email me new arrivals and offers. You can unsubscribe at any time.
        </label>

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(
    null
  );
  const [pending, setPending] = useState(false);

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (mismatch) {
      setStatus({ tone: "error", message: "The two new passwords don't match." });
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({ tone: "error", message: data?.error ?? "We couldn't change your password." });
        return;
      }

      setStatus({ tone: "success", message: "Your password has been changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setStatus({ tone: "error", message: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="border-t border-ink-200 pt-10">
      <h2 className="font-display text-lg text-ink-900">Change password</h2>
      <p className="mt-1 text-sm text-ink-500">
        Use at least 8 characters, with an uppercase letter, a lowercase letter and a number.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex max-w-xl flex-col gap-4" noValidate>
        {status && <FormAlert tone={status.tone}>{status.message}</FormAlert>}

        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />

        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <Field
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={mismatch ? "The two new passwords don't match." : undefined}
        />

        <div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
