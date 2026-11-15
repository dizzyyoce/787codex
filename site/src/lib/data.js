import data from "../data/codex.json";

export const DATA = data;
export const V = Object.fromEntries(data.videos.map((v) => [v.id, v]));
export const B = Object.fromEntries(data.builds.map((b) => [b.id, b]));
export const M = Object.fromEntries(data.mechanics.map((m) => [m.id, m]));

const BASE = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + "/";
/** Link to a page on this site, e.g. url("builds/") */
export const url = (p = "") => BASE + p.replace(/^\//, "");

export const buildUrl = (b) => url(`builds/${b.slug}/`);
export const mechUrl = (m) => url(`mechanics/${m.slug}/`);

export const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
export const statusClass = (s) => "s-" + slug(s);
export const fmtDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

export const newestVideos = (n = 3) => data.videos.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);

export const SECTIONS = [
  { key: "builds", label: "Builds", path: "builds/", count: data.builds.length },
  { key: "mechanics", label: "Mechanics", path: "mechanics/", count: data.mechanics.length },
  { key: "changes", label: "Patch changes", path: "patch-changes/", count: data.changes.length },
  { key: "toc", label: "Trial of Chaos", path: "trial-of-chaos/", count: data.toc.length },
  { key: "mindset", label: "Mindset", path: "mindset/", count: data.mindset.length },
  { key: "videos", label: "Videos", path: "videos/", count: data.videos.length },
];

/** First sentence or so of a long text, for previews. */
export const short = (s, n = 180) => {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
};

// --- mechanic names inside text become links -------------------------------------
// Multi-word names match any capitalisation; single words ("Ward") must match exactly.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const seenText = new Set();
const PHRASES = data.linkPhrases.filter((p) => {
  const k = p.text.includes(" ") ? p.text.toLowerCase() : p.text;
  if (seenText.has(k)) return false;
  seenText.add(k);
  return true;
}).map((p) => ({
  ...p,
  re: new RegExp(`(?<![\\w'-])${esc(p.text)}(?![\\w-])`, p.text.includes(" ") ? "gi" : "g"),
}));

/**
 * Split text into pieces: { t } plain text or { t, id } a mechanic link.
 * Each mechanic is linked once per text; `exclude` skips the page's own mechanic.
 */
export function linkify(text, exclude) {
  text = String(text || "");
  const hits = [];
  const usedIds = new Set();
  for (const p of PHRASES) {
    if (p.id === exclude || usedIds.has(p.id)) continue;
    p.re.lastIndex = 0;
    let m;
    while ((m = p.re.exec(text))) {
      const s = m.index, e = s + m[0].length;
      if (!hits.some((h) => s < h.e && e > h.s)) { hits.push({ s, e, id: p.id }); usedIds.add(p.id); break; }
    }
  }
  hits.sort((a, b) => a.s - b.s);
  const out = [];
  let i = 0;
  for (const h of hits) {
    if (h.s > i) out.push({ t: text.slice(i, h.s) });
    out.push({ t: text.slice(h.s, h.e), id: h.id });
    i = h.e;
  }
  if (i < text.length) out.push({ t: text.slice(i) });
  return out;
}

// --- related builds ----------------------------------------------------------------
// Other builds that share mechanics (strongest signal), ascendancy or class with this one.
// Other versions of the same build and superseded builds are left out.
export function relatedBuilds(b, n = 4) {
  const short = (m) => m.name.split(/ as | lets | plus |:| \(| — /)[0];
  return data.builds
    .filter((o) => o.id !== b.id && o.name !== b.name && o.status !== "Superseded")
    .map((o) => {
      const shared = o.mechIds.filter((id) => b.mechIds.includes(id));
      const sameAsc = o.asc === b.asc, sameCls = o.cls === b.cls;
      const score = shared.length * 3 + (sameAsc ? 2 : 0) + (sameCls ? 1 : 0) + (o.status === "Current" ? 0.5 : 0);
      const why = [
        shared.length ? "Shares " + shared.map((id) => b.mechParts.find((p) => p.id === id)?.text || short(M[id])).slice(0, 3).join(", ") : "",
        sameAsc ? "Also " + o.asc : sameCls ? "Also " + o.cls : "",
      ].filter(Boolean).join(" · ");
      return { o, score, why };
    })
    .filter((r) => r.score >= 2)
    .sort((x, y) => y.score - x.score)
    .slice(0, n);
}
