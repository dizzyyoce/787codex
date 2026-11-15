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
