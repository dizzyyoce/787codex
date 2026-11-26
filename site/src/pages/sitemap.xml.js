// List of every page for Google and other search engines: /sitemap.xml
import { DATA, SECTIONS, url, buildUrl, mechUrl, mindUrl } from "../lib/data.js";

export function GET({ site }) {
  const abs = (p) => new URL(p, site).href;
  const videoDate = (id) => (id && DATA.videos.find((v) => v.id === id)?.date) || DATA.updated;
  const pages = [
    { loc: url(), lastmod: DATA.updated, priority: "1.0" },
    ...SECTIONS.map((s) => ({ loc: url(s.path), lastmod: DATA.updated, priority: "0.8" })),
    ...DATA.builds.map((b) => ({ loc: buildUrl(b), lastmod: videoDate(b.video), priority: b.status === "Superseded" ? "0.4" : "0.9" })),
    ...DATA.mechanics.map((m) => ({ loc: mechUrl(m), lastmod: videoDate(m.video), priority: "0.7" })),
    ...DATA.mindset.map((p) => ({ loc: mindUrl(p), lastmod: videoDate(p.video), priority: "0.6" })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${abs(p.loc)}</loc><lastmod>${p.lastmod}</lastmod><priority>${p.priority}</priority></url>`).join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
