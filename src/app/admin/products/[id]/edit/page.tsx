import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { requireAdminPage } from "../../../_lib/guard";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";
import { Collection } from "@/models/Collection";
import { serialize } from "@/lib/utils";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { VariantsEditor, type VariantRow } from "@/components/admin/products/VariantsEditor";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPage(`/admin/products/${id}/edit`);

  if (!Types.ObjectId.isValid(id)) notFound();

  const [product, variants, collections] = await Promise.all([
    Product.findById(id).lean(),
    ProductVariant.find({ productId: id }).sort({ position: 1 }).lean(),
    Collection.find().sort({ title: 1 }).select("title").lean(),
  ]);

  if (!product) notFound();

  const variantRows: VariantRow[] = serialize(
    variants.map((v) => ({
      _id: String(v._id),
      productId: String(v.productId),
      sku: v.sku,
      title: v.title,
      options: v.options ?? [],
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? null,
      inventoryQuantity: v.inventoryQuantity,
      inventoryPolicy: v.inventoryPolicy,
      lowStockThreshold: v.lowStockThreshold,
      active: v.active,
      image: v.image?.url ? { url: v.image.url, publicId: v.image.publicId, alt: v.image.alt } : undefined,
    }))
  );

  return (
    <ProductForm
      initial={serialize({
        _id: String(product._id),
        title: product.title,
        slug: product.slug,
        description: product.description ?? "",
        shortDescription: product.shortDescription ?? "",
        price: product.price,
        compareAtPrice: product.compareAtPrice ?? null,
        status: product.status,
        collections: (product.collections ?? []).map(String),
        tags: product.tags ?? [],
        brand: product.brand ?? "",
        material: product.material ?? "",
        featured: product.featured,
        images: product.images ?? [],
        options: product.options ?? [],
        seoTitle: product.seo?.title ?? "",
        seoDescription: product.seo?.description ?? "",
      })}
      collections={collections.map((c) => ({ _id: String(c._id), title: c.title }))}
    >
      <VariantsEditor
        productId={String(product._id)}
        productTitle={product.title}
        savedOptions={serialize(product.options ?? [])}
        basePrice={product.price}
        initialVariants={variantRows}
      />
    </ProductForm>
  );
}
