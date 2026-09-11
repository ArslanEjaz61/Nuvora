"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, Input, inputClass } from "../ui";

export interface ProductOption {
  name: string;
  values: string[];
}

export function OptionsEditor({
  options,
  onChange,
}: {
  options: ProductOption[];
  onChange: (next: ProductOption[]) => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  function update(index: number, patch: Partial<ProductOption>) {
    onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function addValue(index: number) {
    const raw = (drafts[index] ?? "").trim();
    if (!raw) return;
    const existing = options[index].values;
    const additions = raw
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v && !existing.includes(v));
    if (additions.length) update(index, { values: [...existing, ...additions] });
    setDrafts((d) => ({ ...d, [index]: "" }));
  }

  return (
    <div className="flex flex-col gap-3">
      {options.length === 0 && (
        <p className="text-sm text-ink-500">
          No option axes. Products without options still need one variant to be sellable.
        </p>
      )}

      {options.map((option, i) => (
        <div key={i} className="rounded-card border border-ink-200 p-3">
          <div className="flex items-center gap-2">
            <Input
              value={option.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Colour"
              className="max-w-48"
              aria-label="Option name"
            />
            <button
              type="button"
              onClick={() => onChange(options.filter((_, x) => x !== i))}
              className="ml-auto rounded p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
              aria-label="Remove option"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {option.values.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800"
              >
                {v}
                <button
                  type="button"
                  onClick={() => update(i, { values: option.values.filter((x) => x !== v) })}
                  className="text-teal-600 transition hover:text-red-600"
                  aria-label={`Remove ${v}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <input
            value={drafts[i] ?? ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [i]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addValue(i);
              }
            }}
            onBlur={() => addValue(i)}
            placeholder="Oak, Walnut, Charcoal — Enter to add"
            className={`${inputClass} mt-2`}
            aria-label="Option values"
          />
        </div>
      ))}

      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...options, { name: "", values: [] }])}
        >
          <Plus className="h-3.5 w-3.5" /> Add option
        </Button>
      </div>
    </div>
  );
}

export default OptionsEditor;
