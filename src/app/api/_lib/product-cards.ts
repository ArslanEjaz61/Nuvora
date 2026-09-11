import "server-only";
import { ProductVariant, type IProductVariant } from "@/models/ProductVariant";
import type { IProduct } from "@/models/Product";
import type { ProductCardData } from "@/types";

/**
 * Attaches the buyable variant to each card in one extra query, so a grid can
 * add to cart without a round trip to the product page.
 */
export async function toProductCards(products: IProduct[]): Promise<ProductCardData[]> {
  if (products.length === 0) return [];

  const variants = await ProductVariant.find({
    productId: { $in: products.map((p) => p._id) },
    active: true,
  })
    .select("productId price compareAtPrice inventoryQuantity inventoryPolicy position")
    .sort({ position: 1, _id: 1 })
    .lean<IProductVariant[]>();

  const byProduct = new Map<string, IProductVariant[]>();
  for (const variant of variants) {
    const key = String(variant.productId);
    const list = byProduct.get(key);
    if (list) list.push(variant);
    else byProduct.set(key, [variant]);
  }

  return products.map((product) => {
    const productVariants = byProduct.get(String(product._id)) ?? [];
    const inStockVariant = productVariants.find(
      (v) => v.inventoryPolicy === "continue" || v.inventoryQuantity > 0
    );
    const defaultVariant = inStockVariant ?? productVariants[0];

    const price = defaultVariant?.price ?? product.price;
    const compareAtPrice = defaultVariant?.compareAtPrice ?? product.compareAtPrice;

    return {
      _id: String(product._id),
      title: product.title,
      slug: product.slug,
      price,
      compareAtPrice: compareAtPrice && compareAtPrice > price ? compareAtPrice : undefined,
      image: product.images?.[0]?.url,
      secondaryImage: product.images?.[1]?.url,
      rating: product.rating ?? { average: 0, count: 0 },
      inStock: Boolean(inStockVariant),
      defaultVariantId: defaultVariant ? String(defaultVariant._id) : undefined,
      badge:
        compareAtPrice && compareAtPrice > price
          ? "Sale"
          : product.featured
            ? "Featured"
            : undefined,
    };
  });
}

export const PRODUCT_CARD_FIELDS =
  "title slug price compareAtPrice images rating featured tags status soldCount createdAt";
