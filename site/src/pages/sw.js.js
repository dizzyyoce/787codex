// Service worker: keeps a copy of the site so it works offline and opens fast.
// Pages and data: try the network first (so updates show), fall back to the saved copy.
// Styles, scripts and images: use the saved copy and refresh it in the background.
import { DATA, SECTIONS, url, buildUrl, mechUrl } from "../lib/data.js";

export function GET() {
  const version = Date.now().toString(36);
  const pages = [url(), ...SECTIONS.map((s) => url(s.path)), ...DATA.builds.map(buildUrl), ...DATA.mechanics.map(mechUrl),
    url("search.json"), url("logo.jpg"), url("icon-192.png"), url("manifest.webmanifest")];
  const js = `
const CACHE = "codex-${version}";
const PRECACHE = ${JSON.stringify(pages)};
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("codex-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const networkFirst = async (req) => {
  const cache = await caches.open(CACHE);
  try {
    // "no-cache" asks GitHub whether the page changed instead of reusing the browser's
    // 10-minute copy, so a new publish shows up straight away (an unchanged page is a tiny reply).
    const res = await fetch(req, { cache: "no-cache" });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: true })) || (await cache.match(${JSON.stringify(url())})) || Response.error();
  }
};
const savedFirst = async (req, e) => {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const update = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
  if (hit) { e.waitUntil(update); return hit; }
  return update;
};
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isData = req.mode === "navigate" || req.url.endsWith(".json");
  e.respondWith(isData ? networkFirst(req) : savedFirst(req, e));
});
`;
  return new Response(js, { headers: { "Content-Type": "text/javascript" } });
}
