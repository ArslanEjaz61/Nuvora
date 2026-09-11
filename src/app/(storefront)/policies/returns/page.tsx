import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout, PolicySection } from "@/components/layout/PolicyLayout";

export const metadata: Metadata = {
  title: "Returns Policy",
  description: "How returns and exchanges work at Nuvora.",
};

export default function ReturnsPolicyPage() {
  return (
    <PolicyLayout title="Returns Policy" lastUpdated="September 11, 2026">
      <PolicySection heading="30-day returns">
        <p>
          If something isn&apos;t right, you can return it within 30 days of delivery for a
          refund. Items must be unused, in their original packaging, and in resalable
          condition.
        </p>
      </PolicySection>

      <PolicySection heading="How to start a return">
        <p>
          Reach out through our{" "}
          <Link href="/contact" className="text-teal-800 underline-offset-4 hover:underline">
            contact page
          </Link>{" "}
          with your order number and the item you&apos;d like to return. We&apos;ll confirm
          eligibility and send return instructions.
        </p>
      </PolicySection>

      <PolicySection heading="Refunds">
        <p>
          Once we receive and inspect your return, we&apos;ll process your refund to the original
          payment method. Refunds typically appear within 5–10 business days, depending on your
          bank or card issuer.
        </p>
      </PolicySection>

      <PolicySection heading="Damaged or incorrect items">
        <p>
          If an item arrives damaged or isn&apos;t what you ordered, contact us within 48 hours
          of delivery with photos of the issue. We&apos;ll arrange a replacement or refund at no
          cost to you.
        </p>
      </PolicySection>

      <PolicySection heading="What can't be returned">
        <p>
          Custom or made-to-order items, and items marked final sale at time of purchase, are not
          eligible for return unless they arrive damaged or defective.
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
