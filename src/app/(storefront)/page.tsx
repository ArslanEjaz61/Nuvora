import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { ValueProps } from "@/components/home/ValueProps";
import { ProductSection } from "@/components/product/ProductSection";
import { ButtonLink } from "@/components/ui/Button";
import {
  getBestSellers,
  getFeaturedCollections,
  getFeaturedProducts,
  getHomepageContent,
  getNewArrivals,
  getProductsByCollectionSlug,
} from "@/lib/queries";
import type { ProductCardData } from "@/types";

export const revalidate = 300;

export default async function HomePage() {
  const content = await getHomepageContent();

  const enabledSections = (content.sections ?? [])
    .filter((s) => s.enabled)
    .sort((a, b) => a.position - b.position);

  const [featuredCollections, sectionData] = await Promise.all([
    getFeaturedCollections(6),
    Promise.all(
      enabledSections.map(async (section) => {
        const limit = section.limit ?? 8;

        if (section.collectionSlug) {
          const { collection, products } = await getProductsByCollectionSlug(
            section.collectionSlug,
            limit
          );
          return {
            key: section.key,
            title: section.title ?? collection?.title ?? "Shop",
            subtitle: section.subtitle,
            href: collection ? `/collections/${collection.slug}` : "/collections",
            products,
          };
        }

        const products: ProductCardData[] =
          section.key === "best-selling"
            ? await getBestSellers(limit)
            : section.key === "new-arrivals"
              ? await getNewArrivals(limit)
              : await getFeaturedProducts(limit);

        return {
          key: section.key,
          title: section.title ?? "Shop",
          subtitle: section.subtitle,
          href: "/collections",
          products,
        };
      })
    ),
  ]);

  const heroSlides = (content.heroSlides ?? []).sort((a, b) => a.position - b.position);
  const hasAnyProducts = sectionData.some((s) => s.products.length > 0);

  return (
    <>
      <Hero slides={heroSlides} />
      <ValueProps items={content.valueProps ?? []} />

      {featuredCollections.length > 0 && (
        <section className="container-page py-10 md:py-14">
          <h2 className="mb-5 font-display text-2xl text-ink-900 md:mb-7 md:text-3xl">
            Shop by room
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
            {featuredCollections.map((collection) => (
              <Link
                key={String(collection._id)}
                href={`/collections/${collection.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-card bg-ink-100"
              >
                {collection.image?.url && (
                  <Image
                    src={collection.image.url}
                    alt={collection.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                  <h3 className="font-display text-lg text-white md:text-xl">
                    {collection.title}
                  </h3>
                  <span className="mt-0.5 inline-block text-xs text-white/80">Shop now</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {sectionData.map((section, i) => (
        <ProductSection
          key={section.key}
          title={section.title}
          subtitle={section.subtitle}
          href={section.href}
          products={section.products}
          priority={i === 0}
        />
      ))}

      {content.promoBanner?.enabled && (
        <section className="relative overflow-hidden bg-teal-900">
          <div className="container-page grid items-center gap-8 py-12 md:grid-cols-2 md:py-16">
            <div>
              {content.promoBanner.heading && (
                <h2 className="font-display text-3xl text-white md:text-4xl">
                  {content.promoBanner.heading}
                </h2>
              )}
              {content.promoBanner.body && (
                <p className="mt-3 max-w-md text-sm leading-relaxed text-teal-100 md:text-base">
                  {content.promoBanner.body}
                </p>
              )}
              {content.promoBanner.ctaLabel && content.promoBanner.ctaHref && (
                <ButtonLink
                  href={content.promoBanner.ctaHref}
                  variant="gold"
                  size="lg"
                  className="mt-6"
                >
                  {content.promoBanner.ctaLabel}
                </ButtonLink>
              )}
            </div>
            {content.promoBanner.image && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-card">
                <Image
                  src={content.promoBanner.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {!hasAnyProducts && (
        <section className="container-page py-20 text-center">
          <h2 className="font-display text-2xl text-ink-900">The shop is being set up</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            Products are being added right now. Check back shortly, or get in touch if you are
            looking for something specific.
          </p>
          <ButtonLink href="/contact" className="mt-6">
            Contact us
          </ButtonLink>
        </section>
      )}
    </>
  );
}
