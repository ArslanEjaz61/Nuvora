import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-xs text-ink-400">No prior period</span>;
  }
  const flat = Math.abs(delta) < 0.5;
  const Icon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        flat ? "text-ink-500" : delta > 0 ? "text-teal-700" : "text-red-600"
      )}
    >
      <Icon className="h-3 w-3" />
      {flat ? "0%" : `${Math.abs(Math.round(delta))}%`}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  delta,
  empty,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  empty?: boolean;
}) {
  return (
    <div className="rounded-card border border-ink-200 bg-white p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      {empty ? (
        <p className="mt-2 text-sm text-ink-400">No data yet</p>
      ) : (
        <>
          <p className="mt-1.5 font-display text-2xl text-ink-900">{value}</p>
          <div className="mt-1 flex items-center gap-2">
            {delta !== undefined && <DeltaBadge delta={delta} />}
            {sub && <span className="text-xs text-ink-500">{sub}</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default StatCard;
