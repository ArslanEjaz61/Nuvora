import { cn } from "@/lib/utils";
import { Inbox, type LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-400">
        <Icon className="h-5 w-5" />
      </span>
      <p className="font-display text-base text-ink-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
