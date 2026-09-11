/**
 * Writes neutral SVG placeholders for the seeded catalogue so the storefront
 * renders before the client's photography is uploaded. Delete public/placeholders
 * once real images are in Cloudinary.
 */
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const OUT = resolve(process.cwd(), "public/placeholders");

const SWATCHES = {
  "living-room": ["#e8e3d9", "#cfc6b6"],
  "living-room-alt": ["#dcd5c8", "#bfb5a2"],
  bedroom: ["#e4e7e6", "#c7cecd"],
  "bedroom-alt": ["#d8dddc", "#b6c0bf"],
  dining: ["#ece5da", "#d3c6b3"],
  "dining-alt": ["#e0d7c9", "#c2b49e"],
  decor: ["#e7e4ea", "#cbc5d3"],
  "decor-alt": ["#ddd9e2", "#bcb4c7"],
  lighting: ["#f0ebe0", "#dbd0ba"],
  "lighting-alt": ["#e6dfd0", "#cdbfa6"],
  outdoor: ["#dfe7e0", "#bccbbe"],
  "outdoor-alt": ["#d3ddd4", "#adbfaf"],
};

function svg(from, to, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#g)"/>
  <circle cx="600" cy="540" r="150" fill="none" stroke="#0e4f4a" stroke-opacity="0.18" stroke-width="3"/>
  <path d="M470 690h260M510 745h180" stroke="#0e4f4a" stroke-opacity="0.14" stroke-width="3" stroke-linecap="round"/>
  <text x="600" y="905" font-family="Georgia, serif" font-size="40" fill="#0e4f4a" fill-opacity="0.42" text-anchor="middle">Nuvora</text>
  <text x="600" y="955" font-family="system-ui, sans-serif" font-size="22" fill="#0e4f4a" fill-opacity="0.3" text-anchor="middle">image coming soon</text>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });

for (const [name, [from, to]] of Object.entries(SWATCHES)) {
  const label = name.replace(/-/g, " ");
  writeFileSync(resolve(OUT, `${name}.svg`), svg(from, to, label));
}

console.log(`Wrote ${Object.keys(SWATCHES).length} placeholders to public/placeholders`);
