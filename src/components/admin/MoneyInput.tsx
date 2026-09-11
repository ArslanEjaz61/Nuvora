"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "./ui";

export function centsToDollarString(cents: number | null | undefined) {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return "";
  return (cents / 100).toFixed(2);
}

/** Parses a user-typed dollar string into integer cents. Returns null when blank. */
export function dollarsToCents(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (cleaned === "") return null;
  const dollars = Number.parseFloat(cleaned);
  if (!Number.isFinite(dollars)) return null;
  // Round rather than truncate so 19.999 does not silently become 19.99.
  return Math.round(dollars * 100);
}

export function MoneyInput({
  value,
  onChange,
  id,
  placeholder = "0.00",
  disabled,
  className,
  allowEmpty = false,
}: {
  value: number | null | undefined;
  onChange: (cents: number | null) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
}) {
  const [text, setText] = useState(() => centsToDollarString(value));

  useEffect(() => {
    const asCents = dollarsToCents(text);
    if (asCents !== (value ?? null)) setText(centsToDollarString(value));
    // Only resync when the authoritative cents value changes underneath us.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const cents = dollarsToCents(next);
          onChange(cents === null && !allowEmpty ? 0 : cents);
        }}
        onBlur={() => setText(centsToDollarString(dollarsToCents(text)))}
        className={cn(inputClass, "pl-7")}
      />
    </div>
  );
}

export default MoneyInput;
