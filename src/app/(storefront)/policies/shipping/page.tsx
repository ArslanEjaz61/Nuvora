import type { Metadata } from "next";
import { PolicyLayout, PolicySection } from "@/components/layout/PolicyLayout";
import { formatPrice } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_RATE } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "Shipping rates, timelines and coverage for Nuvora orders.",
};

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout title="Shipping Policy" lastUpdated="September 11, 2026">
      <PolicySection heading="Shipping rates">
        <p>
          Orders of {formatPrice(FREE_SHIPPING_THRESHOLD)} or more ship free. Orders below that
          amount are charged a flat {formatPrice(FLAT_SHIPPING_RATE)} shipping fee, calculated
          automatically at checkout.
        </p>
      </PolicySection>

      <PolicySection heading="Processing time">
        <p>
          Orders are typically processed within 1–2 business days of payment confirmation.
          You&apos;ll receive an email once your order ships, along with tracking information
          when a carrier and tracking number have been added.
        </p>
      </PolicySection>

      <PolicySection heading="Delivery estimates">
        <p>
          Delivery times vary by item and destination — larger furniture pieces generally take
          longer than smaller décor items. Estimated delivery windows are shown on each product
          page and again at checkout.
        </p>
      </PolicySection>

      <PolicySection heading="Where we ship">
        <p>
          We currently ship within the United States. If you need delivery outside the US,
          contact us before ordering and we&apos;ll let you know what&apos;s possible.
        </p>
      </PolicySection>

      <PolicySection heading="Order tracking">
        <p>
          Once your order ships, you can track it from your account&apos;s order history, or by
          using the order tracking page with your order number and email.
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
