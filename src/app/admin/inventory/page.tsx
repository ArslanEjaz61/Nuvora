import type { PipelineStage } from "mongoose";
import { requireAdminPage } from "../_lib/guard";
import { connectDB } from "@/lib/db";
import { ProductVariant } from "@/models/ProductVariant";
import { PageHeader } from "@/components/admin/PageHeader";
import { InventoryTable, type InventoryRow } from "@/components/admin/inventory/InventoryTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; filter?: string }>;
}) {
  await requireAdminPage("/admin/inventory");
  await connectDB();

  const { page: pageParam, q, filter: filterParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const filter = filterParam === "low" || filterParam === "out" ? filterParam : "all";
  const skip = (page - 1) * PAGE_SIZE;

  const match: Record<string, unknown> = {};
  if (filter === "low") match.$expr = { $lte: ["$inventoryQuantity", "$lowStockThreshold"] };
  if (filter === "out") match.inventoryQuantity = 0;

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" },
    },
    {
      $addFields: {
        productTitle: { $ifNull: [{ $first: "$product.title" }, "Unknown product"] },
        productSlug: { $ifNull: [{ $first: "$product.slug" }, ""] },
      },
    },
  ];

  if (q?.trim()) {
    pipeline.push({
      $match: {
        $or: [
          { sku: { $regex: q.trim(), $options: "i" } },
          { title: { $regex: q.trim(), $options: "i" } },
          { productTitle: { $regex: q.trim(), $options: "i" } },
        ],
      },
    });
  }

  pipeline.push({
    $facet: {
      rows: [
        { $sort: { productTitle: 1, position: 1 } },
        { $skip: skip },
        { $limit: PAGE_SIZE },
        {
          $project: {
            productId: 1,
            productTitle: 1,
            productSlug: 1,
            title: 1,
            sku: 1,
            inventoryQuantity: 1,
            inventoryPolicy: 1,
            lowStockThreshold: 1,
            active: 1,
          },
        },
      ],
      total: [{ $count: "count" }],
      lowCount: [
        { $match: { $expr: { $lte: ["$inventoryQuantity", "$lowStockThreshold"] } } },
        { $count: "count" },
      ],
      outCount: [{ $match: { inventoryQuantity: 0 } }, { $count: "count" }],
    },
  });

  const [result] = await ProductVariant.aggregate(pipeline);
  const rows = (result?.rows ?? []) as Array<Record<string, unknown>>;
  const total = (result?.total?.[0]?.count ?? 0) as number;
  const lowCount = (result?.lowCount?.[0]?.count ?? 0) as number;
  const outCount = (result?.outCount?.[0]?.count ?? 0) as number;

  const typedRows: InventoryRow[] = rows.map((r) => ({
    _id: String(r._id),
    productId: String(r.productId),
    productTitle: r.productTitle as string,
    productSlug: r.productSlug as string,
    title: r.title as string,
    sku: r.sku as string,
    inventoryQuantity: r.inventoryQuantity as number,
    inventoryPolicy: r.inventoryPolicy as "deny" | "continue",
    lowStockThreshold: r.lowStockThreshold as number,
    active: r.active as boolean,
  }));

  return (
    <>
      <PageHeader
        title="Inventory"
        description={`${total} variant${total === 1 ? "" : "s"}${
          filter === "all" ? ` · ${lowCount} low stock · ${outCount} out of stock` : ""
        }`}
      />
      <InventoryTable
        rows={typedRows}
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        total={total}
        query={q ?? ""}
        activeFilter={filter}
      />
    </>
  );
}
