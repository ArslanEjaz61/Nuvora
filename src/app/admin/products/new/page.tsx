import { requireAdminPage } from "../../_lib/guard";
import { Collection } from "@/models/Collection";
import { ProductForm, emptyProduct } from "@/components/admin/products/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdminPage("/admin/products/new");

  const collections = await Collection.find().sort({ title: 1 }).select("title").lean();

  return (
    <ProductForm
      initial={emptyProduct}
      collections={collections.map((c) => ({ _id: String(c._id), title: c.title }))}
    />
  );
}
