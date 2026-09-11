import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import { FacebookIcon, InstagramIcon, XIcon } from "./SocialIcons";
import { NewsletterForm } from "./NewsletterForm";
import type { NavCollection } from "@/types";

const company = [
  { label: "About us", href: "/about" },
  { label: "Contact us", href: "/contact" },
];

const service = [
  { label: "Shipping policy", href: "/policies/shipping" },
  { label: "Returns policy", href: "/policies/returns" },
  { label: "Terms of service", href: "/policies/terms" },
  { label: "Privacy policy", href: "/policies/privacy" },
];

const quickLinks = [
  { label: "Search", href: "/search" },
  { label: "Sign in", href: "/login" },
  { label: "Create account", href: "/register" },
  { label: "Track your order", href: "/orders/track" },
  { label: "Wishlist", href: "/wishlist" },
];

export function Footer({ collections }: { collections: NavCollection[] }) {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-teal-900 text-teal-50">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 md:py-14 lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-2">
          <Image
            src="/brand/logo.jpg"
            alt="Nuvora"
            width={180}
            height={48}
            className="h-9 w-auto rounded bg-white/95 object-contain px-2 py-1"
          />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-teal-100">
            Curated collections for your home. Furniture, décor and everyday essentials chosen
            to make every room feel like yours.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <a
              href="https://instagram.com"
              aria-label="Nuvora on Instagram"
              rel="noopener noreferrer"
              target="_blank"
              className="grid h-9 w-9 place-items-center rounded-full border border-teal-700 transition-colors hover:border-gold-400 hover:text-gold-400"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://facebook.com"
              aria-label="Nuvora on Facebook"
              rel="noopener noreferrer"
              target="_blank"
              className="grid h-9 w-9 place-items-center rounded-full border border-teal-700 transition-colors hover:border-gold-400 hover:text-gold-400"
            >
              <FacebookIcon />
            </a>
            <a
              href="https://twitter.com"
              aria-label="Nuvora on X"
              rel="noopener noreferrer"
              target="_blank"
              className="grid h-9 w-9 place-items-center rounded-full border border-teal-700 transition-colors hover:border-gold-400 hover:text-gold-400"
            >
              <XIcon />
            </a>
            <a
              href="mailto:support@nuvora.com"
              aria-label="Email Nuvora"
              className="grid h-9 w-9 place-items-center rounded-full border border-teal-700 transition-colors hover:border-gold-400 hover:text-gold-400"
            >
              <Mail size={16} />
            </a>
          </div>
        </div>

        <FooterColumn title="Shop" links={collections.slice(0, 6).map((c) => ({
          label: c.title,
          href: `/collections/${c.slug}`,
        }))} />

        <FooterColumn title="Service centre" links={service} />

        <div>
          <FooterColumn title="Company" links={[...company, ...quickLinks.slice(0, 2)]} />
        </div>
      </div>

      <div className="border-t border-teal-800">
        <div className="container-page flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-lg text-white">Stay in the loop</h3>
            <p className="mt-1 text-sm text-teal-100">
              New arrivals and offers, straight to your inbox.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-teal-800">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-teal-200 sm:flex-row">
          <p>© {new Date().getFullYear()} Nuvora. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <Link href="/policies/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/policies/terms" className="hover:text-white">
              Terms
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-gold-300">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-teal-100 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
