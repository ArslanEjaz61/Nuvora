import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CollectionBrowser } from "@/components/product/CollectionBrowser";
import { connectDB } from "@/lib/db";
import { toProductCards } from "@/lib/queries";
import { Collection, type ICollection } from "@/models/Collection";
import { Product, type IProduct } from "@/models/Product";

export const revalidate = 300;

const PAGE_SIZE = 24;

async function loadCollection(slug: string) {
  await connectDB();

  const collection = await Collection.findOne({ slug, status: "active" }).lean<ICollection>();
  if (!collection) return null;

  const children = await Collection.find({ parent: collection._id, status: "active" })
    .sort({ sortOrder: 1 })
    .lean<ICollection[]>();

  // Include descendants so a parent category shows everything beneath it.
  const collectionIds = [collection._id, ...children.map((c) => c._id)];
  const filter = { status: "active" as const, collections: { $in: collectionIds } };

  const [products, total, priceStats, tags] = await Promise.all([
    Product.find(filter).sort({ featured: -1, createdAt: -1 }).limit(PAGE_SIZE).lean<IProduct[]>(),
    Product.countDocuments(filter),
    Product.aggregate<{ min: number; max: number }>([
      { $match: filter },
      { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } },
    ]),
    Product.distinct("tags", filter),
  ]);

  return {
    collection,
    children,
    products: await toProductCards(products),
    total,
    priceRange: {
      min: priceStats[0]?.min ?? 0,
      max: priceStats[0]?.max ?? 0,
    },
    tags: (tags as string[]).filter(Boolean).slice(0, 20),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const collection = await Collection.findOne({ slug, status: "active" }).lean<ICollection>();
  if (!collection) return { title: "Collection not found" };

  const description =
    collection.seo?.description ??
    collection.description ??
    `Shop ${collection.title} at Nuvora.`;

  return {
    title: collection.seo?.title ?? collection.title,
    description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title: collection.title,
      description,
      images: collection.image?.url ? [{ url: collection.image.url }] : undefined,
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadCollection(slug);
  if (!data) notFound();

  const { collection, children, products, total, priceRange, tags } = data;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: "Collections", item: "/collections" },
      {
        "@type": "ListItem",
        position: 3,
        name: collection.title,
        item: `/collections/${collection.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="container-page pt-5">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
          <li>
            <Link href="/" className="hover:text-teal-900">
              Home
            </Link>
          </li>
          <ChevronRight size={13} aria-hidden />
          <li>
            <Link href="/collections" className="hover:text-teal-900">
              Collections
            </Link>
          </li>
          <ChevronRight size={13} aria-hidden />
          <li className="text-ink-800" aria-current="page">
            {collection.title}
          </li>
        </ol>
      </nav>

      <header className="container-page pt-6">
        <h1 className="font-display text-3xl text-ink-900 md:text-4xl">{collection.title}</h1>
        {collection.description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
            {collection.description}
          </p>
        )}

        {children.length > 0 && (
          <div className="hide-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
            {children.map((child) => (
              <Link
                key={String(child._id)}
                href={`/collections/${child.slug}`}
                className="shrink-0 rounded-full border border-ink-200 px-4 py-2 text-sm text-ink-700 transition-colors hover:border-teal-900 hover:text-teal-900"
              >
                {child.title}
              </Link>
            ))}
          </div>
        )}
      </header>

      <CollectionBrowser
        collectionSlug={collection.slug}
        initialProducts={products}
        initialTotal={total}
        initialPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        priceRange={priceRange}
        availableTags={tags}
      />
    </>
  );
}
