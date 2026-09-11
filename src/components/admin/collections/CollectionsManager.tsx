"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Boxes, Pencil, Plus, Trash2 } from "lucide-react";
import { FormField } from "../FormField";
import { ImageUploader, type UploadedImage } from "../ImageUploader";
import { DataTable, type Column } from "../DataTable";
import { EmptyState } from "../EmptyState";
import { StatusPill } from "../StatusPill";
import { Button, Card, CardHeader, Checkbox, Input, Select, Textarea } from "../ui";
import { useToast } from "../Toast";
import { useConfirm } from "../ConfirmDialog";
import { slugify } from "@/lib/utils";

export interface CollectionRow {
  _id: string;
  title: string;
  slug: string;
  description: string;
  image?: UploadedImage;
  parent: string | null;
  sortOrder: number;
  featured: boolean;
  showInNav: boolean;
  status: "active" | "hidden";
  productCount: number;
}

type Draft = Omit<CollectionRow, "_id" | "productCount"> & { _id?: string };

const emptyDraft: Draft = {
  title: "",
  slug: "",
  description: "",
  image: undefined,
  parent: null,
  sortOrder: 0,
  featured: false,
  showInNav: true,
  status: "active",
};

export function CollectionsManager({ rows }: { rows: CollectionRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const titleById = new Map(rows.map((r) => [r._id, r.title]));

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("A title is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: draft.title.trim(),
        slug: draft.slug || slugify(draft.title),
        description: draft.description,
        image: draft.image?.url ? draft.image : undefined,
        parent: draft.parent || null,
        sortOrder: draft.sortOrder,
        featured: draft.featured,
        showInNav: draft.showInNav,
        status: draft.status,
      };
      const res = await fetch(
        draft._id ? `/api/admin/collections/${draft._id}` : "/api/admin/collections",
        {
          method: draft._id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save the collection.");
      toast.success(draft._id ? "Collection saved." : "Collection created.");
      setDraft(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the collection.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: CollectionRow) {
    const ok = await confirm({
      title: `Delete "${row.title}"?`,
      message:
        row.productCount > 0
          ? `${row.productCount} product${row.productCount > 1 ? "s" : ""} will be removed from this collection. The products themselves stay.`
          : "Any sub-collections are moved to the top level.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/collections/${row._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete the collection.");
      toast.success("Collection deleted.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the collection.");
    }
  }

  const columns: Column<CollectionRow>[] = [
    {
      key: "title",
      header: "Collection",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-ink-200 bg-ink-100">
            {c.image?.url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={c.image.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Boxes className="h-4 w-4 text-ink-400" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-900">{c.title}</p>
            <p className="truncate text-xs text-ink-500">/{c.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "parent",
      header: "Parent",
      cell: (c) =>
        c.parent ? (
          <span className="text-ink-600">{titleById.get(c.parent) ?? "—"}</span>
        ) : (
          <span className="text-ink-400">Top level</span>
        ),
    },
    {
      key: "products",
      header: "Products",
      cell: (c) =>
        c.productCount === 0 ? (
          <span className="text-xs text-ink-400">Empty</span>
        ) : (
          <Link
            href={`/admin/products?collection=${c._id}`}
            className="text-teal-700 hover:underline"
          >
            {c.productCount}
          </Link>
        ),
    },
    { key: "sort", header: "Sort", cell: (c) => <span className="text-ink-600">{c.sortOrder}</span> },
    {
      key: "flags",
      header: "Flags",
      cell: (c) => (
        <div className="flex flex-wrap gap-1">
          <StatusPill status={c.status} />
          {c.featured && <StatusPill status="featured" tone="warning" />}
          {c.showInNav && <StatusPill status="in nav" tone="info" />}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() =>
              setDraft({
                _id: c._id,
                title: c.title,
                slug: c.slug,
                description: c.description,
                image: c.image,
                parent: c.parent,
                sortOrder: c.sortOrder,
                featured: c.featured,
                showInNav: c.showInNav,
                status: c.status,
              })
            }
            className="rounded p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
            aria-label={`Edit ${c.title}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => remove(c)}
            className="rounded p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${c.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader
          title="All collections"
          action={
            <Button size="sm" onClick={() => setDraft({ ...emptyDraft, sortOrder: rows.length })}>
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          }
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c._id}
          empty={
            <EmptyState
              icon={Boxes}
              title="No collections yet"
              description="Collections group products for navigation and the homepage."
              action={
                <Button size="sm" onClick={() => setDraft({ ...emptyDraft })}>
                  Create the first one
                </Button>
              }
            />
          }
        />
      </Card>

      <Card className="h-fit">
        <CardHeader title={draft?._id ? "Edit collection" : draft ? "New collection" : "Editor"} />
        {!draft ? (
          <EmptyState
            icon={Pencil}
            title="Nothing selected"
            description="Pick a collection to edit, or create a new one."
          />
        ) : (
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <FormField label="Title" required>
              <Input value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </FormField>
            <FormField label="Slug" hint={`/collections/${draft.slug || slugify(draft.title) || "…"}`}>
              <Input
                value={draft.slug}
                onChange={(e) => set("slug", slugify(e.target.value))}
                placeholder={slugify(draft.title)}
              />
            </FormField>
            <FormField label="Description">
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </FormField>
            <FormField label="Parent collection">
              <Select
                value={draft.parent ?? ""}
                onChange={(e) => set("parent", e.target.value || null)}
              >
                <option value="">Top level</option>
                {rows
                  .filter((r) => r._id !== draft._id)
                  .map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title}
                    </option>
                  ))}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Sort order">
                <Input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
                />
              </FormField>
              <FormField label="Status">
                <Select
                  value={draft.status}
                  onChange={(e) => set("status", e.target.value as Draft["status"])}
                >
                  <option value="active">Active</option>
                  <option value="hidden">Hidden</option>
                </Select>
              </FormField>
            </div>
            <div className="flex flex-col gap-2">
              <Checkbox
                label="Featured"
                checked={draft.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              <Checkbox
                label="Show in navigation"
                checked={draft.showInNav}
                onChange={(e) => set("showInNav", e.target.checked)}
              />
            </div>
            <ImageUploader
              multiple={false}
              folder="nuvora/collections"
              label="Collection image"
              hint="Used on collection cards and banners."
              images={draft.image?.url ? [draft.image] : []}
              onChange={(next) => set("image", next[0])}
            />
            <div className="flex gap-2">
              <Button onClick={save} loading={saving} className="flex-1">
                {draft._id ? "Save changes" : "Create collection"}
              </Button>
              <Button variant="secondary" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
      {dialog}
    </div>
  );
}

export default CollectionsManager;
