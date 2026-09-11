"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  push: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => {},
      success: () => {},
      error: () => {},
    };
  }
  return ctx;
}

let nextId = 1;

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = nextId++;
      setItems((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => remove(id), kind === "error" ? 6000 : 3500);
    },
    [remove]
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (m: string) => push(m, "success"),
      error: (m: string) => push(m, "error"),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      >
        {items.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-2.5 rounded-card border px-3.5 py-3 text-sm shadow-card animate-fade-in",
                t.kind === "success" && "border-teal-200 bg-teal-50 text-teal-900",
                t.kind === "error" && "border-red-200 bg-red-50 text-red-800",
                t.kind === "info" && "border-ink-200 bg-white text-ink-900"
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1 leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
