import type { Metadata } from "next";
import { PolicyLayout, PolicySection } from "@/components/layout/PolicyLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern use of the Nuvora website and purchases made through it.",
};

export default function TermsPage() {
  return (
    <PolicyLayout
      title="Terms of Service"
      lastUpdated="September 11, 2026"
      disclaimer="This is a template and should be reviewed by legal counsel before launch."
    >
      <PolicySection heading="Using this site">
        <p>
          By using nuvora.com, you agree to these terms. If you don&apos;t agree with them,
          please don&apos;t use the site. We may update these terms from time to time; continued
          use of the site after changes means you accept the updated terms.
        </p>
      </PolicySection>

      <PolicySection heading="Orders and payment">
        <p>
          When you place an order, you&apos;re making an offer to buy. We may decline or cancel
          an order — for example if an item is out of stock or pricing was displayed
          incorrectly. Payments are processed securely by Stripe; we never see or store your
          full card details.
        </p>
      </PolicySection>

      <PolicySection heading="Pricing">
        <p>
          Prices are shown in US dollars and may change without notice. The price charged is the
          one shown at checkout at the time you complete your order.
        </p>
      </PolicySection>

      <PolicySection heading="Accounts">
        <p>
          You&apos;re responsible for keeping your account credentials secure and for activity
          that happens under your account. Let us know right away if you suspect unauthorized
          access.
        </p>
      </PolicySection>

      <PolicySection heading="Product content">
        <p>
          We aim to describe products accurately, including images, materials and dimensions.
          Colors may vary slightly depending on your screen.
        </p>
      </PolicySection>

      <PolicySection heading="Limitation of liability">
        <p>
          Nuvora is provided on an &ldquo;as is&rdquo; basis. To the extent permitted by law, we
          are not liable for indirect or consequential damages arising from your use of the
          site.
        </p>
      </PolicySection>

      <PolicySection heading="Contact">
        <p>Questions about these terms can be sent through our contact page.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
