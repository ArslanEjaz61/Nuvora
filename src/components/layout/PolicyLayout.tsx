export function PolicyLayout({
  title,
  lastUpdated,
  disclaimer,
  children,
}: {
  title: string;
  lastUpdated: string;
  disclaimer?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <h1 className="font-display text-3xl text-ink-900 md:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-ink-500">Last updated: {lastUpdated}</p>

      {disclaimer && (
        <div className="mt-6 rounded-card border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-gold-800">
          {disclaimer}
        </div>
      )}

      <div className="policy-prose mt-8 space-y-6 text-sm leading-relaxed text-ink-700">
        {children}
      </div>
    </div>
  );
}

export function PolicySection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-lg text-ink-900">{heading}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
