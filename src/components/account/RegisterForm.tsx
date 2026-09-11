"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Field, FormAlert } from "@/components/account/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Mirrors the server rule in registerSchema so the hint never disagrees with it.
const rules = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
];

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const passed = useMemo(() => rules.map((rule) => rule.test(password)), [password]);
  const allPassed = passed.every(Boolean);
  const strength = passed.filter(Boolean).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allPassed) {
      setError("Please choose a password that meets all four requirements.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, marketingOptIn }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "We couldn't create your account. Please try again.");
        setPending(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error && <FormAlert tone="error">{error}</FormAlert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          name="firstName"
          autoComplete="given-name"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Field
          label="Last name"
          name="lastName"
          autoComplete="family-name"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <Field
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div>
        <div className="relative">
          <Field
            label="Password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={password.length > 0 && !allPassed ? true : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-[2.05rem] text-ink-500 transition-colors hover:text-ink-800"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        <div className="mt-3 flex gap-1.5" aria-hidden>
          {rules.map((rule, i) => (
            <span
              key={rule.label}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < strength ? (allPassed ? "bg-teal-600" : "bg-gold-500") : "bg-ink-200"
              )}
            />
          ))}
        </div>

        <ul className="mt-2.5 grid gap-1 sm:grid-cols-2">
          {rules.map((rule, i) => (
            <li
              key={rule.label}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                passed[i] ? "text-teal-700" : "text-ink-500"
              )}
            >
              {passed[i] ? <Check size={13} aria-hidden /> : <X size={13} aria-hidden />}
              {rule.label}
            </li>
          ))}
        </ul>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-600">
        <input
          type="checkbox"
          name="marketingOptIn"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-teal-900"
        />
        Email me new arrivals and offers. You can unsubscribe at any time.
      </label>

      <Button type="submit" size="lg" fullWidth disabled={pending} className="mt-1">
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-ink-600">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-medium text-teal-800 underline underline-offset-4 hover:text-teal-900"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
