import {
  Headset,
  RotateCcw,
  ShieldCheck,
  Truck,
  Sparkles,
  Package,
  CreditCard,
  Heart,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  Truck,
  ShieldCheck,
  RotateCcw,
  Headset,
  Sparkles,
  Package,
  CreditCard,
  Heart,
};

export interface ValuePropData {
  icon: string;
  title: string;
  description?: string;
}

export function ValueProps({ items }: { items: ValuePropData[] }) {
  if (!items.length) return null;

  return (
    <section className="border-b border-ink-200 bg-ink-50">
      <div className="container-page grid grid-cols-2 gap-x-4 gap-y-6 py-8 md:grid-cols-4 md:py-10">
        {items.map((item) => {
          const Icon = icons[item.icon] ?? Sparkles;
          return (
            <div key={item.title} className="flex items-center gap-3 md:justify-center">
              <Icon size={26} strokeWidth={1.4} className="shrink-0 text-teal-700" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{item.title}</p>
                {item.description && (
                  <p className="truncate text-xs text-ink-500">{item.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
