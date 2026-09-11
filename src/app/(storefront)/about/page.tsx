import type { Metadata } from "next";
import Image from "next/image";
import { Compass, PackageCheck, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About Nuvora",
  description:
    "Nuvora curates furniture, décor and home essentials worth living with — pieces chosen for how they feel in a real room, not just how they look in a photo.",
  alternates: { canonical: "/about" },
};

const principles = [
  {
    icon: Compass,
    title: "Curated, not endless",
    body: "We would rather show you twelve chairs worth sitting in than a thousand you have to wade through. Every piece earns its spot in the catalogue.",
  },
  {
    icon: Sparkles,
    title: "Built to live with",
    body: "Materials, finish and proportion come first. We look for pieces that still read well after a few years of dinners, guests and rearranged rooms.",
  },
  {
    icon: PackageCheck,
    title: "Straightforward to buy",
    body: "Clear pricing, honest stock levels, free shipping over $99 and 30 days to change your mind. No games in the final step of checkout.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-teal-900">
        <Image
          src="/brand/hero-1.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="container-page relative py-16 md:py-24">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
            your style. your home.
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl leading-tight text-white md:text-5xl">
            Find it all at Nuvora
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-teal-100 md:text-base">
            Furniture, décor, and more to love every room.
          </p>
        </div>
      </section>

      <section className="container-page py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl text-ink-900 md:text-3xl">
              A shop for rooms people actually use
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-600 md:text-base">
              <p>
                Nuvora is a home store built around a simple idea: the things you live with
                should be easy to choose and easy to love. We bring together furniture, décor and
                everyday essentials — sofas and dining tables, lamps and mirrors, rugs, cushions,
                storage and the small pieces that finish a room — so you can shop a whole space in
                one place instead of piecing it together across a dozen tabs.
              </p>
              <p>
                Our buying is deliberately narrow. Rather than list everything a supplier offers,
                we pick the versions we would put in our own homes and explain why: what it&rsquo;s
                made of, how big it really is, how it wears. Where a piece comes in more than one
                finish or size, we show the options up front so you can decide without guessing.
              </p>
              <p>
                Rooms rarely come together in a single order, and that&rsquo;s fine. Collections
                are organised by space — living, bedroom, dining, workspace, outdoor — so you can
                start with the piece you need now and come back for the rest. Save what
                you&rsquo;re considering to a wishlist, and it will still be there when you are
                ready.
              </p>
            </div>
          </div>

          <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-ink-100 lg:aspect-auto lg:min-h-[28rem]">
            <Image
              src="/brand/hero-1.jpg"
              alt="A Nuvora room setting"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-ink-200 bg-ink-50">
        <div className="container-page py-12 md:py-16">
          <h2 className="font-display text-2xl text-ink-900 md:text-3xl">What we care about</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
            {principles.map((principle) => {
              const Icon = principle.icon;
              return (
                <div key={principle.title}>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-teal-900 text-white">
                    <Icon size={19} aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-lg text-ink-900">{principle.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{principle.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-12 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl text-ink-900 md:text-3xl">Shopping with us</h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-600 md:text-base">
            <p>
              Checkout is handled by Stripe, so your card details go straight to them and never
              touch our servers. Orders over $99 ship free; anything below that is a flat
              $14.95. Once your parcel leaves the warehouse you&rsquo;ll get a tracking link, and
              you can check on it any time from your account or the order tracking page.
            </p>
            <p>
              If something isn&rsquo;t right, you have 30 days to send it back unused and in its
              original packaging. And if you&rsquo;re stuck between two finishes or unsure whether
              a piece will fit, write to us — we reply within one business day and would much
              rather help you get it right the first time.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/collections" size="lg">
              Shop the collections
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline" size="lg">
              Get in touch
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
