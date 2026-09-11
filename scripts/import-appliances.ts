/**
 * One-off bulk import for the client's real appliance photos.
 *
 *   npx tsx --env-file=.env.local scripts/import-appliances.ts [--dry-run]
 *
 * Reads every image in "website image product/", groups them by product name
 * (stripping the trailing frame number and any accidental "(1)" duplicate
 * suffix), uploads each group to Cloudinary in order, and creates one DRAFT
 * product + one default variant per group with an estimated price. Nothing
 * this script creates goes live automatically — an admin must review the
 * price and flip status to "active" per product.
 */
import { readdirSync } from "fs";
import { resolve, extname, basename } from "path";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

import { Collection } from "../src/models/Collection";
import { Product } from "../src/models/Product";
import { ProductVariant } from "../src/models/ProductVariant";
import { slugify } from "../src/lib/utils";

const SOURCE_DIR = resolve(process.cwd(), "website image product");
const DRY_RUN = process.argv.includes("--dry-run");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

interface Group {
  base: string;
  files: { index: number; path: string; name: string }[];
}

function groupFiles(): Group[] {
  const entries = readdirSync(SOURCE_DIR).filter((f) => /\.(webp|png|jpe?g)$/i.test(f));
  const groups = new Map<string, Group>();
  const seenIndex = new Set<string>(); // `${base}::${index}` — dedupes accidental "(1)" re-downloads

  for (const file of entries.sort()) {
    const withoutExt = basename(file, extname(file));
    const match = withoutExt.match(/^(.*?)\s*(\d+)(?:\s*\(\d+\))?$/);
    if (!match) {
      console.warn(`Skipping (no trailing number): ${file}`);
      continue;
    }
    const base = match[1].trim();
    const index = parseInt(match[2], 10);
    const dedupeKey = `${base}::${index}`;

    if (seenIndex.has(dedupeKey)) {
      console.log(`  (duplicate frame, skipped) ${file}`);
      continue;
    }
    seenIndex.add(dedupeKey);

    if (!groups.has(base)) groups.set(base, { base, files: [] });
    groups.get(base)!.files.push({ index, path: resolve(SOURCE_DIR, file), name: file });
  }

  for (const group of groups.values()) {
    group.files.sort((a, b) => a.index - b.index);
  }

  return [...groups.values()].sort((a, b) => a.base.localeCompare(b.base));
}

type CategoryKey = "refrigerators" | "freezers" | "chillers";

function categorize(name: string): CategoryKey {
  const n = name.toLowerCase();
  if (n.includes("chiller")) return "chillers";
  if (n.includes("freezer") && !n.includes("refrigerator")) return "freezers";
  return "refrigerators";
}

/**
 * Rough market-rate estimate from capacity + feature keywords. Deliberately
 * conservative and rounded to a plain price (no fake "compare at" — these are
 * drafts, not real listings, until an admin confirms the real price).
 */
function estimatePrice(name: string, category: CategoryKey): number {
  const n = name.toLowerCase();
  const capacityMatch = name.match(/^(\d+(?:\.\d+)?)\s*Cu\.\s*Ft\./i);
  const capacity = capacityMatch ? parseFloat(capacityMatch[1]) : 8;

  const perCuFt = category === "refrigerators" ? 34 : category === "chillers" ? 30 : 26;
  let price = 70 + capacity * perCuFt;

  if (n.includes("inverter")) price *= 1.08;
  if (n.includes("frost-free")) price *= 1.05;
  if (n.includes("practical storage")) price *= 1.04;
  if (n.includes("side-by-side")) price *= 1.15;
  if (n.includes("compact personal")) price = Math.min(price, 130);

  // Round to a clean $X9 price point, then to integer cents.
  const rounded = Math.round(price / 10) * 10 - 1;
  return Math.max(49, rounded) * 100;
}

function buildDescription(name: string, capacity: string): { short: string; long: string } {
  const n = name.toLowerCase();
  const features: string[] = [];
  if (n.includes("inverter")) features.push("an inverter compressor for quieter, more efficient cooling");
  if (n.includes("frost-free")) features.push("frost-free operation, so there's no manual defrosting");
  if (n.includes("manual defrost")) features.push("a manual defrost cycle");
  if (n.includes("practical storage")) features.push("practical interior storage layout");
  if (n.includes("side-by-side")) features.push("a side-by-side door configuration");
  if (n.includes("top-freezer")) features.push("a top-mounted freezer compartment");
  if (n.includes("bottom-freezer")) features.push("a bottom-mounted freezer compartment");
  if (n.includes("single-door")) features.push("a single-door design");
  if (n.includes("two-door")) features.push("a two-door design");

  const featureText = features.length
    ? ` It has ${features.slice(0, -1).join(", ")}${features.length > 1 ? " and " : ""}${features[features.length - 1]}.`
    : "";

  const short = `${capacity} cu. ft. capacity.${featureText}`;
  const long = `${name}, offering ${capacity} cubic feet of capacity.${featureText}\n\nContact us for delivery timelines and warranty details on this unit.`;

  return { short, long };
}

