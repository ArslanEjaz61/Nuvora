import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "../_lib/guard";
import { connectDB } from "@/lib/db";
import { SiteContent } from "@/models/SiteContent";
import { readJson, parseWith, serverError } from "@/app/api/_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const heroSlideSchema = z.object({
  image: z.string().trim().min(1).max(600),
  mobileImage: z.string().trim().max(600).optional().or(z.literal("")),
  eyebrow: z.string().trim().max(80).optional().or(z.literal("")),
  heading: z.string().trim().max(140).optional().or(z.literal("")),
  subheading: z.string().trim().max(280).optional().or(z.literal("")),
  ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
  ctaHref: z.string().trim().max(300).optional().or(z.literal("")),
  position: z.number().int().min(0).default(0),
});

const valuePropSchema = z.object({
  icon: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional().or(z.literal("")),
});

const sectionSchema = z.object({
  key: z.string().trim().min(1).max(60),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  subtitle: z.string().trim().max(240).optional().or(z.literal("")),
  collectionSlug: z.string().trim().max(160).optional().or(z.literal("")),
  limit: z.number().int().min(1).max(24).default(8),
  position: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
});

const contentSchema = z.object({
  announcementBar: z.object({
    enabled: z.boolean().default(true),
    messages: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
  }),
  heroSlides: z.array(heroSlideSchema).max(8).default([]),
  valueProps: z.array(valuePropSchema).max(8).default([]),
  sections: z.array(sectionSchema).max(12).default([]),
  promoBanner: z
    .object({
      enabled: z.boolean().default(false),
      heading: z.string().trim().max(120).optional().or(z.literal("")),
      body: z.string().trim().max(400).optional().or(z.literal("")),
      image: z.string().trim().max(600).optional().or(z.literal("")),
      ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
      ctaHref: z.string().trim().max(300).optional().or(z.literal("")),
    })
    .default({ enabled: false }),
});

export type HomepageContentInput = z.infer<typeof contentSchema>;

/**
 * Seed content is deliberately free of any "customers served" or "% satisfied"
 * style figures — this store must never publish social proof it can't evidence.
 */
export const DEFAULT_HOMEPAGE: HomepageContentInput = {
  announcementBar: {
    enabled: true,
    messages: [
      "Free shipping on orders over $99",
      "30-day returns on everything",
      "New arrivals added weekly",
    ],
  },
  heroSlides: [
    {
      image: "/brand/hero-fresh.jpg",
      mobileImage: "",
      eyebrow: "your style. your home.",
      heading: "",
      subheading: "",
      ctaLabel: "",
      ctaHref: "",
      position: 0,
    },
  ],
  valueProps: [
    {
      icon: "Truck",
      title: "Free shipping over $99",
      description: "Flat-rate delivery below the threshold, tracked end to end.",
    },
    {
      icon: "RotateCcw",
      title: "30-day returns",
      description: "Changed your mind? Send it back within 30 days.",
    },
    {
      icon: "ShieldCheck",
      title: "Secure checkout",
      description: "Payments handled by Stripe. We never store your card.",
    },
    {
      icon: "Headset",
      title: "Real people to talk to",
      description: "Questions about a piece? Our team answers every message.",
    },
  ],
  sections: [
    {
      key: "featured",
      title: "Featured picks",
      subtitle: "Hand-selected favourites from across the store.",
      collectionSlug: "",
      limit: 8,
      position: 0,
      enabled: true,
    },
    {
      key: "new-arrivals",
      title: "New arrivals",
      subtitle: "The latest additions to the collection.",
      collectionSlug: "",
      limit: 8,
      position: 1,
      enabled: true,
    },
  ],
  promoBanner: {
    enabled: false,
    heading: "",
    body: "",
    image: "",
    ctaLabel: "",
    ctaHref: "",
  },
};

export async function GET() {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const doc = await SiteContent.findOne({ key: "homepage" }).lean();
    return NextResponse.json({
      content: doc
        ? { ...doc, _id: String(doc._id) }
        : { key: "homepage", ...DEFAULT_HOMEPAGE, seeded: false },
      exists: Boolean(doc),
      defaults: DEFAULT_HOMEPAGE,
    });
  } catch (err) {
    return serverError("admin/content:GET", err);
  }
}

export async function PUT(req: Request) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const parsed = parseWith(contentSchema, await readJson(req));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  try {
    await connectDB();
    const doc = await SiteContent.findOneAndUpdate(
      { key: "homepage" },
      {
        $set: {
          announcementBar: input.announcementBar,
          heroSlides: input.heroSlides.map((s, i) => ({ ...s, position: i })),
          valueProps: input.valueProps,
          sections: input.sections.map((s, i) => ({ ...s, position: i })),
          promoBanner: input.promoBanner,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ content: doc ? { ...doc, _id: String(doc._id) } : null });
  } catch (err) {
    return serverError("admin/content:PUT", err);
  }
}

/** Reset to defaults. */
export async function POST() {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  try {
    await connectDB();
    const doc = await SiteContent.findOneAndUpdate(
      { key: "homepage" },
      { $set: DEFAULT_HOMEPAGE },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return NextResponse.json({ content: doc ? { ...doc, _id: String(doc._id) } : null });
  } catch (err) {
    return serverError("admin/content:POST", err);
  }
}
