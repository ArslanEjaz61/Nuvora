import type { Metadata } from "next";
import { requireSessionFor } from "@/components/account/guard";
import { WishlistGrid } from "@/components/account/WishlistGrid";
import { connectDB } from "@/lib/db";
import { toProductCards } from "@/lib/queries";
import { Product, type IProduct } from "@/models/Product";
import { Wishlist, type IWishlist } from "@/models/Wishlist";
import type { ProductCardData } from "@/types";

export const metadata: Metadata = {
  title: "Your wishlist",
  description: "The Nuvora pieces you've saved for later.",
  robots: { index: false },
};

export default async function WishlistPage() {
  const session = await requireSessionFor("/wishlist");
  await connectDB();

  const wishlist = await Wishlist.findOne({ userId: session.userId }).lean<IWishlist | null>();
  const productIds = (wishlist?.items ?? []).map((item) => item.productId);

  let items: ProductCardData[] = [];

  if (productIds.length > 0) {
    const products = await Product.find({
      _id: { $in: productIds },
      status: "active",
    }).lean<IProduct[]>();

    const cards = await toProductCards(products);
    const byId = new Map(cards.map((card) => [card._id, card]));

    // Keep the wishlist's own order (newest first) rather than Mongo's.
    items = productIds.flatMap((id) => {
      const card = byId.get(String(id));
      return card ? [card] : [];
    });
  }

  return (
    <div className="container-page py-8 md:py-12">
      <header className="mb-8">
        <h1 className="font-display text-2xl text-ink-900 md:text-3xl">Your wishlist</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          {items.length === 0
            ? "Save the pieces you're thinking about and come back to them here."
            : `${items.length} ${items.length === 1 ? "piece" : "pieces"} saved.`}
        </p>
      </header>

      <WishlistGrid initialItems={items} />
    </div>
  );
}
