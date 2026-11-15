// Keyboard-first search: press "/" or Ctrl/Cmd+K anywhere, type, arrow keys, Enter.
import { loadIndex, esc, statusClass } from "./index.js";

const pal = document.getElementById("palette");
const input = document.getElementById("pq");
const list = document.getElementById("pres");
let results = [];
let sel = 0;
let lastFocus = null;

const TYPE_RANK = { Build: 0, "Mechanic · Engine": 1, "Mechanic · Tip": 1, "Patch change": 2, Mindset: 3, "Trial of Chaos": 3, Video: 4 };
const STATUS_PENALTY = { Superseded: 15, Dead: 15 };

function score(it, q, toks) {
  let s = 0;
  for (const t of toks) {
    const inTitle = it._t.includes(t);
    if (!inTitle && !it._x.includes(t)) return -1;
    s += inTitle ? 10 : 2;
  }
  if (it._t.startsWith(q)) s += 40;
  else if (it._t.includes(q)) s += 20;
  return s - (TYPE_RANK[it.type] ?? 5) - (STATUS_PENALTY[it.status] || 0);
}

async function search(q) {
  const { items } = await loadIndex();
  q = q.trim().toLowerCase();
  if (!q) {
    results = items.filter((it) => it.type === "Build" && it.status === "Current").slice(0, 8);
  } else {
    const toks = q.split(/\s+/);
    results = items.map((it) => [score(it, q, toks), it]).filter(([s]) => s >= 0)
      .sort((a, b) => b[0] - a[0]).slice(0, 30).map(([, it]) => it);
  }
  sel = 0;
  draw(q);
}

function draw(q) {
  if (!results.length) {
    list.innerHTML = `<li class="none">Nothing matches “${esc(q)}”.</li>`;
    return;
  }
  list.innerHTML = (q ? "" : `<li class="hint">Current builds</li>`) + results.map((it, i) => `
    <li role="option" id="pr${i}" aria-selected="${i === sel}" data-i="${i}">
      <a href="${esc(it.url)}" ${it.external ? 'target="_blank" rel="noopener"' : ""} tabindex="-1">
        <span class="ptype">${esc(it.type)}</span>
        <span class="ptitle">${esc(it.title)}${it.external ? " ↗" : ""}</span>
        <span class="psub">${it.status ? `<span class="pill ${statusClass(it.status)}">${esc(it.status)}</span> ` : ""}${esc(it.sub || "")}</span>
      </a></li>`).join("");
  input.setAttribute("aria-activedescendant", "pr" + sel);
}

function move(d) {
  if (!results.length) return;
  sel = (sel + d + results.length) % results.length;
  list.querySelectorAll("[role=option]").forEach((li) => li.setAttribute("aria-selected", li.dataset.i == sel));
  const li = document.getElementById("pr" + sel);
  li?.scrollIntoView({ block: "nearest" });
  input.setAttribute("aria-activedescendant", "pr" + sel);
}

function go(it, newTab) {
  if (!it) return;
  if (newTab || it.external) window.open(it.url, "_blank", "noopener");
  else location.href = it.url;
  if (!newTab) close();
}

export function open(prefill = "") {
  lastFocus = document.activeElement;
  pal.hidden = false;
  document.documentElement.classList.add("noscroll");
  input.value = prefill;
  search(prefill);
  input.focus();
}
function close() {
  pal.hidden = true;
  document.documentElement.classList.remove("noscroll");
  lastFocus?.focus?.();
}

input.addEventListener("input", () => search(input.value));
input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
  else if (e.key === "Enter") { e.preventDefault(); go(results[sel], e.ctrlKey || e.metaKey); }
  else if (e.key === "Escape") { e.preventDefault(); close(); }
  else if (e.key === "Tab") { e.preventDefault(); move(e.shiftKey ? -1 : 1); }
});
list.addEventListener("click", (e) => {
  const li = e.target.closest("[role=option]");
  if (!li) return;
  e.preventDefault();
  go(results[+li.dataset.i], e.ctrlKey || e.metaKey);
});
list.addEventListener("mousemove", (e) => {
  const li = e.target.closest("[role=option]");
  if (li && +li.dataset.i !== sel) move(+li.dataset.i - sel);
});
pal.querySelector("[data-close-palette]").addEventListener("click", close);
pal.addEventListener("mousedown", (e) => { if (e.target === pal) close(); });
document.querySelectorAll("[data-open-palette]").forEach((b) => b.addEventListener("click", () => open()));

document.addEventListener("keydown", (e) => {
  const t = e.target;
  const typing = t.isContentEditable || /^(TEXTAREA|SELECT)$/.test(t.tagName) ||
    (t.tagName === "INPUT" && !/^(checkbox|radio|button|submit|reset)$/.test(t.type));
  if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); pal.hidden ? open() : close(); return; }
  if (typing || !pal.hidden) return;
  if (e.key === "/") { e.preventDefault(); open(); }
});

// Warm the index in the background so the first search is instant.
(window.requestIdleCallback || setTimeout)(() => loadIndex());
