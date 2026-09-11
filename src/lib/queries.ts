import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Collection, type ICollection } from "@/models/Collection";
import { Product, type IProduct } from "@/models/Product";
import { ProductVariant, type IProductVariant } from "@/models/ProductVariant";
import { SiteContent, type ISiteContent } from "@/models/SiteContent";
import type { NavCollection, ProductCardData } from "@/types";

/** Top-level nav collections with their children, ordered for the header. */
export async function getNavCollections(): Promise<NavCollection[]> {
  await connectDB();

  const all = await Collection.find({ status: "active", showInNav: true })
    .sort({ sortOrder: 1, title: 1 })
    .lean<ICollection[]>();

  const roots = all.filter((c) => !c.parent);

  return roots.map((root) => ({
    _id: String(root._id),
    title: root.title,
    slug: root.slug,
    children: all
      .filter((c) => c.parent && String(c.parent) === String(root._id))
      .map((child) => ({
        _id: String(child._id),
        title: child.title,
        slug: child.slug,
      })),
  }));
}

/**
 * Joins each product to its cheapest in-stock variant so a card can add to
 * cart in one click without loading the product page first.
 */
export async function toProductCards(products: IProduct[]): Promise<ProductCardData[]> {
  if (!products.length) return [];

  const variants = await ProductVariant.find({
    productId: { $in: products.map((p) => p._id) },
    active: true,
  })
    .sort({ position: 1 })
    .lean<IProductVariant[]>();

  const byProduct = new Map<string, IProductVariant[]>();
  for (const variant of variants) {
    const key = String(variant.productId);
    const list = byProduct.get(key);
    if (list) list.push(variant);
    else byProduct.set(key, [variant]);
  }

  return products.map((product) => {
    const productVariants = byProduct.get(String(product._id)) ?? [];
    const sellable = productVariants.find(
      (v) => v.inventoryPolicy === "continue" || v.inventoryQuantity > 0
    );
    const chosen = sellable ?? productVariants[0];

    return {
      _id: String(product._id),
      title: product.title,
      slug: product.slug,
      price: chosen?.price ?? product.price,
      compareAtPrice: chosen?.compareAtPrice ?? product.compareAtPrice,
      image: product.images[0]?.url,
      secondaryImage: product.images[1]?.url,
      rating: {
        average: product.rating?.average ?? 0,
        count: product.rating?.count ?? 0,
      },
      inStock: Boolean(sellable),
      defaultVariantId: chosen ? String(chosen._id) : undefined,
    };
  });
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  await connectDB();
  const products = await Product.find({ status: "active", featured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<IProduct[]>();
  return toProductCards(products);
}

export async function getBestSellers(limit = 8): Promise<ProductCardData[]> {
  await connectDB();
  const products = await Product.find({ status: "active" })
    .sort({ soldCount: -1, createdAt: -1 })
    .limit(limit)
    .lean<IProduct[]>();
  return toProductCards(products);
}

export async function getNewArrivals(limit = 8): Promise<ProductCardData[]> {
  await connectDB();
  const products = await Product.find({ status: "active" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<IProduct[]>();
  return toProductCards(products);
}

export async function getProductsByCollectionSlug(
  slug: string,
  limit = 8
): Promise<{ collection: ICollection | null; products: ProductCardData[] }> {
  await connectDB();

  const collection = await Collection.findOne({ slug, status: "active" }).lean<ICollection>();
  if (!collection) return { collection: null, products: [] };

  const products = await Product.find({ status: "active", collections: collection._id })
    .sort({ featured: -1, createdAt: -1 })
    .limit(limit)
    .lean<IProduct[]>();

  return { collection, products: await toProductCards(products) };
}

export async function getFeaturedCollections(limit = 6): Promise<ICollection[]> {
  await connectDB();
  return Collection.find({ status: "active", featured: true })
    .sort({ sortOrder: 1, title: 1 })
    .limit(limit)
    .lean<ICollection[]>();
}

/** The admin-managed homepage document, seeded on first read. */
export async function getHomepageContent(): Promise<ISiteContent> {
  await connectDB();

  const existing = await SiteContent.findOne({ key: "homepage" }).lean<ISiteContent>();
  if (existing) return existing;

  const created = await SiteContent.create({
    key: "homepage",
    announcementBar: {
      enabled: true,
      messages: [
        "Free shipping on orders over $99",
        "Curated collections for your home — new arrivals every week",
        "30-day returns on everything",
      ],
    },
    heroSlides: [
      {
        image: "/brand/hero-1.jpg",
        eyebrow: "your style. your home.",
        heading: "Find it all at Nuvora",
        subheading: "Furniture, décor, and more to love every room",
        ctaLabel: "Shop the collection",
        ctaHref: "/collections",
        position: 0,
      },
    ],
    valueProps: [
      { icon: "Truck", title: "Free shipping", description: "On orders over $99" },
      { icon: "ShieldCheck", title: "Secure payment", description: "Encrypted checkout" },
      { icon: "RotateCcw", title: "Easy returns", description: "30 days to change your mind" },
      { icon: "Headset", title: "Here to help", description: "Support 7 days a week" },
    ],
    sections: [
      { key: "featured", title: "Featured picks", position: 0, limit: 8, enabled: true },
      { key: "best-selling", title: "Best sellers", position: 1, limit: 8, enabled: true },
      { key: "new-arrivals", title: "New arrivals", position: 2, limit: 8, enabled: true },
    ],
  });

  return created.toObject();
}

export async function getRelatedProducts(
  productId: Types.ObjectId | string,
  collectionIds: (Types.ObjectId | string)[],
  limit = 4
): Promise<ProductCardData[]> {
  await connectDB();

  const products = await Product.find({
    status: "active",
    _id: { $ne: new Types.ObjectId(String(productId)) },
    ...(collectionIds.length
      ? { collections: { $in: collectionIds.map((id) => new Types.ObjectId(String(id))) } }
      : {}),
  })
    .sort({ soldCount: -1 })
    .limit(limit)
    .lean<IProduct[]>();

  return toProductCards(products);
}
