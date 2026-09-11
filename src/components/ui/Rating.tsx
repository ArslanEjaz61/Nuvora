import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  value,
  count,
  size = 14,
  showCount = true,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  showCount?: boolean;
  className?: string;
}) {
  const rounded = Math.round(value * 2) / 2;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`Rated ${value.toFixed(1)} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            width={size}
            height={size}
            aria-hidden
            className={cn(
              rounded >= star
                ? "fill-gold-500 text-gold-500"
                : rounded >= star - 0.5
                  ? "fill-gold-200 text-gold-500"
                  : "fill-transparent text-ink-300"
            )}
            strokeWidth={1.5}
          />
        ))}
      </div>
      {showCount && typeof count === "number" && (
        <span className="text-xs text-ink-500">({count})</span>
      )}
    </div>
  );
}
