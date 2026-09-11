import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Product, type IProduct } from "@/models/Product";
import { ProductVariant, type IProductVariant } from "@/models/ProductVariant";
import { Wishlist, type IWishlist } from "@/models/Wishlist";
import { authError, jsonError, parseWith, readJson, serverError } from "../_lib/http";

export const dynamic = "force-dynamic";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const addSchema = z.object({
  productId: objectId,
  variantId: objectId.optional().nullable(),
});

const removeSchema = z.object({ productId: objectId });

export async function GET() {
  try {
    const session = await requireUser();
    await connectDB();
    const wishlist = await Wishlist.findOne({ userId: session.userId }).lean<IWishlist | null>();
    return NextResponse.json({ items: await hydrate(wishlist) });
  } catch (err) {
    return authError(err) ?? serverError("wishlist:GET", err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser();

    const parsed = parseWith(addSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;
    const { productId, variantId } = parsed.data;

    await connectDB();

    const product = await Product.findOne({ _id: productId, status: "active" })
      .select("_id")
      .lean();
    if (!product) return jsonError("That product no longer exists.", 404);

    const wishlist =
      (await Wishlist.findOne({ userId: session.userId })) ??
      (await Wishlist.create({ userId: session.userId, items: [] }));

    const index = wishlist.items.findIndex((item) => String(item.productId) === productId);

    if (index === -1) {
      if (wishlist.items.length >= 200) {
        return jsonError("Your wishlist is full.", 400);
      }
      wishlist.items.unshift({
        productId: new Types.ObjectId(productId),
        variantId: variantId ? new Types.ObjectId(variantId) : null,
        addedAt: new Date(),
      });
    } else {
      // Toggle: a second tap on an item already saved removes it.
      wishlist.items.splice(index, 1);
    }

    await wishlist.save();
    return NextResponse.json({ items: await hydrate(wishlist.toObject()) });
  } catch (err) {
    return authError(err) ?? serverError("wishlist:POST", err);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireUser();

    const parsed = parseWith(removeSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;

    await connectDB();

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId: session.userId },
      { $pull: { items: { productId: new Types.ObjectId(parsed.data.productId) } } },
      { new: true }
    ).lean<IWishlist | null>();

    return NextResponse.json({ items: await hydrate(wishlist) });
  } catch (err) {
    return authError(err) ?? serverError("wishlist:DELETE", err);
  }
}

async function hydrate(wishlist: IWishlist | null) {
  if (!wishlist || wishlist.items.length === 0) return [];

  const productIds = wishlist.items.map((item) => item.productId);

  const [products, variants] = await Promise.all([
    Product.find({ _id: { $in: productIds }, status: "active" })
      .select("title slug price compareAtPrice images rating")
      .lean<IProduct[]>(),
    ProductVariant.find({ productId: { $in: productIds }, active: true })
      .select("productId price inventoryQuantity inventoryPolicy position")
      .sort({ position: 1 })
      .lean<IProductVariant[]>(),
  ]);

  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const variantMap = new Map<string, IProductVariant[]>();
  for (const variant of variants) {
    const key = String(variant.productId);
    const list = variantMap.get(key);
    if (list) list.push(variant);
    else variantMap.set(key, [variant]);
  }

  return wishlist.items.flatMap((item) => {
    const product = productMap.get(String(item.productId));
    if (!product) return [];

    const productVariants = variantMap.get(String(product._id)) ?? [];
    const chosen =
      productVariants.find((v) => item.variantId && String(v._id) === String(item.variantId)) ??
      productVariants[0];

    const inStock = productVariants.some(
      (v) => v.inventoryPolicy === "continue" || v.inventoryQuantity > 0
    );

    return [
      {
        productId: String(product._id),
        variantId: chosen ? String(chosen._id) : null,
        title: product.title,
        slug: product.slug,
        price: chosen?.price ?? product.price,
        compareAtPrice: product.compareAtPrice,
        image: product.images[0]?.url,
        rating: product.rating,
        inStock,
        addedAt: item.addedAt,
      },
    ];
  });
}
