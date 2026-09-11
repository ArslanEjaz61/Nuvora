export interface CartLine {
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
  inStock: boolean;
  maxQuantity: number;
}

export interface CartSummary {
  lines: CartLine[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  itemCount: number;
  coupon: { code: string; description?: string } | null;
  couponError?: string;
}

export interface ProductCardData {
  _id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  secondaryImage?: string;
  rating: { average: number; count: number };
  inStock: boolean;
  defaultVariantId?: string;
  badge?: string;
}

export interface NavCollection {
  _id: string;
  title: string;
  slug: string;
  children?: NavCollection[];
}
