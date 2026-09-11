/**
 * Seeds the store so it can be run and reviewed end to end.
 *
 *   npm run seed              collections + admin user + sample catalogue
 *   npm run seed -- --reset   wipe catalogue collections first
 *
 * The sample products are placeholders. Replace them with the client's real
 * inventory and photography before launch.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { Collection } from "../src/models/Collection";
import { Product } from "../src/models/Product";
import { ProductVariant } from "../src/models/ProductVariant";
import { User } from "../src/models/User";
import { Coupon } from "../src/models/Coupon";
import { SiteContent } from "../src/models/SiteContent";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@nuvora.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Nuvora2026!";

const COLLECTIONS = [
  {
    title: "Living Room",
    slug: "living-room",
    description: "Sofas, armchairs, coffee tables and everything that makes a room gather.",
    featured: true,
    sortOrder: 1,
  },
  {
    title: "Bedroom",
    slug: "bedroom",
    description: "Beds, nightstands and storage built for rest.",
    featured: true,
    sortOrder: 2,
  },
  {
    title: "Dining",
    slug: "dining",
    description: "Tables and seating for long dinners and slow mornings.",
    featured: true,
    sortOrder: 3,
  },
  {
    title: "Décor",
    slug: "decor",
    description: "Mirrors, vases, textiles and the finishing touches.",
    featured: true,
    sortOrder: 4,
  },
  {
    title: "Lighting",
    slug: "lighting",
    description: "Floor lamps, table lamps and pendants.",
    featured: true,
    sortOrder: 5,
  },
  {
    title: "Outdoor",
    slug: "outdoor",
    description: "Patio seating and dining that handles the weather.",
    featured: true,
    sortOrder: 6,
  },
];

interface SeedProduct {
  title: string;
  collection: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  shortDescription: string;
  material: string;
  tags: string[];
  featured?: boolean;
  options?: { name: string; values: string[] };
}

const PRODUCTS: SeedProduct[] = [
  {
    title: "Marlow Three-Seat Sofa",
    collection: "living-room",
    price: 129900,
    compareAtPrice: 159900,
    description:
      "A deep, low-slung three-seater built on a kiln-dried hardwood frame. The cushions are wrapped in a high-resilience foam core with a feather-blend topper, so they hold their shape but still give when you sit down.\n\nRemovable covers, tool-free assembly, and feet that can be swapped between oak and black steel.",
    shortDescription: "Deep three-seater with a hardwood frame and removable covers.",
    material: "Kiln-dried hardwood, polyester weave",
    tags: ["sofa", "seating", "living room"],
    featured: true,
    options: { name: "Colour", values: ["Oatmeal", "Slate", "Forest"] },
  },
  {
    title: "Hadley Lounge Chair",
    collection: "living-room",
    price: 54900,
    description:
      "A compact lounge chair with a gently curved back and a solid ash base. Sized to work in a corner without crowding it.",
    shortDescription: "Curved-back lounge chair on a solid ash base.",
    material: "Solid ash, wool blend",
    tags: ["chair", "seating", "living room"],
    featured: true,
    options: { name: "Colour", values: ["Camel", "Charcoal"] },
  },
  {
    title: "Pell Oak Coffee Table",
    collection: "living-room",
    price: 42900,
    compareAtPrice: 49900,
    description:
      "White oak with a soft matte finish and a lower shelf for the things that would otherwise pile up on top.",
    shortDescription: "White oak coffee table with a lower storage shelf.",
    material: "Solid white oak",
    tags: ["table", "storage", "living room"],
  },
  {
    title: "Rivet Media Console",
    collection: "living-room",
    price: 69900,
    description:
      "Four soft-close drawers and a cable channel across the back. Fits a 65-inch screen with room to spare.",
    shortDescription: "Four-drawer console with built-in cable management.",
    material: "Oak veneer, powder-coated steel",
    tags: ["storage", "living room"],
  },
  {
    title: "Alder Platform Bed",
    collection: "bedroom",
    price: 89900,
    compareAtPrice: 109900,
    description:
      "A low platform frame with a slatted base, so it needs no box spring. The headboard is upholstered and removable if you would rather go without.",
    shortDescription: "Low platform frame with a removable upholstered headboard.",
    material: "Solid alder, linen blend",
    tags: ["bed", "bedroom"],
    featured: true,
    options: { name: "Size", values: ["Queen", "King"] },
  },
  {
    title: "Fen Nightstand",
    collection: "bedroom",
    price: 24900,
    description:
      "Two drawers, one shallow for the small things and one deep enough for books. Matches the Alder bed frame.",
    shortDescription: "Two-drawer nightstand in matching alder.",
    material: "Solid alder",
    tags: ["storage", "bedroom"],
  },
  {
    title: "Ora Six-Drawer Dresser",
    collection: "bedroom",
    price: 79900,
    description:
      "Six full-extension drawers on soft-close runners, with an anti-tip kit included.",
    shortDescription: "Six-drawer dresser with soft-close runners.",
    material: "Oak veneer, solid oak handles",
    tags: ["storage", "bedroom"],
  },
  {
    title: "Brindle Dining Table",
    collection: "dining",
    price: 99900,
    compareAtPrice: 119900,
    description:
      "Seats six comfortably, eight at a squeeze. The top is a single slab of finger-jointed oak on a trestle base that keeps the legs out of the way.",
    shortDescription: "Trestle-base oak dining table that seats six to eight.",
    material: "Solid oak",
    tags: ["table", "dining"],
    featured: true,
  },
  {
    title: "Wren Dining Chair",
    collection: "dining",
    price: 18900,
    description:
      "A stackable chair with a moulded plywood seat and a light steel frame. Sold individually.",
    shortDescription: "Stackable plywood-and-steel dining chair.",
    material: "Moulded plywood, powder-coated steel",
    tags: ["chair", "seating", "dining"],
    options: { name: "Colour", values: ["Natural", "Black", "White"] },
  },
  {
    title: "Cove Sideboard",
    collection: "dining",
    price: 74900,
    description: "Two cabinets and a central drawer, with adjustable shelves inside.",
    shortDescription: "Sideboard with two cabinets and adjustable shelving.",
    material: "Oak veneer",
    tags: ["storage", "dining"],
  },
  {
    title: "Halo Round Mirror",
    collection: "decor",
    price: 22900,
    compareAtPrice: 27900,
    description:
      "A thin brass surround on a 32-inch round mirror. Hangs portrait or landscape on a French cleat.",
    shortDescription: "32-inch round mirror with a thin brass surround.",
    material: "Brass, glass",
    tags: ["mirror", "decor"],
    featured: true,
  },
  {
    title: "Terra Ceramic Vase",
    collection: "decor",
    price: 7900,
    description: "Hand-thrown stoneware with a matte glaze. Watertight, so it takes fresh stems.",
    shortDescription: "Hand-thrown stoneware vase with a matte glaze.",
    material: "Stoneware",
    tags: ["vase", "decor"],
    options: { name: "Size", values: ["Small", "Large"] },
  },
  {
    title: "Loom Wool Throw",
    collection: "decor",
    price: 12900,
    description: "A heavyweight lambswool throw with a hand-knotted fringe.",
    shortDescription: "Heavyweight lambswool throw with a knotted fringe.",
    material: "Lambswool",
    tags: ["textiles", "decor"],
    options: { name: "Colour", values: ["Ecru", "Rust", "Indigo"] },
  },
  {
    title: "Vale Area Rug",
    collection: "decor",
    price: 34900,
    compareAtPrice: 42900,
    description: "A flatweave wool rug with a low pile that works over underfloor heating.",
    shortDescription: "Low-pile flatweave wool rug.",
    material: "Wool",
    tags: ["rug", "textiles", "decor"],
    options: { name: "Size", values: ["5x8", "8x10"] },
  },
  {
    title: "Ridge Floor Lamp",
    collection: "lighting",
    price: 27900,
    description:
      "An adjustable arc lamp with a weighted marble base and a dimmable warm LED.",
    shortDescription: "Adjustable arc lamp with a marble base and dimmable LED.",
    material: "Marble, brushed brass",
    tags: ["lamp", "lighting"],
    featured: true,
  },
  {
    title: "Ember Table Lamp",
    collection: "lighting",
    price: 15900,
    description: "A ribbed glass body with a linen shade and an inline dimmer.",
    shortDescription: "Ribbed glass table lamp with a linen shade.",
    material: "Glass, linen",
    tags: ["lamp", "lighting"],
  },
  {
    title: "Arc Pendant Light",
    collection: "lighting",
    price: 19900,
    description: "A spun-aluminium dome on a fabric cord, adjustable up to 6 feet.",
    shortDescription: "Spun-aluminium pendant on an adjustable fabric cord.",
    material: "Spun aluminium",
    tags: ["lighting"],
    options: { name: "Finish", values: ["Brass", "Matte Black"] },
  },
  {
    title: "Kerr Outdoor Sofa",
    collection: "outdoor",
    price: 109900,
    compareAtPrice: 134900,
    description:
      "All-weather wicker over a powder-coated aluminium frame, with quick-dry foam cushions in solution-dyed fabric.",
    shortDescription: "All-weather wicker sofa with quick-dry cushions.",
    material: "All-weather wicker, aluminium",
    tags: ["outdoor", "seating"],
    featured: true,
  },
  {
    title: "Bay Patio Dining Set",
    collection: "outdoor",
    price: 149900,
    description: "A four-seat set with a slatted teak table and stackable chairs.",
    shortDescription: "Four-seat teak patio dining set with stackable chairs.",
    material: "Teak, aluminium",
    tags: ["outdoor", "dining"],
  },
  {
    title: "Sol Outdoor Side Table",
    collection: "outdoor",
    price: 12900,
    description: "A powder-coated steel side table that can be left out year round.",
    shortDescription: "Powder-coated steel side table built to stay outside.",
    material: "Powder-coated steel",
    tags: ["outdoor", "table"],
  },
];

function placeholder(seed: string) {
  return `/placeholders/${seed}.svg`;
}

function skuFrom(title: string, suffix: string) {
  const base = title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return `${base}-${suffix}`;
}

async function main() {
  const reset = process.argv.includes("--reset");
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local first.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  if (reset) {
    await Promise.all([
      Product.deleteMany({}),
      ProductVariant.deleteMany({}),
      Collection.deleteMany({}),
    ]);
    console.log("Cleared existing catalogue");
  }

  const collectionIds = new Map<string, mongoose.Types.ObjectId>();
  for (const entry of COLLECTIONS) {
    const doc = await Collection.findOneAndUpdate(
      { slug: entry.slug },
      {
        $set: {
          title: entry.title,
          description: entry.description,
          featured: entry.featured,
          sortOrder: entry.sortOrder,
          status: "active",
          showInNav: true,
          image: { url: placeholder(entry.slug), alt: entry.title },
        },
      },
      { upsert: true, new: true }
    );
    collectionIds.set(entry.slug, doc._id);
  }
  console.log(`Seeded ${COLLECTIONS.length} collections`);

  let productCount = 0;
  let variantCount = 0;

  for (const entry of PRODUCTS) {
    const slug = entry.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    const collectionId = collectionIds.get(entry.collection);
    if (!collectionId) continue;

    const optionValues = entry.options?.values ?? ["Default"];

    const product = await Product.findOneAndUpdate(
      { slug },
      {
        $set: {
          title: entry.title,
          description: entry.description,
          shortDescription: entry.shortDescription,
          price: entry.price,
          compareAtPrice: entry.compareAtPrice,
          material: entry.material,
          tags: entry.tags,
          featured: Boolean(entry.featured),
          status: "active",
          collections: [collectionId],
          currency: "USD",
          options: entry.options ? [{ name: entry.options.name, values: optionValues }] : [],
          images: [
            { url: placeholder(entry.collection), alt: entry.title },
            { url: placeholder(`${entry.collection}-alt`), alt: entry.title },
          ],
          seo: {
            title: entry.title,
            description: entry.shortDescription,
          },
        },
      },
      { upsert: true, new: true }
    );
    productCount += 1;

    await ProductVariant.deleteMany({ productId: product._id });

    let totalInventory = 0;
    for (const [index, value] of optionValues.entries()) {
      // Larger sizes carry a modest uplift so variant pricing is exercised.
      const uplift = value === "King" || value === "Large" || value === "8x10" ? 15000 : 0;
      const quantity = 8 + index * 3;
      totalInventory += quantity;

      await ProductVariant.create({
        productId: product._id,
        sku: skuFrom(entry.title, String(index + 1).padStart(2, "0")),
        title: entry.options ? `${entry.options.name}: ${value}` : "Default",
        options: entry.options ? [{ name: entry.options.name, value }] : [],
        price: entry.price + uplift,
        compareAtPrice: entry.compareAtPrice ? entry.compareAtPrice + uplift : undefined,
        inventoryQuantity: quantity,
        inventoryPolicy: "deny",
        lowStockThreshold: 5,
        position: index,
        active: true,
      });
      variantCount += 1;
    }

    await Product.updateOne({ _id: product._id }, { $set: { totalInventory } });
  }
  console.log(`Seeded ${productCount} products and ${variantCount} variants`);

  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
  if (existingAdmin) {
    await User.updateOne({ _id: existingAdmin._id }, { $set: { role: "admin" } });
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
  } else {
    await User.create({
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      firstName: "Nuvora",
      lastName: "Admin",
      role: "admin",
    });
    console.log(`Created admin ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log("Change this password after your first sign-in.");
  }

  await Coupon.findOneAndUpdate(
    { code: "WELCOME10" },
    {
      $set: {
        description: "10% off your first order",
        type: "percent",
        value: 10,
        minSubtotal: 5000,
        active: true,
      },
    },
    { upsert: true }
  );

  await Coupon.findOneAndUpdate(
    { code: "FREESHIP" },
    {
      $set: {
        description: "Free shipping on any order",
        type: "free_shipping",
        value: 0,
        active: true,
      },
    },
    { upsert: true }
  );
  console.log("Seeded coupons WELCOME10 and FREESHIP");

  await SiteContent.findOneAndUpdate(
    { key: "homepage" },
    {
      $setOnInsert: {
        announcementBar: {
          enabled: true,
          messages: [
            "Free shipping on orders over $99",
            "Curated collections for your home",
            "30-day returns on everything",
          ],
        },
        heroSlides: [
          {
            // "Find it all at Nuvora / Furniture, décor..." is already baked
            // into this photo — only the eyebrow is overlaid.
            image: "/brand/hero-fresh.jpg",
            eyebrow: "your style. your home.",
            position: 0,
          },
        ],
        valueProps: [
          { icon: "Truck", title: "Free shipping", description: "On orders over $99" },
          { icon: "ShieldCheck", title: "Secure payment", description: "Encrypted checkout" },
          { icon: "RotateCcw", title: "Easy returns", description: "30 days to change your mind" },
          { icon: "Headset", title: "Here to help", description: "Support 7 days a week" },
        ],
        sections: [
          { key: "featured", title: "Featured picks", position: 0, limit: 8, enabled: true },
          { key: "best-selling", title: "Best sellers", position: 1, limit: 8, enabled: true },
          { key: "new-arrivals", title: "New arrivals", position: 2, limit: 8, enabled: true },
        ],
      },
    },
    { upsert: true }
  );
  console.log("Seeded homepage content");

  await mongoose.disconnect();
  console.log("\nDone. Start the app with `npm run dev`.");
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
