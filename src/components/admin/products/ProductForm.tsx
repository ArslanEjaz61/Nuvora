"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Trash2, X } from "lucide-react";
import { slugify } from "@/lib/utils";
import { FormField } from "../FormField";
import { MoneyInput } from "../MoneyInput";
import { ImageUploader, type UploadedImage } from "../ImageUploader";
import { Button, Card, CardHeader, Checkbox, Input, Select, Textarea, inputClass } from "../ui";
import { useToast } from "../Toast";
import { useConfirm } from "../ConfirmDialog";
import { OptionsEditor, type ProductOption } from "./OptionsEditor";

export interface ProductFormValues {
  _id?: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAtPrice: number | null;
  status: "draft" | "active" | "archived";
  collections: string[];
  tags: string[];
  brand: string;
  material: string;
  featured: boolean;
  images: UploadedImage[];
  options: ProductOption[];
  seoTitle: string;
  seoDescription: string;
}

export const emptyProduct: ProductFormValues = {
  title: "",
  slug: "",
  description: "",
  shortDescription: "",
  price: 0,
  compareAtPrice: null,
  status: "draft",
  collections: [],
  tags: [],
  brand: "",
  material: "",
  featured: false,
  images: [],
  options: [],
  seoTitle: "",
  seoDescription: "",
};

type SlugState = "idle" | "checking" | "free" | "taken";

