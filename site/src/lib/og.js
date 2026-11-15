// Link-preview images (1200×630 PNG) for Discord, Reddit etc., made at build time.
import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const root = process.cwd();
const font = (pkg, file) => fs.readFileSync(path.join(root, "node_modules/@fontsource", pkg, "files", file));
const FONTS = [
  { name: "Barlow Condensed", data: font("barlow-condensed", "barlow-condensed-latin-700-normal.woff"), weight: 700, style: "normal" },
  { name: "Source Sans", data: font("source-sans-3", "source-sans-3-latin-400-normal.woff"), weight: 400, style: "normal" },
  { name: "Source Sans", data: font("source-sans-3", "source-sans-3-latin-700-normal.woff"), weight: 700, style: "normal" },
];
const LOGO = "data:image/jpeg;base64," + fs.readFileSync(path.join(root, "public/logo.jpg")).toString("base64");

const C = { bg: "#15161a", surface: "#1e2026", ink: "#ecebe8", muted: "#a3a5ad", line: "#30333b", accent: "#e09a52", chip: "#2a2c33" };
const STATUS = {
  "Current": ["#7fd3a4", "#18382a"], "Slight Nerf": ["#f0cf6e", "#3a3116"], "Partly Dead": ["#f3a36f", "#3d2416"],
  "Dead": ["#f19a9a", "#3d1d1f"], "Superseded": ["#b3b5bc", "#2b2d33"], "Unverified": ["#9cc3f2", "#1b2b40"],
};

const h = (type, style, children) => ({ type, props: { style, children } });
const chip = (text, fg = C.ink, bg = C.chip) =>
  h("div", { display: "flex", padding: "6px 16px", borderRadius: 999, background: bg, color: fg, fontSize: 26, fontWeight: 700 }, text);
const clip = (s, n) => (s && s.length > n ? s.slice(0, s.lastIndexOf(" ", n)) + "…" : s || "");

/** { kicker, title, subtitle?, chips?: [{text, status?}], body? } -> PNG bytes */
export async function ogImage({ kicker, title, subtitle, chips = [], body }) {
  const tree = h("div", { width: 1200, height: 630, display: "flex", background: C.bg, fontFamily: "Source Sans", color: C.ink }, [
    h("div", { width: 14, height: "100%", background: C.accent }),
    h("div", { flex: 1, display: "flex", flexDirection: "column", padding: "52px 60px 48px 56px" }, [
      h("div", { display: "flex", alignItems: "center", justifyContent: "space-between" }, [
        h("div", { display: "flex", flexDirection: "column" }, [
          h("div", { fontFamily: "Barlow Condensed", fontSize: 34, color: C.ink, letterSpacing: 1 }, "787prada Codex"),
          h("div", { fontSize: 24, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginTop: 4 }, kicker),
        ]),
        { type: "img", props: { src: LOGO, width: 120, height: 96, style: { borderRadius: 12 } } },
      ]),
      h("div", { display: "flex", flexDirection: "column", marginTop: 30, flex: 1 }, [
        h("div", { fontFamily: "Barlow Condensed", fontSize: title.length > 40 ? 64 : 78, lineHeight: 1.05 }, clip(title, 80)),
        subtitle ? h("div", { fontSize: 32, color: C.muted, marginTop: 8 }, clip(subtitle, 70)) : null,
        chips.length ? h("div", { display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" },
          chips.map((c) => (c.status && STATUS[c.status] ? chip(c.text, ...STATUS[c.status]) : chip(c.text)))) : null,
        body ? h("div", { fontSize: 30, color: C.ink, marginTop: 26, lineHeight: 1.3 }, clip(body, 150)) : null,
      ].filter(Boolean)),
    ]),
  ]);
  const svg = await satori(tree, { width: 1200, height: 630, fonts: FONTS });
  return new Resvg(svg).render().asPng();
}

export const pngResponse = (png) => new Response(png, { headers: { "Content-Type": "image/png" } });
