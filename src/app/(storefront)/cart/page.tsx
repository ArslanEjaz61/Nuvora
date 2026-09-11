import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart/CartPageContent";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the items in your Nuvora cart before checking out.",
  robots: { index: false },
};

export default function CartPage() {
  return <CartPageContent />;
}
