// Loads /search.json once and shares it between the search palette and hover cards.
let promise;
export const base = () => document.body.dataset.base || "/";
export function loadIndex() {
  promise ??= fetch(base() + "search.json").then((r) => r.json()).then((items) => {
    const byKey = Object.fromEntries(items.map((it) => [it.k, it]));
    for (const it of items) {
      it._t = it.title.toLowerCase();
      it._x = (it.text || "").toLowerCase();
      it._tw = [...new Set(it._t.split(/[^a-z0-9']+/).filter((w) => w.length >= 3))];
      it._w = [...new Set((it._t + " " + it._x).split(/[^a-z0-9']+/).filter((w) => w.length >= 3))];
    }
    return { items, byKey };
  });
  return promise;
}
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const statusClass = (s) => "s-" + String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
