"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroSlideData {
  image: string;
  mobileImage?: string;
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function Hero({ slides }: { slides: HeroSlideData[] }) {
  const [index, setIndex] = useState(0);
  const multiple = slides.length > 1;

  useEffect(() => {
    if (!multiple) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6500);
    return () => clearInterval(id);
  }, [multiple, slides.length]);

  if (!slides.length) return null;

  const go = (next: number) => setIndex((next + slides.length) % slides.length);

  return (
    <section className="relative overflow-hidden bg-teal-900" aria-roledescription="carousel">
      <div className="relative aspect-[16/10] w-full sm:aspect-[21/9] lg:aspect-[64/21]">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            aria-hidden={i !== index}
          >
            <Image
              src={slide.image}
              alt={slide.heading ?? "Nuvora"}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />

            {/* Only large baked-in text (heading) needs a darkening scrim; an
                eyebrow/CTA-only slide (photo already carries its own text)
                stays crisp instead of getting double-darkened. */}
            {slide.heading && (
              <div className="absolute inset-0 bg-gradient-to-r from-teal-950/80 via-teal-950/40 to-transparent" />
            )}

            <div className="container-page absolute inset-0 flex flex-col justify-between pb-3 pt-5 sm:pb-4 sm:pt-6 lg:pb-5 lg:pt-8">
              <div className="max-w-lg">
                {slide.eyebrow && (
                  <span className="inline-block rounded border border-gold-300/60 bg-ink-900/25 px-3 py-1.5 text-[11px] font-medium tracking-[0.08em] text-gold-300 backdrop-blur-[2px] sm:text-xs">
                    {slide.eyebrow}
                  </span>
                )}
                {slide.heading && (
                  <h1 className="mt-3 font-display text-3xl leading-tight text-white sm:mt-4 sm:text-5xl lg:text-6xl">
                    {slide.heading}
                  </h1>
                )}
                {slide.subheading && (
                  <p className="mt-2 max-w-md text-sm text-teal-50 sm:mt-3 sm:text-base">
                    {slide.subheading}
                  </p>
                )}
              </div>

              {slide.ctaLabel && slide.ctaHref && (
                <div className="max-w-lg">
                  <Link
                    href={slide.ctaHref}
                    className="inline-flex h-9 items-center rounded bg-gold-500 px-5 text-xs font-medium text-ink-900 shadow-card transition-colors hover:bg-gold-400 sm:h-10 sm:px-6 sm:text-sm lg:h-11 lg:px-7"
                  >
                    {slide.ctaLabel}
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {multiple && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink-900 transition-colors hover:bg-white md:grid"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink-900 transition-colors hover:bg-white md:grid"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-7 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
