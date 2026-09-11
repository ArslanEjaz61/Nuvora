"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  title,
}: {
  images: { url: string; alt?: string }[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="grid aspect-square place-items-center rounded-card bg-ink-100 text-sm text-ink-400">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
      {images.length > 1 && (
        <div className="hide-scrollbar flex gap-3 overflow-x-auto md:max-h-[560px] md:flex-col md:overflow-y-auto">
          {images.map((image, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={cn(
                "relative h-18 w-18 shrink-0 overflow-hidden rounded border transition-colors md:h-20 md:w-20",
                i === active ? "border-teal-900" : "border-ink-200 hover:border-ink-300"
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="relative aspect-square flex-1 overflow-hidden rounded-card bg-ink-50">
        <Image
          key={active}
          src={images[active].url}
          alt={images[active].alt ?? title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="animate-fade-in object-cover"
        />
      </div>
    </div>
  );
}
