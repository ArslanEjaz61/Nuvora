import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { findCart } from "@/lib/cart";
import { priceCart } from "@/lib/pricing";
import { cartItemSchema, updateCartItemSchema } from "@/lib/validation";
import { ProductVariant } from "@/models/ProductVariant";
import { Product } from "@/models/Product";
import { cartResponse, loadCartDoc } from "../_lib/cart-doc";
import { jsonError, parseWith, readJson, serverError } from "../_lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const cart = await findCart();
    // An absent cart is not an error — it is simply an empty cart.
    const priced = await priceCart(cart?.items ?? [], cart?.couponCode);
    return NextResponse.json({ cart: priced });
  } catch (err) {
    return serverError("cart:GET", err);
  }
}

export async function POST(req: Request) {
  try {
    const parsed = parseWith(cartItemSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;
    const { productId, variantId, quantity } = parsed.data;

    await connectDB();

    const [variant, product] = await Promise.all([
      ProductVariant.findOne({ _id: variantId, active: true }),
      Product.findOne({ _id: productId, status: "active" }).select("_id title"),
    ]);

    if (!variant || !product || String(variant.productId) !== String(product._id)) {
      return jsonError("That item is no longer available.", 404);
    }

    const backorderable = variant.inventoryPolicy === "continue";
    const available = backorderable ? 99 : Math.max(0, variant.inventoryQuantity);

    if (available <= 0) {
      return jsonError(`${product.title} is out of stock.`, 400);
    }

    const doc = await loadCartDoc();
    const existing = doc.items.find((item) => String(item.variantId) === String(variant._id));
    const desired = (existing?.quantity ?? 0) + quantity;

    if (desired > available) {
      return jsonError(
        available === (existing?.quantity ?? 0)
          ? `You already have every available unit of ${product.title} in your cart.`
          : `Only ${available} of ${product.title} ${available === 1 ? "is" : "are"} available.`,
        400
      );
    }

    if (existing) {
      existing.quantity = Math.min(99, desired);
    } else {
      doc.items.push({
        productId: new Types.ObjectId(productId),
        variantId: new Types.ObjectId(variantId),
        quantity: Math.min(99, desired),
        addedAt: new Date(),
      });
    }

    await doc.save();
    return cartResponse(doc);
  } catch (err) {
    return serverError("cart:POST", err);
  }
}

export async function PATCH(req: Request) {
  try {
    const parsed = parseWith(updateCartItemSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;
    const { variantId, quantity } = parsed.data;

    await connectDB();
    const doc = await loadCartDoc();
    const index = doc.items.findIndex((item) => String(item.variantId) === String(variantId));

    if (index === -1) return cartResponse(doc);

    if (quantity === 0) {
      doc.items.splice(index, 1);
      await doc.save();
      return cartResponse(doc);
    }

    const variant = await ProductVariant.findOne({ _id: variantId, active: true }).select(
      "inventoryQuantity inventoryPolicy"
    );

    if (!variant) {
      doc.items.splice(index, 1);
      await doc.save();
      return cartResponse(doc);
    }

    const available =
      variant.inventoryPolicy === "continue" ? 99 : Math.max(0, variant.inventoryQuantity);

    if (available <= 0) {
      doc.items.splice(index, 1);
      await doc.save();
      return cartResponse(doc);
    }

    doc.items[index].quantity = Math.min(99, Math.min(quantity, available));
    await doc.save();
    return cartResponse(doc);
  } catch (err) {
    return serverError("cart:PATCH", err);
  }
}

export async function DELETE() {
  try {
    await connectDB();
    const doc = await loadCartDoc();
    doc.items.splice(0, doc.items.length);
    doc.couponCode = null;
    await doc.save();
    return cartResponse(doc);
  } catch (err) {
    return serverError("cart:DELETE", err);
  }
}
