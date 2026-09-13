import Link from "next/link";
import { Types } from "mongoose";
import { Plus } from "lucide-react";
import { requireAdminPage } from "../_lib/guard";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";
import { Collection } from "@/models/Collection";
import { PageHeader } from "@/components/admin/PageHeader";
import { FilterBar } from "@/components/admin/FilterBar";
import { Pagination } from "@/components/admin/Pagination";
import { Card } from "@/components/admin/ui";
import { ProductsTable, type ProductRow } from "@/components/admin/products/ProductsTable";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/products");
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const collectionId = typeof sp.collection === "string" ? sp.collection : "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { slug: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
      { brand: { $regex: q, $options: "i" } },
    ];
  }
  if (["draft", "active", "archived"].includes(status)) filter.status = status;
  if (collectionId && Types.ObjectId.isValid(collectionId)) {
    filter.collections = new Types.ObjectId(collectionId);
  }

  const [items, total, collections] = await Promise.all([
    Product.find(filter)
      .sort({ title: 1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .lean(),
    Product.countDocuments(filter),
    Collection.find().sort({ title: 1 }).select("title").lean(),
  ]);

  const stats = await ProductVariant.aggregate<{
    _id: Types.ObjectId;
    variantCount: number;
    inventory: number;
  }>([
    { $match: { productId: { $in: items.map((p) => p._id) } } },
    {
      $group: {
        _id: "$productId",
        variantCount: { $sum: 1 },
        inventory: { $sum: "$inventoryQuantity" },
      },
    },
  ]);
  const byProduct = new Map(stats.map((s) => [String(s._id), s]));

  const rows: ProductRow[] = items.map((p) => ({
    _id: String(p._id),
    title: p.title,
    slug: p.slug,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    status: p.status,
    image: p.images?.[0]?.url,
    featured: p.featured,
    variantCount: byProduct.get(String(p._id))?.variantCount ?? 0,
    inventory: byProduct.get(String(p._id))?.inventory ?? 0,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"} in the catalogue`}
        actions={
          <Link
            href="/admin/products/new"
            className="inline-flex h-10 items-center gap-2 rounded-card bg-teal-900 px-4 text-sm font-medium text-white transition hover:bg-teal-800"
          >
            <Plus className="h-4 w-4" /> New product
          </Link>
        }
      />

      <Card>
        <FilterBar
          searchPlaceholder="Search by title, slug, tag or brand…"
          selects={[
            {
              name: "status",
              label: "All statuses",
              options: [
                { value: "active", label: "Active" },
                { value: "draft", label: "Draft" },
                { value: "archived", label: "Archived" },
              ],
            },
            {
              name: "collection",
              label: "All collections",
              options: collections.map((c) => ({ value: String(c._id), label: c.title })),
            },
          ]}
        />
        <ProductsTable rows={rows} hasFilters={Boolean(q || status || collectionId)} />
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          basePath="/admin/products"
          params={{ q, status, collection: collectionId }}
        />
      </Card>
    </>
  );
}
