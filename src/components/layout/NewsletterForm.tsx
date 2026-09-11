"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setState(res.ok ? "done" : "error");
      if (res.ok) setEmail("");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm text-gold-300" role="status">
        Thanks — you&apos;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md gap-2">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="h-11 min-w-0 flex-1 rounded border border-teal-700 bg-teal-950/40 px-3.5 text-sm text-white outline-none transition-colors placeholder:text-teal-300 focus:border-gold-400"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="h-11 shrink-0 rounded bg-gold-500 px-5 text-sm font-medium text-ink-900 transition-colors hover:bg-gold-400 disabled:opacity-60"
      >
        {state === "sending" ? "…" : "Subscribe"}
      </button>
      {state === "error" && (
        <p className="sr-only" role="alert">
          Subscription failed. Try again.
        </p>
      )}
    </form>
  );
}
