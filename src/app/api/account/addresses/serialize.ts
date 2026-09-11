import { z } from "zod";
import { addressSchema } from "@/lib/validation";
import type { IAddress } from "@/models/User";

export const addressBodySchema = addressSchema.extend({
  isDefaultShipping: z.boolean().optional().default(false),
  isDefaultBilling: z.boolean().optional().default(false),
});

export const addressPatchSchema = addressSchema.partial().extend({
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
});

export function serializeAddresses(addresses: IAddress[]) {
  return addresses.map((a) => ({
    id: String(a._id),
    label: a.label ?? "",
    fullName: a.fullName,
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    country: a.country,
    phone: a.phone ?? "",
    isDefaultShipping: Boolean(a.isDefaultShipping),
    isDefaultBilling: Boolean(a.isDefaultBilling),
  }));
}
