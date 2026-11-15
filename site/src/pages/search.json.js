// The search and hover-card index, built once per deploy: /search.json
import { DATA, V, buildUrl, mechUrl, url } from "../lib/data.js";

const vid = (id) => (id && V[id] ? V[id].url : undefined);

export function GET() {
  const items = [];
  for (const b of DATA.builds) {
    items.push({
      k: "b:" + b.id, type: "Build", title: b.name + (b.version ? ` (${b.version})` : ""), url: buildUrl(b),
      sub: [b.cls, b.asc, "Patch " + b.patch].join(" · "), status: b.status, skills: b.skills,
      body: b.tech, video: vid(b.video), ninja: b.ninja || undefined,
      text: [b.name, b.version, b.nick, b.cls, b.asc, b.skills, b.tech, b.mech].filter(Boolean).join(" "),
    });
  }
  for (const m of DATA.mechanics) {
    items.push({
      k: "m:" + m.id, type: m.type === "Engine" ? "Mechanic · Engine" : "Mechanic · Tip", title: m.name, url: mechUrl(m),
      sub: m.patch ? "Patch " + m.patch : "", body: m.desc, video: vid(m.video), text: [m.name, m.desc, m.notes].filter(Boolean).join(" "),
    });
  }
  DATA.changes.forEach((c, i) => items.push({
    k: "c:" + i, type: "Patch change", title: c.item, url: url(`patch-changes/#c${i + 1}`), sub: "Patch " + c.patch,
    body: c.what, video: vid(c.video), text: [c.item, c.what, c.affects].filter(Boolean).join(" "),
  }));
  DATA.toc.forEach((t, i) => items.push({
    k: "t:" + i, type: "Trial of Chaos", title: t.topic, url: url(`trial-of-chaos/#t${i + 1}`), sub: t.section,
    body: t.note, video: vid(t.video), text: [t.section, t.topic, t.note].filter(Boolean).join(" "),
  }));
  DATA.mindset.forEach((p, i) => items.push({
    k: "p:" + i, type: "Mindset", title: p.title, url: url(`mindset/#p${i + 1}`), sub: p.cat,
    body: p.text, video: vid(p.video), text: [p.cat, p.title, p.text].filter(Boolean).join(" "),
  }));
  for (const v of DATA.videos) {
    items.push({ k: "v:" + v.id, type: "Video", title: v.title, url: v.url, external: true,
      sub: [v.date, v.type, v.patch].filter(Boolean).join(" · "), text: [v.title, v.type, v.id].join(" ") });
  }
  return new Response(JSON.stringify(items), { headers: { "Content-Type": "application/json" } });
}
