import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, PackageSearch, RotateCcw } from "lucide-react";
import { ContactForm } from "@/components/account/ContactForm";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Questions about a piece, an order or a return? Write to the Nuvora team at support@nuvora.com — we reply within 1 business day.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="container-page py-10 md:py-14">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl text-ink-900 md:text-4xl">Get in touch</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600 md:text-base">
          Whether you&rsquo;re weighing up two finishes, checking whether a table will fit, or
          following up on a delivery, we&rsquo;re happy to help. Send us the details and
          we&rsquo;ll come back to you with a real answer.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2 className="font-display text-lg text-ink-900">Send us a message</h2>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>

        <aside className="space-y-8">
          <div className="rounded-card border border-ink-200 bg-ink-50 p-6">
            <h2 className="font-display text-lg text-ink-900">Reach us directly</h2>

            <div className="mt-5 space-y-5">
              <div className="flex gap-3">
                <Mail size={18} className="mt-0.5 shrink-0 text-teal-800" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-ink-900">Email</p>
                  <a
                    href="mailto:support@nuvora.com"
                    className="text-sm text-teal-800 underline underline-offset-4 hover:text-teal-900"
                  >
                    support@nuvora.com
                  </a>
                </div>
              </div>

              <div className="flex gap-3">
                <Clock size={18} className="mt-0.5 shrink-0 text-teal-800" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-ink-900">Response time</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
                    We reply within 1 business day. Messages sent over the weekend are answered on
                    the next working day.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-lg text-ink-900">Answers you might need now</h2>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/orders/track"
                  className="group flex gap-3 rounded-card border border-ink-200 p-4 transition-colors hover:border-teal-700"
                >
                  <PackageSearch size={18} className="mt-0.5 shrink-0 text-teal-800" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium text-ink-900 group-hover:text-teal-900">
                      Where is my order?
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                      Track it with your order number and email.
                    </span>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/policies/returns"
                  className="group flex gap-3 rounded-card border border-ink-200 p-4 transition-colors hover:border-teal-700"
                >
                  <RotateCcw size={18} className="mt-0.5 shrink-0 text-teal-800" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium text-ink-900 group-hover:text-teal-900">
                      I&rsquo;d like to return something
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                      30 days, unused and in its original packaging.
                    </span>
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
