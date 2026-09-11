import type { Metadata } from "next";
import { SearchResults } from "@/components/product/SearchResults";

export const metadata: Metadata = {
  title: "Search",
  description: "Search furniture, décor and home essentials at Nuvora.",
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <>
      <header className="container-page pt-10">
        <h1 className="font-display text-3xl text-ink-900">
          {q ? <>Results for &ldquo;{q}&rdquo;</> : "Search"}
        </h1>
      </header>
      <SearchResults initialQuery={q ?? ""} />
    </>
  );
}
