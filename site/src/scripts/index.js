// Loads /search.json once and shares it between the search palette and hover cards.
let promise;
export const base = () => document.body.dataset.base || "/";
export function loadIndex() {
  promise ??= fetch(base() + "search.json").then((r) => r.json()).then((items) => {
    const byKey = Object.fromEntries(items.map((it) => [it.k, it]));
    for (const it of items) {
      it._t = it.title.toLowerCase();
      it._x = (it.text || "").toLowerCase();
    }
    return { items, byKey };
  });
  return promise;
}
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const statusClass = (s) => "s-" + String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
