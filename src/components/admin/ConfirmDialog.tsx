"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui";

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  options,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  options: ConfirmOptions | null;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !options) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-900/40 p-4 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={options.title}
        className="w-full max-w-md rounded-card bg-white p-5 shadow-card-hover animate-fade-in"
      >
        <div className="flex gap-3">
          {options.destructive && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base text-ink-900">{options.title}</h3>
            {options.message && (
              <div className="mt-1.5 text-sm leading-relaxed text-ink-600">{options.message}</div>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {options.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            variant={options.destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={busy}
          >
            {options.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Imperative helper: `const { confirm, dialog } = useConfirm()` then `await confirm({...})`. */
export function useConfirm() {
  const [state, setState] = useState<{
    options: ConfirmOptions | null;
    resolve: ((v: boolean) => void) | null;
    busy: boolean;
  }>({ options: null, resolve: null, busy: false });

  const confirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => setState({ options, resolve, busy: false }));

  const close = (result: boolean) => {
    state.resolve?.(result);
    setState({ options: null, resolve: null, busy: false });
  };

  const dialog = (
    <ConfirmDialog
      open={Boolean(state.options)}
      options={state.options}
      busy={state.busy}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  );

  return { confirm, dialog };
}

export default ConfirmDialog;
