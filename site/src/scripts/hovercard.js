// Preview cards for links marked data-hc="b:B33" / "m:M01" (devices with a mouse only).
// - The card stays open while the mouse moves from the link onto it.
// - Press Alt or click the pin to keep it on screen. Pinned cards can be dragged by the
//   header, show the full text, and close with × or Esc (most recent first).
import { loadIndex, esc, statusClass } from "./index.js";

const card = document.getElementById("hovercard");
const pinned = [];
let link = null;       // the link the card belongs to
let item = null;       // the index entry shown in the card
let showTimer = null;
let hideTimer = null;
let z = 60;

const TAG_LABEL = { status: "Status", cls: "Class", asc: "Ascendancy", patch: "Patch" };
const STATUS_ORDER = ["Current", "Slight Nerf", "Unverified", "Partly Dead", "Dead", "Superseded"];

// "tag:cls:Mercenary" -> a card listing every build with that tag
function tagItem(key, items, a) {
  const rest = key.slice(4), i = rest.indexOf(":");
  const field = rest.slice(0, i), value = rest.slice(i + 1);
  const rank = (b) => { const r = STATUS_ORDER.indexOf(b.status); return r < 0 ? 99 : r; };
  const list = items.filter((it) => it.type === "Build" && String(it[field]) === value).sort((x, y) => rank(x) - rank(y));
  const detail = field === "cls" ? (b) => b.asc : field === "asc" ? (b) => "Patch " + b.patch : (b) => b.cls + " · " + b.asc;
  return {
    type: "Tag · " + TAG_LABEL[field], title: field === "patch" ? "Patch " + value : value,
    sub: (() => { const old = list.filter((b) => b.status === "Superseded").length;
      return `${list.length} build${list.length === 1 ? "" : "s"}${old && field !== "status" ? ` (${old} superseded)` : ""}`; })(), url: a.getAttribute("href"), urlLabel: "Show on Builds page →",
    list: list.map((b) => ({ title: b.title, url: b.url, status: b.status, detail: detail(b) })),
  };
}

function render(it, isPinned) {
  return `
    <div class="hc-head">
      <span class="ptype">${esc(it.type)}</span>
      <span class="hc-tools">
        ${isPinned
          ? `<button type="button" class="hc-btn" data-close title="Close (Esc)" aria-label="Close">×</button>`
          : `<button type="button" class="hc-btn" data-pin title="Pin (Alt)" aria-label="Pin this card">📌</button>`}
      </span>
    </div>
    <div class="hc-title">${esc(it.title)}</div>
    <div class="meta">${it.status ? `<span class="pill ${statusClass(it.status)}">${esc(it.status)}</span>` : ""}<span class="small">${esc(it.sub || "")}</span></div>
    ${it.skills ? `<div class="skills">${esc(it.skills)}</div>` : ""}
    ${it.body ? `<p class="text hc-body">${esc(it.body)}</p>` : ""}
    ${it.list ? `<ul class="hc-list">${it.list.map((b) => `<li><a href="${esc(b.url)}">${esc(b.title)}</a><span class="pill ${statusClass(b.status)}">${esc(b.status)}</span><span class="small">${esc(b.detail)}</span></li>`).join("")}</ul>` : ""}
    <div class="hc-links">
      ${it.url && !it.external ? `<a class="btn" href="${esc(it.url)}">${esc(it.urlLabel || "Open page →")}</a>` : ""}
      ${it.video ? `<a class="btn primary" href="${esc(it.video)}" target="_blank" rel="noopener">▶ Watch</a>` : ""}
      ${it.ninja ? `<a class="btn" href="${esc(it.ninja)}" target="_blank" rel="noopener">poe.ninja ↗</a>` : ""}
    </div>
    ${isPinned ? "" : `<div class="hc-hint">Press <kbd>Alt</kbd> or click 📌 to pin</div>`}`;
}

