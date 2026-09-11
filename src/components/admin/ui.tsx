"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-teal-900 text-white hover:bg-teal-800 disabled:bg-teal-900/50",
  secondary: "border border-ink-200 bg-white text-ink-800 hover:bg-ink-50",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-card font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export const inputClass =
  "w-full rounded-card border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-ink-50 disabled:text-ink-500";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "min-h-24 resize-y", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, "pr-8", props.className)} />;
}

export function Checkbox({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2 text-sm text-ink-800", className)}>
      <input
        type="checkbox"
        {...props}
        className="h-4 w-4 shrink-0 accent-teal-900"
      />
      {label && <span>{label}</span>}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-card border border-ink-200 bg-white shadow-card", className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <h2 className="font-display text-base text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin text-ink-400", className)} />;
}
