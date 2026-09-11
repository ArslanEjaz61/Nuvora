import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200)
    .regex(/[a-z]/, "Include a lowercase letter")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/\d/, "Include a number"),
  marketingOptIn: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(200),
});

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  line1: z.string().trim().min(1, "Address is required").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(100),
  postalCode: z.string().trim().min(3, "Postal code is required").max(20),
  country: z.string().trim().length(2).default("US"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

export const cartItemSchema = z.object({
  productId: objectId,
  variantId: objectId,
  quantity: z.number().int().min(1).max(99),
});

export const updateCartItemSchema = z.object({
  variantId: objectId,
  quantity: z.number().int().min(0).max(99),
});

export const couponSchema = z.object({
  code: z.string().trim().min(1).max(40),
});

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  billingSameAsShipping: z.boolean().default(true),
  customerNote: z.string().trim().max(500).optional().or(z.literal("")),
});

export const reviewSchema = z.object({
  productId: objectId,
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().min(10, "Tell us a little more").max(2000),
  authorName: z.string().trim().min(1, "Name is required").max(80),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  orderNumber: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().min(1, "Subject is required").max(160),
  message: z.string().trim().min(10, "Tell us a little more").max(3000),
});

export const productInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(20000).default(""),
  shortDescription: z.string().max(400).optional().or(z.literal("")),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  collections: z.array(objectId).default([]),
  tags: z.array(z.string().trim().max(40)).default([]),
  brand: z.string().trim().max(100).optional().or(z.literal("")),
  material: z.string().trim().max(100).optional().or(z.literal("")),
  featured: z.boolean().default(false),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        publicId: z.string().optional(),
        alt: z.string().max(200).optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      })
    )
    .default([]),
  options: z
    .array(z.object({ name: z.string().trim().min(1), values: z.array(z.string().trim()) }))
    .default([]),
  seo: z
    .object({ title: z.string().max(200).optional(), description: z.string().max(400).optional() })
    .optional(),
});

export const variantInputSchema = z.object({
  productId: objectId,
  sku: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(200),
  options: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  inventoryQuantity: z.number().int().min(0).default(0),
  inventoryPolicy: z.enum(["deny", "continue"]).default("deny"),
  lowStockThreshold: z.number().int().min(0).default(5),
  active: z.boolean().default(true),
  image: z
    .object({ url: z.string().url(), publicId: z.string().optional(), alt: z.string().optional() })
    .optional(),
});

export const collectionInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(5000).default(""),
  image: z
    .object({ url: z.string().url(), publicId: z.string().optional(), alt: z.string().optional() })
    .optional(),
  parent: objectId.nullable().optional(),
  sortOrder: z.number().int().default(0),
  featured: z.boolean().default(false),
  showInNav: z.boolean().default(true),
  status: z.enum(["active", "hidden"]).default("active"),
});

export const couponInputSchema = z
  .object({
    code: z.string().trim().min(3).max(40),
    description: z.string().max(200).optional().or(z.literal("")),
    type: z.enum(["percent", "fixed", "free_shipping"]),
    value: z.number().min(0),
    minSubtotal: z.number().int().min(0).default(0),
    maxRedemptions: z.number().int().min(1).nullable().optional(),
    perCustomerLimit: z.number().int().min(0).default(0),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    active: z.boolean().default(true),
  })
  .refine((data) => data.type !== "percent" || data.value <= 100, {
    message: "A percentage discount can't exceed 100",
    path: ["value"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
