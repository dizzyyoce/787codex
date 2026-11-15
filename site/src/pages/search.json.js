// The search and hover-card index, built once per deploy: /search.json
import { DATA, M, buildUrl, mechUrl, url, short } from "../lib/data.js";

export function GET() {
  const items = [];
  for (const b of DATA.builds) {
    items.push({
      k: "b:" + b.id, type: "Build", title: b.name + (b.version ? ` (${b.version})` : ""), url: buildUrl(b),
      sub: [b.cls, b.asc, "Patch " + b.patch].join(" · "), status: b.status, skills: b.skills,
      body: short(b.tech, 220),
      text: [b.name, b.version, b.nick, b.cls, b.asc, b.skills, b.tech, b.mech].filter(Boolean).join(" "),
    });
  }
  for (const m of DATA.mechanics) {
    items.push({
      k: "m:" + m.id, type: m.type === "Engine" ? "Mechanic · Engine" : "Mechanic · Tip", title: m.name, url: mechUrl(m),
      sub: m.patch ? "Patch " + m.patch : "", body: short(m.desc, 220), text: [m.name, m.desc, m.notes].filter(Boolean).join(" "),
    });
  }
  DATA.changes.forEach((c, i) => items.push({
    k: "c:" + i, type: "Patch change", title: c.item, url: url(`patch-changes/#c${i + 1}`), sub: "Patch " + c.patch,
    body: short(c.what, 220), text: [c.item, c.what, c.affects].filter(Boolean).join(" "),
  }));
  DATA.toc.forEach((t, i) => items.push({
    k: "t:" + i, type: "Trial of Chaos", title: t.topic, url: url(`trial-of-chaos/#t${i + 1}`), sub: t.section,
    body: short(t.note, 220), text: [t.section, t.topic, t.note].filter(Boolean).join(" "),
  }));
  DATA.mindset.forEach((p, i) => items.push({
    k: "p:" + i, type: "Mindset", title: p.title, url: url(`mindset/#p${i + 1}`), sub: p.cat,
    body: short(p.text, 220), text: [p.cat, p.title, p.text].filter(Boolean).join(" "),
  }));
  for (const v of DATA.videos) {
    items.push({ k: "v:" + v.id, type: "Video", title: v.title, url: v.url, external: true,
      sub: [v.date, v.type, v.patch].filter(Boolean).join(" · "), text: [v.title, v.type, v.id].join(" ") });
  }
  return new Response(JSON.stringify(items), { headers: { "Content-Type": "application/json" } });
}
