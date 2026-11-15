// Preview cards for links marked data-hc="b:B33" / "m:M01" (only on devices with a mouse).
import { loadIndex, esc, statusClass } from "./index.js";

const card = document.getElementById("hovercard");
let timer = null;
let current = null;

if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.addEventListener("mouseover", (e) => {
    const a = e.target.closest("[data-hc]");
    if (!a || a === current) return;
    current = a;
    clearTimeout(timer);
    timer = setTimeout(() => show(a), 250);
  });
  document.addEventListener("mouseout", (e) => {
    const a = e.target.closest("[data-hc]");
    if (!a || a.contains(e.relatedTarget)) return;
    current = null;
    clearTimeout(timer);
    card.hidden = true;
  });
  window.addEventListener("scroll", () => { card.hidden = true; current = null; }, { passive: true });
}

async function show(a) {
  const { byKey } = await loadIndex();
  const it = byKey[a.dataset.hc];
  if (!it || current !== a) return;
  card.innerHTML = `
    <div class="ptype">${esc(it.type)}</div>
    <div class="hc-title">${esc(it.title)}</div>
    <div class="meta">${it.status ? `<span class="pill ${statusClass(it.status)}">${esc(it.status)}</span>` : ""}<span class="small">${esc(it.sub || "")}</span></div>
    ${it.skills ? `<div class="skills">${esc(it.skills)}</div>` : ""}
    ${it.body ? `<p class="text">${esc(it.body)}</p>` : ""}`;
  card.hidden = false;
  const r = a.getBoundingClientRect();
  const w = card.offsetWidth, h = card.offsetHeight;
  let left = Math.min(Math.max(8, r.left), innerWidth - w - 8);
  let top = r.bottom + 8;
  if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 8);
  card.style.left = left + "px";
  card.style.top = top + "px";
}
