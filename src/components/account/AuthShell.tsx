import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page flex flex-col items-center py-12 md:py-16">
      <Link href="/" className="mb-7 inline-block">
        <Image
          src="/brand/logo.jpg"
          alt="Nuvora"
          width={200}
          height={54}
          priority
          className="h-11 w-auto object-contain"
        />
      </Link>

      <div className="w-full max-w-[440px] rounded-card border border-ink-200 bg-white p-6 shadow-card sm:p-8">
        <h1 className="font-display text-2xl text-ink-900">{title}</h1>
        <p className="mt-1.5 mb-6 text-sm leading-relaxed text-ink-500">{subtitle}</p>
        {children}
      </div>

      <Link
        href="/"
        className="mt-7 inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-teal-900"
      >
        <ArrowLeft size={15} aria-hidden />
        Back to the store
      </Link>
    </div>
  );
}
