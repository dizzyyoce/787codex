// Lets the site be installed as an app ("Add to Home Screen" / "Install").
import { url } from "../lib/data.js";

export function GET() {
  return new Response(JSON.stringify({
    name: "787prada Codex",
    short_name: "787 Codex",
    description: "Builds, mechanics and strategy from 787prada's PoE2 videos.",
    start_url: url(),
    scope: url(),
    display: "standalone",
    background_color: "#15161a",
    theme_color: "#15161a",
    icons: [
      { src: url("icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: url("icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  }), { headers: { "Content-Type": "application/manifest+json" } });
}
