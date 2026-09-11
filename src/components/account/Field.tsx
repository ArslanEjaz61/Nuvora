"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-11 w-full rounded border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-teal-700 aria-[invalid=true]:border-red-500";

export function Field({
  label,
  error,
  hint,
  invalid,
  className,
  children,
  ...props
}: {
  label: string;
  error?: string;
  hint?: string;
  /** Marks the field as errored when the message itself lives elsewhere. */
  invalid?: boolean;
  className?: string;
  children?: never;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "children">) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink-800">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error || invalid ? true : undefined}
        aria-describedby={describedBy}
        className={inputClass}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormAlert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded border px-3 py-2.5 text-sm",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-teal-200 bg-teal-50 text-teal-800"
      )}
    >
      {children}
    </p>
  );
}