export function ProductForm({
  initial,
  collections,
  children,
}: {
  initial: ProductFormValues;
  collections: Array<{ _id: string; title: string }>;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const isEdit = Boolean(initial._id);
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [tagDraft, setTagDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const effectiveSlug = slugTouched ? values.slug : slugify(values.title);

  useEffect(() => {
    if (!effectiveSlug) {
      setSlugState("idle");
      return;
    }
    setSlugState("checking");
    const t = setTimeout(async () => {
      try {
        const sp = new URLSearchParams({ slug: effectiveSlug });
        if (initial._id) sp.set("excludeId", initial._id);
        const res = await fetch(`/api/admin/products/slug-check?${sp}`);
        const body = await res.json();
        setSlugState(body.available ? "free" : "taken");
      } catch {
        setSlugState("idle");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [effectiveSlug, initial._id]);

  const discount = useMemo(() => {
    if (!values.compareAtPrice || values.compareAtPrice <= values.price) return null;
    return Math.round(((values.compareAtPrice - values.price) / values.compareAtPrice) * 100);
  }, [values.price, values.compareAtPrice]);

  function addTag() {
    const t = tagDraft.trim();
    if (!t || values.tags.includes(t)) return;
    set("tags", [...values.tags, t]);
    setTagDraft("");
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!values.title.trim()) next.title = "A title is required.";
    if (!effectiveSlug) next.slug = "A slug is required.";
    if (slugState === "taken") next.slug = "That slug is already in use.";
    if (values.price < 0) next.price = "Price can't be negative.";
    if (values.compareAtPrice !== null && values.compareAtPrice <= values.price) {
      next.compareAtPrice = "Compare-at should be higher than the price, or left empty.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) {
      toast.error("Fix the highlighted fields first.");
      return;
    }
    setSaving(true);

    const payload = {
      title: values.title.trim(),
      slug: effectiveSlug,
      description: values.description,
      shortDescription: values.shortDescription,
      price: values.price,
      compareAtPrice: values.compareAtPrice,
      status: values.status,
      collections: values.collections,
      tags: values.tags,
      brand: values.brand,
      material: values.material,
      featured: values.featured,
      images: values.images,
      options: values.options,
      seo: { title: values.seoTitle, description: values.seoDescription },
    };

    try {
      const res = await fetch(
        isEdit ? `/api/admin/products/${initial._id}` : "/api/admin/products",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save the product.");

      toast.success(isEdit ? "Product saved." : "Product created.");
      if (!isEdit && body.product?._id) {
        router.push(`/admin/products/${body.product._id}/edit`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the product.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete "${values.title}"?`,
      message: "Its variants, reviews and wishlist entries go with it. This can't be undone.",
      confirmLabel: "Delete product",
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${initial._id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not delete the product.");
      }
      toast.success("Product deleted.");
      router.push("/admin/products");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the product.");
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 transition hover:text-ink-900"
          >
            <ArrowLeft className="h-3 w-3" /> Products
          </Link>
          <h1 className="mt-1 truncate font-display text-2xl text-ink-900">
            {isEdit ? values.title || "Untitled product" : "New product"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && (
            <Button variant="secondary" onClick={remove} loading={deleting}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          <Button onClick={save} loading={saving}>
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <div className="grid grid-cols-1 gap-4 p-4 sm:p-5">
              <FormField label="Title" htmlFor="title" required error={errors.title}>
                <Input
                  id="title"
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Aveline Oak Sideboard"
                />
              </FormField>

              <FormField
                label="Slug"
                htmlFor="slug"
                required
                error={errors.slug}
                hint={
                  slugState === "checking"
                    ? "Checking availability…"
                    : slugState === "free"
                      ? "This slug is available."
                      : `The product will live at /products/${effectiveSlug || "…"}`
                }
              >
                <div className="relative">
                  <Input
                    id="slug"
                    value={effectiveSlug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug", slugify(e.target.value));
                    }}
                    className="pr-9"
                  />
                  {slugState === "free" && (
                    <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600" />
                  )}
                  {slugState === "taken" && (
                    <X className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-600" />
                  )}
                </div>
              </FormField>

              <FormField
                label="Short description"
                htmlFor="shortDescription"
                hint="One line shown on cards and in listings."
              >
                <Input
                  id="shortDescription"
                  maxLength={400}
                  value={values.shortDescription}
                  onChange={(e) => set("shortDescription", e.target.value)}
                />
              </FormField>

              <FormField
                label="Description"
                htmlFor="description"
                hint="Plain text. Line breaks are preserved on the storefront."
              >
                <Textarea
                  id="description"
                  rows={8}
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </FormField>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pricing" description="Entered in dollars, stored in cents." />
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <FormField label="Price" htmlFor="price" required error={errors.price}>
                <MoneyInput id="price" value={values.price} onChange={(c) => set("price", c ?? 0)} />
              </FormField>
              <FormField
                label="Compare at"
                htmlFor="compareAt"
                error={errors.compareAtPrice}
                hint={discount ? `Shows as ${discount}% off.` : "Leave empty for no strike-through."}
              >
                <MoneyInput
                  id="compareAt"
                  allowEmpty
                  value={values.compareAtPrice}
                  onChange={(c) => set("compareAtPrice", c)}
                />
              </FormField>
            </div>
          </Card>

          <Card>
            <CardHeader title="Images" />
            <div className="p-4 sm:p-5">
              <ImageUploader
                images={values.images}
                onChange={(next) => set("images", next)}
                folder="nuvora/products"
                label=""
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Options"
              description="Define the axes — Colour, Size — then generate variants below."
            />
            <div className="p-4 sm:p-5">
              <OptionsEditor options={values.options} onChange={(next) => set("options", next)} />
            </div>
          </Card>

          {children}

          <Card>
            <CardHeader title="Search engine listing" />
            <div className="grid grid-cols-1 gap-4 p-4 sm:p-5">
              <FormField label="SEO title" htmlFor="seoTitle" hint="Falls back to the product title.">
                <Input
                  id="seoTitle"
                  maxLength={200}
                  value={values.seoTitle}
                  onChange={(e) => set("seoTitle", e.target.value)}
                />
              </FormField>
              <FormField label="SEO description" htmlFor="seoDescription">
                <Textarea
                  id="seoDescription"
                  rows={3}
                  maxLength={400}
                  value={values.seoDescription}
                  onChange={(e) => set("seoDescription", e.target.value)}
                />
              </FormField>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Visibility" />
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              <FormField label="Status" htmlFor="status">
                <Select
                  id="status"
                  value={values.status}
                  onChange={(e) => set("status", e.target.value as ProductFormValues["status"])}
                >
                  <option value="draft">Draft — hidden from the store</option>
                  <option value="active">Active — visible</option>
                  <option value="archived">Archived</option>
                </Select>
              </FormField>
              <Checkbox
                label="Feature on the homepage"
                checked={values.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Collections" />
            <div className="max-h-64 overflow-y-auto p-4 sm:p-5">
              {collections.length === 0 ? (
                <p className="text-sm text-ink-500">
                  No collections yet.{" "}
                  <Link href="/admin/collections" className="text-teal-700 hover:underline">
                    Create one
                  </Link>
                  .
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {collections.map((c) => (
                    <Checkbox
                      key={c._id}
                      label={c.title}
                      checked={values.collections.includes(c._id)}
                      onChange={(e) =>
                        set(
                          "collections",
                          e.target.checked
                            ? [...values.collections, c._id]
                            : values.collections.filter((id) => id !== c._id)
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Organisation" />
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              <FormField label="Brand" htmlFor="brand">
                <Input
                  id="brand"
                  value={values.brand}
                  onChange={(e) => set("brand", e.target.value)}
                />
              </FormField>
              <FormField label="Material" htmlFor="material">
                <Input
                  id="material"
                  value={values.material}
                  onChange={(e) => set("material", e.target.value)}
                  placeholder="Solid oak, linen…"
                />
              </FormField>
              <FormField label="Tags" hint="Press Enter to add.">
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  onBlur={addTag}
                  placeholder="oak, sideboard"
                  className={inputClass}
                />
                {values.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {values.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => set("tags", values.tags.filter((x) => x !== t))}
                          className="text-ink-400 transition hover:text-red-600"
                          aria-label={`Remove ${t}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </FormField>
            </div>
          </Card>
        </div>
      </div>
      {dialog}
    </>
  );
}

export default ProductForm;
