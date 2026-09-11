import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Image src="/brand/logo.jpg" alt="Nuvora" width={160} height={43} className="h-9 w-auto object-contain" />
      <p className="mt-8 font-display text-6xl text-teal-900">404</p>
      <h1 className="mt-2 font-display text-2xl text-ink-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-7 flex gap-3">
        <ButtonLink href="/">Back to home</ButtonLink>
        <ButtonLink href="/collections" variant="outline">
          Browse collections
        </ButtonLink>
      </div>
    </div>
  );
}
