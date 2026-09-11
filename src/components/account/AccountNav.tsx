"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Heart, LayoutDashboard, LogOut, MapPin, Package, User } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/profile", label: "Profile", icon: User },
];

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The redirect below still lands the customer somewhere sensible.
    }
    router.push("/");
    router.refresh();
  }

  return (
    <nav aria-label="Account" className="md:sticky md:top-6">
      <ul
        className="hide-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-ink-200 px-4 pb-px md:mx-0 md:flex-col md:overflow-visible md:border-b-0 md:px-0"
      >
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;

          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors md:rounded md:border-b-0 md:border-l-2 md:px-3.5 md:py-2.5",
                  active
                    ? "border-teal-900 font-medium text-teal-900 md:bg-teal-50"
                    : "border-transparent text-ink-600 hover:text-teal-900 md:hover:bg-ink-50"
                )}
              >
                <Icon size={16} aria-hidden />
                {link.label}
              </Link>
            </li>
          );
        })}

        <li className="shrink-0 md:mt-2 md:border-t md:border-ink-200 md:pt-2">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm text-ink-600 transition-colors hover:text-teal-900 disabled:opacity-60 md:rounded md:border-b-0 md:border-l-2 md:px-3.5 md:py-2.5 md:hover:bg-ink-50"
          >
            <LogOut size={16} aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </li>
      </ul>
    </nav>
  );
}
