"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl text-ink-900">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        We hit a snag loading this page. Try again, or head back to the homepage.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Go home
        </Button>
      </div>
    </div>
  );
}
