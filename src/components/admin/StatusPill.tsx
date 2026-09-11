import { cn } from "@/lib/utils";

export type PillTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONES: Record<PillTone, string> = {
  neutral: "bg-ink-100 text-ink-600 ring-ink-200",
  success: "bg-teal-50 text-teal-800 ring-teal-200",
  warning: "bg-gold-50 text-gold-700 ring-gold-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  brand: "bg-teal-900 text-white ring-teal-900",
};

const TONE_BY_STATUS: Record<string, PillTone> = {
  active: "success",
  approved: "success",
  paid: "success",
  delivered: "success",
  draft: "neutral",
  hidden: "neutral",
  unpaid: "neutral",
  archived: "neutral",
  rejected: "danger",
  cancelled: "danger",
  failed: "danger",
  expired: "danger",
  exhausted: "danger",
  pending: "warning",
  processing: "warning",
  scheduled: "info",
  shipped: "info",
  refunded: "info",
};

export function StatusPill({
  status,
  tone,
  className,
}: {
  status: string;
  tone?: PillTone;
  className?: string;
}) {
  const resolved = tone ?? TONE_BY_STATUS[status.toLowerCase()] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset",
        TONES[resolved],
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default StatusPill;
