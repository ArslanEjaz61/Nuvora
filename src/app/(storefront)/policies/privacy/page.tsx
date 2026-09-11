import type { Metadata } from "next";
import { PolicyLayout, PolicySection } from "@/components/layout/PolicyLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Nuvora collects, uses and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      lastUpdated="September 11, 2026"
      disclaimer="This is a template and should be reviewed by legal counsel before launch."
    >
      <PolicySection heading="What we collect">
        <p>
          When you create an account, place an order, or contact us, we collect information like
          your name, email, shipping and billing address, and order details. We use cookies to
          keep your cart and session working as you browse.
        </p>
      </PolicySection>

      <PolicySection heading="Payment information">
        <p>
          Card payments are handled entirely by Stripe. We never receive or store your full card
          number, expiry date or CVC — that information goes directly to Stripe&apos;s secure
          systems.
        </p>
      </PolicySection>

      <PolicySection heading="How we use your information">
        <p>
          We use your information to process orders, provide customer support, and — if you opt
          in — send you updates about new products and offers. We don&apos;t sell your personal
          information to third parties.
        </p>
      </PolicySection>

      <PolicySection heading="Cookies">
        <p>
          We use essential cookies to keep your cart, login session, and checkout working. These
          are necessary for the site to function and can&apos;t be disabled without affecting
          your shopping experience.
        </p>
      </PolicySection>

      <PolicySection heading="Your choices">
        <p>
          You can update your account details, review your order history, and unsubscribe from
          marketing emails at any time from your account settings or the link in any marketing
          email. To request deletion of your account data, contact us directly.
        </p>
      </PolicySection>

      <PolicySection heading="Contact">
        <p>Questions about this policy can be sent through our contact page.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
