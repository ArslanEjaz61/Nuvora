"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

export function AnnouncementBar({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 5000);
    return () => clearInterval(id);
  }, [messages.length]);

  if (!messages.length) return null;

  return (
    <div className="bg-teal-900 text-white">
      <div className="container-page flex h-10 items-center justify-between gap-4">
        <p
          key={index}
          className="animate-fade-in flex-1 truncate text-center text-xs tracking-wide sm:text-[13px]"
          aria-live="polite"
        >
          {messages[index]}
        </p>
        <span className="hidden shrink-0 items-center gap-1.5 text-[11px] text-teal-100 sm:flex">
          <ShieldCheck size={14} aria-hidden />
          Secure checkout
        </span>
      </div>
    </div>
  );
}