function skuFor(base: string, category: CategoryKey, seq: number) {
  const prefix = category === "refrigerators" ? "REF" : category === "freezers" ? "FRZ" : "CHL";
  const sizeMatch = base.match(/^(\d+(?:\.\d+)?)/);
  const size = sizeMatch ? sizeMatch[1].replace(".", "") : "00";
  return `${prefix}-${size}-${String(seq).padStart(3, "0")}`;
}

async function uploadImage(path: string, folder: string) {
  const result = await cloudinary.uploader.upload(path, {
    folder,
    resource_type: "image",
  });
  return { url: result.secure_url as string, publicId: result.public_id as string };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Run with --env-file=.env.local");
    process.exit(1);
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error("Cloudinary env vars are not set.");
    process.exit(1);
  }

  const groups = groupFiles();
  console.log(`Found ${groups.length} products across ${groups.reduce((n, g) => n + g.files.length, 0)} images.\n`);

  if (DRY_RUN) {
    for (const g of groups) {
      const category = categorize(g.base);
      const price = estimatePrice(g.base, category);
      console.log(`[${category}] ${g.base}  (${g.files.length} imgs)  ~$${(price / 100).toFixed(2)}`);
    }
    console.log("\nDry run only — nothing was written. Remove --dry-run to import for real.");
    return;
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB\n");

  // Clean slate: remove the placeholder furniture demo catalogue before
  // bringing in the client's real inventory.
  const demoProducts = await Product.deleteMany({});
  const demoVariants = await ProductVariant.deleteMany({});
  await Collection.deleteMany({});
  console.log(`Cleared demo catalogue: ${demoProducts.deletedCount} products, ${demoVariants.deletedCount} variants.\n`);

  const collectionByCategory: Record<CategoryKey, mongoose.Types.ObjectId> = {} as never;
  const collectionDefs: { key: CategoryKey; title: string; description: string; sortOrder: number }[] = [
    {
      key: "refrigerators",
      title: "Refrigerators",
      description: "Single-door, two-door, top-freezer, bottom-freezer and side-by-side refrigerators.",
      sortOrder: 1,
    },
    {
      key: "freezers",
      title: "Freezers",
      description: "Chest and upright freezers for extra frozen storage.",
      sortOrder: 2,
    },
    {
      key: "chillers",
      title: "Chillers",
      description: "Showcase and beverage chillers.",
      sortOrder: 3,
    },
  ];

  for (const def of collectionDefs) {
    const doc = await Collection.create({
      title: def.title,
      slug: slugify(def.title),
      description: def.description,
      status: "active",
      showInNav: true,
      featured: true,
      sortOrder: def.sortOrder,
    });
    collectionByCategory[def.key] = doc._id;
  }
  console.log("Created collections: Refrigerators, Freezers, Chillers.\n");

  let seq = 1;
  let created = 0;
  let failedUploads = 0;

  for (const group of groups) {
    const category = categorize(group.base);
    const capacityMatch = group.base.match(/^(\d+(?:\.\d+)?)\s*Cu\.\s*Ft\./i);
    const capacity = capacityMatch ? capacityMatch[1] : "?";
    const price = estimatePrice(group.base, category);
    const { short, long } = buildDescription(group.base, capacity);
    const slug = slugify(group.base);
    const sku = skuFor(group.base, category, seq++);

    process.stdout.write(`Uploading ${group.files.length} image(s) for "${group.base}"... `);

    const images: { url: string; publicId: string; alt: string }[] = [];
    for (const file of group.files) {
      try {
        const uploaded = await uploadImage(file.path, "nuvora/products");
        images.push({ ...uploaded, alt: group.base });
      } catch (err) {
        failedUploads++;
        console.error(`\n  FAILED to upload ${file.name}:`, err instanceof Error ? err.message : err);
      }
    }

    if (images.length === 0) {
      console.log("no images uploaded, skipping product.");
      continue;
    }
    console.log("done.");

    const product = await Product.create({
      title: group.base,
      slug,
      description: long,
      shortDescription: short,
      images,
      collections: [collectionByCategory[category]],
      price,
      currency: "USD",
      status: "draft",
      tags: [category.slice(0, -1), "appliance"],
      featured: false,
      seo: { title: group.base, description: short },
    });

    await ProductVariant.create({
      productId: product._id,
      sku,
      title: "Default",
      options: [],
      price,
      inventoryQuantity: 10,
      inventoryPolicy: "deny",
      lowStockThreshold: 3,
      active: true,
      position: 0,
    });

    await Product.updateOne({ _id: product._id }, { $set: { totalInventory: 10 } });
    created++;
  }

  console.log(`\nImported ${created} draft products.`);
  if (failedUploads > 0) console.log(`${failedUploads} image upload(s) failed — check the log above.`);
  console.log("\nEvery product is in DRAFT status with an ESTIMATED price.");
  console.log("Review each one in /admin/products, correct the price, then set it to Active.");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Import failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