function place(el, r) {
  const w = el.offsetWidth, h = el.offsetHeight;
  const left = Math.min(Math.max(8, r.left), innerWidth - w - 8);
  let top = r.bottom + 6;
  if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
  el.style.left = left + "px";
  el.style.top = top + "px";
}

async function show(a) {
  const { items, byKey } = await loadIndex();
  const key = a.dataset.hc;
  const it = key.startsWith("tag:") ? tagItem(key, items, a) : byKey[key];
  if (!it || link !== a) return;
  item = it;
  card.innerHTML = render(it, false);
  card.hidden = false;
  card.style.zIndex = ++z; // above any pinned cards
  place(card, a.getBoundingClientRect());
}

function hide() {
  card.hidden = true;
  link = item = null;
}

const scheduleHide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 300); };
const cancelHide = () => clearTimeout(hideTimer);

function pin() {
  if (card.hidden || !item) return;
  const p = document.createElement("div");
  p.className = "hovercard pinned";
  p.setAttribute("role", "dialog");
  p.setAttribute("aria-label", item.title);
  p.innerHTML = render(item, true);
  p.style.zIndex = ++z;
  document.body.appendChild(p);
  // open where the floating card was, nudged so stacked pins don't hide each other
  const r = card.getBoundingClientRect();
  const offset = (pinned.length % 5) * 14;
  p.style.left = Math.min(r.left + offset, innerWidth - p.offsetWidth - 8) + "px";
  p.style.top = Math.min(Math.max(8, r.top + offset), Math.max(8, innerHeight - p.offsetHeight - 8)) + "px";
  pinned.push(p);
  hide();
}

function unpin(p) {
  pinned.splice(pinned.indexOf(p), 1);
  p.remove();
}

if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(".hovercard")) return;
    const a = e.target.closest("[data-hc]");
    if (!a) return;
    cancelHide();
    if (a === link && !card.hidden) return;
    link = a;
    clearTimeout(showTimer);
    showTimer = setTimeout(() => show(a), card.hidden ? 250 : 80);
  });
  document.addEventListener("mouseout", (e) => {
    const a = e.target.closest("[data-hc]");
    if (!a || a.contains(e.relatedTarget)) return;
    clearTimeout(showTimer);
    if (card.contains(e.relatedTarget)) return;
    if (card.hidden) link = null;
    else scheduleHide();
  });
  card.addEventListener("mouseenter", cancelHide);
  card.addEventListener("mouseleave", (e) => {
    if (e.relatedTarget && e.relatedTarget.closest?.("[data-hc]") === link) return;
    scheduleHide();
  });
  card.addEventListener("click", (e) => { if (e.target.closest("[data-pin]")) pin(); });
  window.addEventListener("scroll", () => { if (!card.hidden) hide(); }, { passive: true });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Alt" && !card.hidden) { e.preventDefault(); pin(); }
    else if (e.key === "Escape" && pinned.length && document.getElementById("palette").hidden) unpin(pinned[pinned.length - 1]);
  });
  // stop Alt from focusing the browser menu after pinning (Windows)
  document.addEventListener("keyup", (e) => { if (e.key === "Alt") e.preventDefault(); });

  // pinned cards: close, bring to front, drag by the header
  document.addEventListener("click", (e) => {
    const p = e.target.closest(".hovercard.pinned");
    if (p && e.target.closest("[data-close]")) unpin(p);
  });
  document.addEventListener("pointerdown", (e) => {
    const p = e.target.closest(".hovercard.pinned");
    if (!p) return;
    p.style.zIndex = ++z;
    const head = e.target.closest(".hc-head, .hc-title");
    if (!head || e.target.closest("button, a")) return;
    e.preventDefault();
    const sx = e.clientX - p.offsetLeft, sy = e.clientY - p.offsetTop;
    p.classList.add("dragging");
    const move = (ev) => {
      p.style.left = Math.min(Math.max(0, ev.clientX - sx), innerWidth - 60) + "px";
      p.style.top = Math.min(Math.max(0, ev.clientY - sy), innerHeight - 40) + "px";
    };
    const up = () => {
      p.classList.remove("dragging");
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  });
}
