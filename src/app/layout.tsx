import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nuvora — Furniture, Décor & More to Love Every Room",
    template: "%s | Nuvora",
  },
  description:
    "Curated collections for your home. Shop furniture, décor and home essentials at Nuvora, with free shipping on qualifying orders and easy returns.",
  keywords: ["furniture", "home décor", "home goods", "living room", "bedroom", "Nuvora"],
  openGraph: {
    type: "website",
    siteName: "Nuvora",
    title: "Nuvora — Furniture, Décor & More to Love Every Room",
    description: "Curated collections for your home. Furniture, décor and home essentials.",
    url: siteUrl,
    images: [{ url: "/brand/hero-1.jpg", width: 1376, height: 453, alt: "Nuvora" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nuvora — Furniture, Décor & More to Love Every Room",
    description: "Curated collections for your home. Furniture, décor and home essentials.",
    images: ["/brand/hero-1.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>{children}</body>
    </html>
  );
}
