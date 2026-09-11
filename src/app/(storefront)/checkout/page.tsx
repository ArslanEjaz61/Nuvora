import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getCurrentUser } from "@/lib/auth";
import { serialize } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Nuvora order.",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  return (
    <CheckoutForm
      defaultEmail={user?.email ?? ""}
      savedAddresses={serialize(
        (user?.addresses ?? []).map((address) => ({
          _id: String(address._id),
          label: address.label,
          fullName: address.fullName,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone,
          isDefaultShipping: address.isDefaultShipping,
        }))
      )}
    />
  );
}
