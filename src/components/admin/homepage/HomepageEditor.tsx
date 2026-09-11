"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { FormField } from "../FormField";
import { ImageUploader } from "../ImageUploader";
import { Card, CardHeader, Button, Checkbox, Input, Select, Textarea } from "../ui";
import { useToast } from "../Toast";
import { useConfirm } from "../ConfirmDialog";

interface HeroSlide {
  image: string;
  mobileImage?: string;
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  position: number;
}

interface ValueProp {
  icon: string;
  title: string;
  description?: string;
}

interface Section {
  key: string;
  title?: string;
  subtitle?: string;
  collectionSlug?: string;
  limit: number;
  position: number;
  enabled: boolean;
}

interface PromoBanner {
  enabled: boolean;
  heading?: string;
  body?: string;
  image?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface Content {
  announcementBar: { enabled: boolean; messages: string[] };
  heroSlides: HeroSlide[];
  valueProps: ValueProp[];
  sections: Section[];
  promoBanner: PromoBanner;
}

const ICON_OPTIONS = ["Truck", "ShieldCheck", "RotateCcw", "Headset", "Sparkles", "Package", "CreditCard", "Heart"];

export function HomepageEditor({
  initial,
  collectionOptions,
}: {
  initial: Content;
  collectionOptions: { title: string; slug: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [content, setContent] = useState<Content>(initial);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  function update<K extends keyof Content>(key: K, value: Content[K]) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save the homepage.");
      toast.success("Homepage saved.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the homepage.");
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    const ok = await confirm({
      title: "Reset homepage to defaults?",
      message: "This replaces everything below with the store's default starting content.",
      destructive: true,
      confirmLabel: "Reset",
    });
    if (!ok) return;

    setResetting(true);
    try {
      const res = await fetch("/api/admin/content", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not reset.");
      setContent(body.content);
      toast.success("Reset to defaults. Review and save to keep it.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <Card>
        <CardHeader title="Announcement bar" />
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <Checkbox
            label="Show announcement bar"
            checked={content.announcementBar.enabled}
            onChange={(e) =>
              update("announcementBar", { ...content.announcementBar, enabled: e.target.checked })
            }
          />
          {content.announcementBar.messages.map((msg, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={msg}
                onChange={(e) => {
                  const next = [...content.announcementBar.messages];
                  next[i] = e.target.value;
                  update("announcementBar", { ...content.announcementBar, messages: next });
                }}
                maxLength={160}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  update("announcementBar", {
                    ...content.announcementBar,
                    messages: content.announcementBar.messages.filter((_, idx) => idx !== i),
                  })
                }
                aria-label="Remove message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {content.announcementBar.messages.length < 8 && (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() =>
                update("announcementBar", {
                  ...content.announcementBar,
                  messages: [...content.announcementBar.messages, ""],
                })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add message
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Hero slides"
          action={
            content.heroSlides.length < 8 ? (
              <Button
                size="sm"
                onClick={() =>
                  update("heroSlides", [
                    ...content.heroSlides,
                    { image: "", position: content.heroSlides.length },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add slide
              </Button>
            ) : undefined
          }
        />
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          {content.heroSlides.length === 0 && (
            <p className="text-sm text-ink-500">No hero slides. Add one to show a banner on the homepage.</p>
          )}
          {content.heroSlides.map((slide, i) => (
            <div key={i} className="rounded-card border border-ink-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                  <GripVertical className="h-3.5 w-3.5" /> Slide {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "heroSlides",
                      content.heroSlides.filter((_, idx) => idx !== i)
                    )
                  }
                  className="rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove slide"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Eyebrow" className="sm:col-span-2">
                  <Input
                    value={slide.eyebrow ?? ""}
                    onChange={(e) => updateSlide(i, { eyebrow: e.target.value })}
                  />
                </FormField>
                <FormField label="Heading" className="sm:col-span-2">
                  <Input
                    value={slide.heading ?? ""}
                    onChange={(e) => updateSlide(i, { heading: e.target.value })}
                  />
                </FormField>
                <FormField label="Subheading" className="sm:col-span-2">
                  <Textarea
                    rows={2}
                    value={slide.subheading ?? ""}
                    onChange={(e) => updateSlide(i, { subheading: e.target.value })}
                  />
                </FormField>
                <FormField label="Button label">
                  <Input
                    value={slide.ctaLabel ?? ""}
                    onChange={(e) => updateSlide(i, { ctaLabel: e.target.value })}
                  />
                </FormField>
                <FormField label="Button link">
                  <Input
                    value={slide.ctaHref ?? ""}
                    onChange={(e) => updateSlide(i, { ctaHref: e.target.value })}
                    placeholder="/collections"
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <ImageUploader
                    multiple={false}
                    folder="nuvora/homepage"
                    label="Slide image"
                    images={slide.image ? [{ url: slide.image }] : []}
                    onChange={(next) => updateSlide(i, { image: next[0]?.url ?? "" })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Value props"
          action={
            content.valueProps.length < 8 ? (
              <Button
                size="sm"
                onClick={() =>
                  update("valueProps", [...content.valueProps, { icon: "Sparkles", title: "" }])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            ) : undefined
          }
        />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {content.valueProps.map((vp, i) => (
            <div key={i} className="rounded-card border border-ink-200 p-3">
              <div className="flex gap-2">
                <Select
                  value={vp.icon}
                  onChange={(e) => updateValueProp(i, { icon: e.target.value })}
                  className="w-28 shrink-0"
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
                <Input
                  value={vp.title}
                  onChange={(e) => updateValueProp(i, { title: e.target.value })}
                  placeholder="Title"
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => update("valueProps", content.valueProps.filter((_, idx) => idx !== i))}
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                value={vp.description ?? ""}
                onChange={(e) => updateValueProp(i, { description: e.target.value })}
                placeholder="Description"
                className="mt-2"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Product sections"
          description="Controls which product grids show on the homepage, in order."
          action={
            content.sections.length < 12 ? (
              <Button
                size="sm"
                onClick={() =>
                  update("sections", [
                    ...content.sections,
                    {
                      key: `section-${content.sections.length + 1}`,
                      title: "",
                      limit: 8,
                      position: content.sections.length,
                      enabled: true,
                    },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add section
              </Button>
            ) : undefined
          }
        />
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          {content.sections.map((section, i) => (
            <div key={i} className="rounded-card border border-ink-200 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Section key" hint="featured, best-selling, new-arrivals, or a custom key">
                  <Input value={section.key} onChange={(e) => updateSection(i, { key: e.target.value })} />
                </FormField>
                <FormField label="Title">
                  <Input value={section.title ?? ""} onChange={(e) => updateSection(i, { title: e.target.value })} />
                </FormField>
                <FormField label="Subtitle" className="sm:col-span-2">
                  <Input
                    value={section.subtitle ?? ""}
                    onChange={(e) => updateSection(i, { subtitle: e.target.value })}
                  />
                </FormField>
                <FormField label="Pull from collection" hint="Leave blank to use the section key's built-in logic">
                  <Select
                    value={section.collectionSlug ?? ""}
                    onChange={(e) => updateSection(i, { collectionSlug: e.target.value })}
                  >
                    <option value="">— None —</option>
                    {collectionOptions.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Product count">
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={section.limit}
                    onChange={(e) => updateSection(i, { limit: Number(e.target.value) || 8 })}
                  />
                </FormField>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Checkbox
                  label="Enabled"
                  checked={section.enabled}
                  onChange={(e) => updateSection(i, { enabled: e.target.checked })}
                />
                <button
                  type="button"
                  onClick={() => update("sections", content.sections.filter((_, idx) => idx !== i))}
                  className="rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove section"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Promo banner" />
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <Checkbox
            label="Show promo banner"
            checked={content.promoBanner.enabled}
            onChange={(e) => update("promoBanner", { ...content.promoBanner, enabled: e.target.checked })}
          />
          <FormField label="Heading">
            <Input
              value={content.promoBanner.heading ?? ""}
              onChange={(e) => update("promoBanner", { ...content.promoBanner, heading: e.target.value })}
            />
          </FormField>
          <FormField label="Body">
            <Textarea
              rows={2}
              value={content.promoBanner.body ?? ""}
              onChange={(e) => update("promoBanner", { ...content.promoBanner, body: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Button label">
              <Input
                value={content.promoBanner.ctaLabel ?? ""}
                onChange={(e) => update("promoBanner", { ...content.promoBanner, ctaLabel: e.target.value })}
              />
            </FormField>
            <FormField label="Button link">
              <Input
                value={content.promoBanner.ctaHref ?? ""}
                onChange={(e) => update("promoBanner", { ...content.promoBanner, ctaHref: e.target.value })}
              />
            </FormField>
          </div>
          <ImageUploader
            multiple={false}
            folder="nuvora/homepage"
            label="Banner image"
            images={content.promoBanner.image ? [{ url: content.promoBanner.image }] : []}
            onChange={(next) => update("promoBanner", { ...content.promoBanner, image: next[0]?.url ?? "" })}
          />
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:pl-60">
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={resetDefaults} loading={resetting}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
          </Button>
          <Button onClick={save} loading={saving}>
            <Save className="h-3.5 w-3.5" /> Save homepage
          </Button>
        </div>
      </div>
      {dialog}
    </div>
  );

  function updateSlide(index: number, patch: Partial<HeroSlide>) {
    const next = [...content.heroSlides];
    next[index] = { ...next[index], ...patch };
    update("heroSlides", next);
  }

  function updateValueProp(index: number, patch: Partial<ValueProp>) {
    const next = [...content.valueProps];
    next[index] = { ...next[index], ...patch };
    update("valueProps", next);
  }

  function updateSection(index: number, patch: Partial<Section>) {
    const next = [...content.sections];
    next[index] = { ...next[index], ...patch };
    update("sections", next);
  }
}

export default HomepageEditor;
