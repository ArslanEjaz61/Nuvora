import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Collection, type ICollection } from "@/models/Collection";
import { Product } from "@/models/Product";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Browse every Nuvora collection — furniture, décor and home essentials, curated room by room.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  await connectDB();

  const collections = await Collection.find({ status: "active" })
    .sort({ sortOrder: 1, title: 1 })
    .lean<ICollection[]>();

  const counts = await Promise.all(
    collections.map((collection) =>
      Product.countDocuments({ status: "active", collections: collection._id })
    )
  );

  const roots = collections.filter((c) => !c.parent);

  return (
    <>
      <header className="container-page pt-10 text-center">
        <h1 className="font-display text-3xl text-ink-900 md:text-4xl">Collections</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-600">
          Curated for every room. Find the pieces that make a space feel like yours.
        </p>
      </header>

      {roots.length === 0 ? (
        <div className="container-page py-20 text-center">
          <p className="text-sm text-ink-500">Collections are being set up. Check back shortly.</p>
        </div>
      ) : (
        <div className="container-page grid gap-4 py-10 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {roots.map((collection) => {
            const index = collections.findIndex(
              (c) => String(c._id) === String(collection._id)
            );
            const children = collections.filter(
              (c) => c.parent && String(c.parent) === String(collection._id)
            );

            return (
              <article key={String(collection._id)} className="group">
                <Link
                  href={`/collections/${collection.slug}`}
                  className="relative block aspect-[4/3] overflow-hidden rounded-card bg-ink-100"
                >
                  {collection.image?.url ? (
                    <Image
                      src={collection.image.url}
                      alt={collection.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-ink-400">
                      {collection.title}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/65 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h2 className="font-display text-xl text-white">{collection.title}</h2>
                    <p className="mt-0.5 text-xs text-white/80">
                      {counts[index]} product{counts[index] === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>

                {children.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                    {children.map((child) => (
                      <Link
                        key={String(child._id)}
                        href={`/collections/${child.slug}`}
                        className="text-xs text-ink-600 underline-offset-4 hover:text-teal-900 hover:underline"
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
