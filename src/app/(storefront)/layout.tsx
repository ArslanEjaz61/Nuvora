import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getSession } from "@/lib/auth";
import { getHomepageContent, getNavCollections } from "@/lib/queries";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collections, content, session] = await Promise.all([
    getNavCollections(),
    getHomepageContent(),
    getSession(),
  ]);

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        {content.announcementBar?.enabled && (
          <AnnouncementBar messages={content.announcementBar.messages ?? []} />
        )}
        <Header collections={collections} isLoggedIn={Boolean(session)} />
        <main className="flex-1">{children}</main>
        <Footer collections={collections} />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
