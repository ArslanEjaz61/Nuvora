import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { ProductSection } from "@/components/product/ProductSection";
import { ProductReviews } from "@/components/product/ProductReviews";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { connectDB } from "@/lib/db";
import { getRelatedProducts } from "@/lib/queries";
import { serialize } from "@/lib/utils";
import { Collection, type ICollection } from "@/models/Collection";
import { Product, type IProduct } from "@/models/Product";
import { ProductVariant, type IProductVariant } from "@/models/ProductVariant";

export const revalidate = 300;

async function loadProduct(slug: string) {
  await connectDB();
  const product = await Product.findOne({ slug, status: "active" }).lean<IProduct>();
  if (!product) return null;

  const [variants, collections] = await Promise.all([
    ProductVariant.find({ productId: product._id, active: true })
      .sort({ position: 1 })
      .lean<IProductVariant[]>(),
    Collection.find({ _id: { $in: product.collections ?? [] }, status: "active" })
      .lean<ICollection[]>(),
  ]);

  return { product, variants, collections };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadProduct(slug);
  if (!data) return { title: "Product not found" };

  const { product } = data;
  const description =
    product.seo?.description ??
    product.shortDescription ??
    product.description.slice(0, 160);

  return {
    title: product.seo?.title ?? product.title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.title,
      description,
      images: product.images[0]?.url ? [{ url: product.images[0].url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      images: product.images[0]?.url ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadProduct(slug);
  if (!data) notFound();

  const { product, variants, collections } = data;
  const related = await getRelatedProducts(product._id, product.collections ?? [], 4);

  const cheapest = variants.reduce(
    (min, v) => (v.price < min ? v.price : min),
    variants[0]?.price ?? product.price
  );
  const anyInStock = variants.some(
    (v) => v.inventoryPolicy === "continue" || v.inventoryQuantity > 0
  );
  const primaryCollection = collections[0];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDescription ?? product.description.slice(0, 300),
    image: product.images.map((i) => i.url),
    sku: variants[0]?.sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency ?? "USD",
      price: (cheapest / 100).toFixed(2),
      availability: anyInStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `/products/${product.slug}`,
    },
    ...(product.rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.average.toFixed(1),
            reviewCount: product.rating.count,
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      ...(primaryCollection
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: primaryCollection.title,
              item: `/collections/${primaryCollection.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: primaryCollection ? 3 : 2,
        name: product.title,
        item: `/products/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
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
          {primaryCollection && (
            <>
              <ChevronRight size={13} aria-hidden />
              <li>
                <Link
                  href={`/collections/${primaryCollection.slug}`}
                  className="hover:text-teal-900"
                >
                  {primaryCollection.title}
                </Link>
              </li>
            </>
          )}
          <ChevronRight size={13} aria-hidden />
          <li className="truncate text-ink-800" aria-current="page">
            {product.title}
          </li>
        </ol>
      </nav>

      <div className="container-page grid gap-8 py-6 md:py-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={serialize(product.images)} title={product.title} />

        <ProductPurchasePanel
          productId={String(product._id)}
          title={product.title}
          shortDescription={product.shortDescription}
          rating={{ average: product.rating.average, count: product.rating.count }}
          options={serialize(product.options ?? [])}
          brand={product.brand}
          variants={variants.map((v) => ({
            _id: String(v._id),
            title: v.title,
            sku: v.sku,
            options: serialize(v.options ?? []),
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            inventoryQuantity: v.inventoryQuantity,
            inventoryPolicy: v.inventoryPolicy,
            lowStockThreshold: v.lowStockThreshold,
          }))}
        />
      </div>

      {product.description && (
        <section className="container-page border-t border-ink-200 py-10">
          <h2 className="font-display text-xl text-ink-900">Details</h2>
          <div className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink-600">
            {product.description}
          </div>
          {(product.material || product.brand) && (
            <dl className="mt-6 grid max-w-md grid-cols-2 gap-y-2 text-sm">
              {product.brand && (
                <>
                  <dt className="text-ink-500">Brand</dt>
                  <dd className="text-ink-900">{product.brand}</dd>
                </>
              )}
              {product.material && (
                <>
                  <dt className="text-ink-500">Material</dt>
                  <dd className="text-ink-900">{product.material}</dd>
                </>
              )}
            </dl>
          )}
        </section>
      )}

      <ProductReviews
        productId={String(product._id)}
        rating={{ average: product.rating.average, count: product.rating.count }}
      />

      <ProductSection title="You may also like" products={related} />

      <RecentlyViewed
        currentProduct={{
          _id: String(product._id),
          title: product.title,
          slug: product.slug,
          price: cheapest,
          image: product.images[0]?.url,
        }}
      />
    </>
  );
}
