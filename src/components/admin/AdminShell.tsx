"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgePercent,
  Boxes,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  MessageSquareQuote,
  Package,
  ReceiptText,
  Store,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/collections", label: "Collections", icon: Boxes },
  { href: "/admin/inventory", label: "Inventory", icon: Store },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: BadgePercent },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote },
  { href: "/admin/homepage", label: "Homepage", icon: LayoutTemplate },
  { href: "/admin/media", label: "Media", icon: Images },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-card px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-teal-900 text-white"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  adminName,
  adminEmail,
  children,
}: {
  adminName: string;
  adminEmail: string;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-ink-200 bg-white lg:flex">
        <Link
          href="/admin"
          className="flex h-14 shrink-0 items-center gap-2 border-b border-ink-200 px-5"
        >
          <span className="font-display text-lg tracking-tight text-teal-900">Nuvora</span>
          <span className="rounded-full bg-gold-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-700">
            Admin
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="border-t border-ink-200 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-card px-3 py-2 text-xs text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
          >
            <Store className="h-3.5 w-3.5" /> View storefront
          </Link>
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink-900/40 animate-fade-in"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col bg-white shadow-drawer">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-ink-200 px-4">
              <span className="font-display text-lg text-teal-900">Nuvora Admin</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded p-1.5 text-ink-500 hover:bg-ink-100"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-card p-2 text-ink-600 transition hover:bg-ink-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-base text-teal-900 lg:hidden">Nuvora</span>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-ink-900">{adminName}</p>
              <p className="text-xs text-ink-500">{adminEmail}</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-900 text-xs font-semibold text-white">
              {adminName.slice(0, 1).toUpperCase()}
            </span>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 rounded-card border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-50 disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}

export default AdminShell;
