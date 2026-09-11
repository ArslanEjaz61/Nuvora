"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Field, FormAlert, inputClass } from "@/components/account/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, orderNumber, subject, message }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "We couldn't send your message. Please try again.");
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again, or email support@nuvora.com.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-card border border-teal-200 bg-teal-50 p-8 text-center">
        <CheckCircle2 size={28} className="mx-auto text-teal-700" aria-hidden />
        <h2 className="mt-4 font-display text-xl text-teal-900">Message sent</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-teal-800">
          Thanks for writing in, {name.split(" ")[0] || "friend"}. We reply within 1 business day
          — keep an eye on {email || "your inbox"}.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={() => {
            setSent(false);
            setSubject("");
            setMessage("");
            setOrderNumber("");
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error && <FormAlert tone="error">{error}</FormAlert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Your name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <Field
        label="Order number (optional)"
        placeholder="NUV-XXXXXX"
        value={orderNumber}
        onChange={(e) => setOrderNumber(e.target.value)}
        hint="Helps us find your order faster."
      />

      <Field
        label="Subject"
        required
        maxLength={160}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="text-sm font-medium text-ink-800">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={6}
          maxLength={3000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={cn(inputClass, "h-auto resize-y py-2.5 leading-relaxed")}
        />
        <p className="text-xs text-ink-500">
          Dimensions, finishes, delivery, returns — tell us as much as you can.
        </p>
      </div>

      <div className="mt-1">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
