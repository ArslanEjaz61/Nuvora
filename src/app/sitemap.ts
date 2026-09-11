import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Collection } from "@/models/Collection";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const STATIC_ROUTES = [
  "",
  "/collections",
  "/about",
  "/contact",
  "/search",
  "/policies/shipping",
  "/policies/returns",
  "/policies/terms",
  "/policies/privacy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();

  const [products, collections] = await Promise.all([
    Product.find({ status: "active" }).select("slug updatedAt").lean(),
    Collection.find({ status: "active" }).select("slug updatedAt").lean(),
  ]);

  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: route === "" ? 1 : 0.6,
    })),
    ...collections.map((c) => ({
      url: `${siteUrl}/collections/${c.slug}`,
      lastModified: c.updatedAt ?? now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${siteUrl}/products/${p.slug}`,
      lastModified: p.updatedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
