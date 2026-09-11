import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import type { ProductCardData } from "@/types";

export function ProductSection({
  title,
  subtitle,
  href,
  products,
  priority = false,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  products: ProductCardData[];
  priority?: boolean;
}) {
  if (!products.length) return null;

  return (
    <section className="container-page py-10 md:py-14">
      <div className="mb-5 flex items-end justify-between gap-4 md:mb-7">
        <div>
          <h2 className="font-display text-2xl text-ink-900 md:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="group flex shrink-0 items-center gap-1.5 text-sm text-teal-800 transition-colors hover:text-teal-900"
          >
            View all
            <ArrowRight
              size={15}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {products.map((product, i) => (
          <ProductCard key={product._id} product={product} priority={priority && i < 4} />
        ))}
      </div>
    </section>
  );
}
