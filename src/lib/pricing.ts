import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Product, type IProduct } from "@/models/Product";
import { ProductVariant, type IProductVariant } from "@/models/ProductVariant";
import { Coupon, type ICoupon } from "@/models/Coupon";

export const FREE_SHIPPING_THRESHOLD = Number(
  process.env.FREE_SHIPPING_THRESHOLD_CENTS ?? 9900
);
export const FLAT_SHIPPING_RATE = Number(process.env.FLAT_SHIPPING_CENTS ?? 1495);
export const TAX_RATE = Number(process.env.TAX_RATE ?? 0);

export interface PricedLine {
  productId: string;
  variantId: string;
  slug: string;
  title: string;
  variantTitle: string;
  sku: string;
  image?: string;
  unitPrice: number;
  compareAtPrice?: number;
  quantity: number;
  lineTotal: number;
  inventoryQuantity: number;
  inStock: boolean;
  maxQuantity: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  itemCount: number;
  coupon: { code: string; description?: string } | null;
  couponError?: string;
  /** Lines dropped because the product or variant is gone / inactive. */
  removedLines: string[];
}

export interface RawCartItem {
  productId: Types.ObjectId | string;
  variantId: Types.ObjectId | string;
  quantity: number;
}

/**
 * The single source of truth for what a cart costs.
 *
 * Every price, discount and total is recomputed from the database on each call.
 * Nothing the browser sends about money is ever read here — the client only
 * supplies product/variant ids and quantities.
 */
export async function priceCart(
  items: RawCartItem[],
  couponCode?: string | null
): Promise<PricedCart> {
  await connectDB();

  const empty: PricedCart = {
    lines: [],
    subtotal: 0,
    discountTotal: 0,
    shippingTotal: 0,
    taxTotal: 0,
    grandTotal: 0,
    currency: "USD",
    itemCount: 0,
    coupon: null,
    removedLines: [],
  };

  if (!items.length) return empty;

  const variantIds = items.map((i) => new Types.ObjectId(String(i.variantId)));
  const productIds = items.map((i) => new Types.ObjectId(String(i.productId)));

  const [variants, products] = await Promise.all([
    ProductVariant.find({ _id: { $in: variantIds }, active: true }).lean<IProductVariant[]>(),
    Product.find({ _id: { $in: productIds }, status: "active" }).lean<IProduct[]>(),
  ]);

  const variantMap = new Map(variants.map((v) => [String(v._id), v]));
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const lines: PricedLine[] = [];
  const removedLines: string[] = [];

  for (const item of items) {
    const variant = variantMap.get(String(item.variantId));
    const product = productMap.get(String(item.productId));

    // Variant deleted, deactivated, product archived, or mismatched pair.
    if (!variant || !product || String(variant.productId) !== String(product._id)) {
      removedLines.push(String(item.variantId));
      continue;
    }

    const available =
      variant.inventoryPolicy === "continue" ? 99 : Math.max(0, variant.inventoryQuantity);
    const quantity = Math.max(1, Math.min(Math.floor(item.quantity), Math.min(99, available || 0)));

    if (available <= 0) {
      lines.push({
        productId: String(product._id),
        variantId: String(variant._id),
        slug: product.slug,
        title: product.title,
        variantTitle: variant.title,
        sku: variant.sku,
        image: variant.image?.url ?? product.images[0]?.url,
        unitPrice: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: 0,
        lineTotal: 0,
        inventoryQuantity: variant.inventoryQuantity,
        inStock: false,
        maxQuantity: 0,
      });
      continue;
    }

    lines.push({
      productId: String(product._id),
      variantId: String(variant._id),
      slug: product.slug,
      title: product.title,
      variantTitle: variant.title,
      sku: variant.sku,
      image: variant.image?.url ?? product.images[0]?.url,
      unitPrice: variant.price,
      compareAtPrice: variant.compareAtPrice,
      quantity,
      lineTotal: variant.price * quantity,
      inventoryQuantity: variant.inventoryQuantity,
      inStock: true,
      maxQuantity: Math.min(99, available),
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  let discountTotal = 0;
  let freeShipping = false;
  let coupon: PricedCart["coupon"] = null;
  let couponError: string | undefined;

  if (couponCode) {
    const result = await resolveCoupon(couponCode, subtotal, lines);
    if (result.error) {
      couponError = result.error;
    } else if (result.coupon) {
      coupon = { code: result.coupon.code, description: result.coupon.description };
      discountTotal = result.discount;
      freeShipping = result.freeShipping;
    }
  }

  // Discount can never exceed the subtotal.
  discountTotal = Math.min(discountTotal, subtotal);

  const discountedSubtotal = subtotal - discountTotal;
  const shippingTotal =
    itemCount === 0 || freeShipping || discountedSubtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : FLAT_SHIPPING_RATE;

  const taxTotal = Math.round(discountedSubtotal * TAX_RATE);
  const grandTotal = discountedSubtotal + shippingTotal + taxTotal;

  return {
    lines,
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    grandTotal,
    currency: "USD",
    itemCount,
    coupon,
    couponError,
    removedLines,
  };
}

async function resolveCoupon(
  code: string,
  subtotal: number,
  lines: PricedLine[]
): Promise<{ coupon?: ICoupon; discount: number; freeShipping: boolean; error?: string }> {
  const coupon = await Coupon.findOne({
    code: code.trim().toUpperCase(),
    active: true,
  }).lean<ICoupon>();

  if (!coupon) return { discount: 0, freeShipping: false, error: "That code isn't valid." };

  const now = new Date();
  if (coupon.startsAt && now < new Date(coupon.startsAt)) {
    return { discount: 0, freeShipping: false, error: "That code isn't active yet." };
  }
  if (coupon.endsAt && now > new Date(coupon.endsAt)) {
    return { discount: 0, freeShipping: false, error: "That code has expired." };
  }
  if (coupon.maxRedemptions && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { discount: 0, freeShipping: false, error: "That code has been fully redeemed." };
  }
  if (subtotal < coupon.minSubtotal) {
    return {
      discount: 0,
      freeShipping: false,
      error: `Spend ${(coupon.minSubtotal / 100).toFixed(2)} or more to use this code.`,
    };
  }

  // When a coupon is scoped, only the matching lines form the discount base.
  const hasScope =
    coupon.appliesTo?.products?.length > 0 || coupon.appliesTo?.collections?.length > 0;

  let base = subtotal;
  if (hasScope) {
    const scopedProductIds = new Set((coupon.appliesTo.products ?? []).map(String));
    base = lines
      .filter((l) => scopedProductIds.has(l.productId))
      .reduce((sum, l) => sum + l.lineTotal, 0);

    if (base === 0) {
      return {
        discount: 0,
        freeShipping: false,
        error: "That code doesn't apply to anything in your cart.",
      };
    }
  }

  if (coupon.type === "free_shipping") {
    return { coupon, discount: 0, freeShipping: true };
  }

  const discount =
    coupon.type === "percent"
      ? Math.round((base * Math.min(100, coupon.value)) / 100)
      : Math.min(coupon.value, base);

  return { coupon, discount, freeShipping: false };
}
