import { Types } from "mongoose";
import { requireAdminPage } from "../_lib/guard";
import { Collection } from "@/models/Collection";
import { Product } from "@/models/Product";
import { serialize } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  CollectionsManager,
  type CollectionRow,
} from "@/components/admin/collections/CollectionsManager";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  await requireAdminPage("/admin/collections");

  const [collections, counts] = await Promise.all([
    Collection.find().sort({ sortOrder: 1, title: 1 }).lean(),
    Product.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $unwind: "$collections" },
      { $group: { _id: "$collections", count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const rows: CollectionRow[] = serialize(
    collections.map((c) => ({
      _id: String(c._id),
      title: c.title,
      slug: c.slug,
      description: c.description ?? "",
      image: c.image?.url ? { url: c.image.url, publicId: c.image.publicId, alt: c.image.alt } : undefined,
      parent: c.parent ? String(c.parent) : null,
      sortOrder: c.sortOrder,
      featured: c.featured,
      showInNav: c.showInNav,
      status: c.status,
      productCount: countMap.get(String(c._id)) ?? 0,
    }))
  );

  return (
    <>
      <PageHeader
        title="Collections"
        description={`${rows.length} collection${rows.length === 1 ? "" : "s"}. Nest them to build the navigation.`}
      />
      <CollectionsManager rows={rows} />
    </>
  );
}
