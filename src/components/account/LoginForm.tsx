"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, FormAlert } from "@/components/account/Field";
import { Button } from "@/components/ui/Button";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Email or password is incorrect");
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

      <div className="relative">
        <Field
          label="Password"
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={Boolean(error)}
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

      <Button type="submit" size="lg" fullWidth disabled={pending} className="mt-2">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-ink-600">
        New to Nuvora?{" "}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="font-medium text-teal-800 underline underline-offset-4 hover:text-teal-900"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
