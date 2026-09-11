"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, ShoppingBag, User, X, Heart } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/utils";
import type { NavCollection } from "@/types";

export function Header({
  collections,
  isLoggedIn,
}: {
  collections: NavCollection[];
  isLoggedIn: boolean;
}) {
  const { cart, openCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
      <div className="container-page flex h-16 items-center gap-3 md:h-20 md:gap-6">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="-ml-1 grid h-10 w-10 place-items-center text-ink-800 lg:hidden"
        >
          <Menu size={22} />
        </button>

        <Link href="/" className="flex shrink-0 items-center" aria-label="Nuvora home">
          <Image
            src="/brand/logo.jpg"
            alt="Nuvora"
            width={180}
            height={48}
            priority
            className="h-8 w-auto object-contain md:h-10"
          />
        </Link>

        <nav className="hidden flex-1 items-center gap-6 lg:flex" aria-label="Main">
          {collections.map((collection) => (
            <div key={collection._id} className="group relative">
              <Link
                href={`/collections/${collection.slug}`}
                className={cn(
                  "flex items-center py-2 text-sm text-ink-700 transition-colors hover:text-teal-900",
                  pathname === `/collections/${collection.slug}` && "text-teal-900"
                )}
              >
                {collection.title}
              </Link>

              {collection.children && collection.children.length > 0 && (
                <div className="invisible absolute left-0 top-full z-50 min-w-52 rounded-card border border-ink-200 bg-white py-2 opacity-0 shadow-card-hover transition-all duration-150 group-hover:visible group-hover:opacity-100">
                  {collection.children.map((child) => (
                    <Link
                      key={child._id}
                      href={`/collections/${child.slug}`}
                      className="block px-4 py-2 text-sm text-ink-700 transition-colors hover:bg-ink-50 hover:text-teal-900"
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 md:gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            aria-expanded={searchOpen}
            className="grid h-10 w-10 place-items-center text-ink-800 transition-colors hover:text-teal-900"
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>

          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="hidden h-10 w-10 place-items-center text-ink-800 transition-colors hover:text-teal-900 sm:grid"
          >
            <Heart size={20} />
          </Link>

          <Link
            href={isLoggedIn ? "/account" : "/login"}
            aria-label={isLoggedIn ? "Your account" : "Sign in"}
            className="grid h-10 w-10 place-items-center text-ink-800 transition-colors hover:text-teal-900"
          >
            <User size={20} />
          </Link>

          <button
            type="button"
            onClick={openCart}
            aria-label={`Cart, ${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"}`}
            className="relative grid h-10 w-10 place-items-center text-ink-800 transition-colors hover:text-teal-900"
          >
            <ShoppingBag size={20} />
            {cart.itemCount > 0 && (
              <span className="absolute right-1 top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-teal-900 px-1 text-[10px] font-semibold text-white">
                {cart.itemCount > 99 ? "99+" : cart.itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="animate-fade-in border-t border-ink-200 bg-white">
          <form onSubmit={submitSearch} className="container-page flex h-16 items-center gap-3">
            <Search size={18} className="shrink-0 text-ink-400" aria-hidden />
            <input
              ref={searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Search furniture, décor and more…"
              aria-label="Search products"
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
            />
            <button
              type="submit"
              className="h-9 shrink-0 rounded bg-teal-900 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-800"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {mobileOpen && (
        <MobileNav
          collections={collections}
          isLoggedIn={isLoggedIn}
          onClose={() => setMobileOpen(false)}
        />
      )}
    </header>
  );
}

function MobileNav({
  collections,
  isLoggedIn,
  onClose,
}: {
  collections: NavCollection[];
  isLoggedIn: boolean;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/40"
      />
      <div className="animate-slide-in-right absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white shadow-drawer">
        <div className="flex h-16 items-center justify-between border-b border-ink-200 px-4">
          <span className="font-display text-lg text-teal-900">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-10 w-10 place-items-center text-ink-700"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2" aria-label="Mobile">
          {collections.map((collection) => (
            <div key={collection._id} className="border-b border-ink-100">
              <div className="flex items-center">
                <Link
                  href={`/collections/${collection.slug}`}
                  className="flex-1 px-4 py-3.5 text-sm text-ink-800"
                >
                  {collection.title}
                </Link>
                {collection.children && collection.children.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(expanded === collection._id ? null : collection._id)
                    }
                    aria-label={`Toggle ${collection.title} subcategories`}
                    aria-expanded={expanded === collection._id}
                    className="grid h-11 w-11 place-items-center text-ink-500"
                  >
                    <span
                      className={cn(
                        "transition-transform duration-200",
                        expanded === collection._id && "rotate-45"
                      )}
                    >
                      +
                    </span>
                  </button>
                )}
              </div>

              {expanded === collection._id && collection.children && (
                <div className="bg-ink-50 pb-2">
                  {collection.children.map((child) => (
                    <Link
                      key={child._id}
                      href={`/collections/${child.slug}`}
                      className="block py-2.5 pl-8 pr-4 text-sm text-ink-600"
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-ink-200 p-4">
          <Link href={isLoggedIn ? "/account" : "/login"} className="block py-2 text-sm text-ink-800">
            {isLoggedIn ? "Your account" : "Sign in"}
          </Link>
          <Link href="/wishlist" className="block py-2 text-sm text-ink-800">
            Wishlist
          </Link>
          <Link href="/contact" className="block py-2 text-sm text-ink-800">
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
