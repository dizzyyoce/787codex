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

// Common PoE short forms: typing the short form also finds the full phrase.
const ALIASES = {
  ci: "chaos inoculation", coc: "cast on crit", cod: "cast on dodge", comd: "cast on minion death",
  aoe: "area of effect", lw: "lightning warp", ms: "movement speed", conc: "concussive", es: "energy shield",
};

// Edit distance, giving up once it exceeds `max` (typo tolerance).
function near(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}
// A misspelt word matches a whole word or the start of one ("boneshater", "concusive", "lightnin").
function fuzzy(words, t) {
  if (t.length < 3) return false;
  if (t.length === 3) return words.some((w) => w.length <= 4 && near(t, w, 1)); // "pak" -> "pack"
  const max = t.length >= 7 ? 2 : 1;
  return words.some((w) => near(t, w, max) || (w.length > t.length && near(t, w.slice(0, t.length), max)));
}
const reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (t) => new RegExp(`(^|[^a-z0-9])${reEsc(t)}($|[^a-z0-9])`); // whole word
const startRe = (t) => new RegExp(`(^|[^a-z0-9])${reEsc(t)}`);            // start of a word

function score(it, q, toks, exact) {
  let s = 0;
  for (const t of toks) {
    const alias = ALIASES[t];
    // 1–3 letter searches match whole words only, so "ci" doesn't find "decimating"
    const re = t.length <= 3 ? wordRe(t) : startRe(t);
    const has = (str) => re.test(str);
    if (has(it._t) || (alias && it._t.includes(alias))) s += 10;
    else if (has(it._x) || (alias && it._x.includes(alias))) s += 2;
    else if (!exact.has(t) && fuzzy(it._tw, t)) s += 8;
    else if (!exact.has(t) && fuzzy(it._w, t)) s += 1;
    else return -1;
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
    // typo matching only for words that match nothing exactly ("ward" shouldn't find "warp")
    const exact = new Set(toks.filter((t) => {
      const re = t.length <= 3 ? wordRe(t) : startRe(t);
      return items.some((it) => re.test(it._t) || re.test(it._x)) || ALIASES[t];
    }));
    results = items.map((it) => [score(it, q, toks, exact), it]).filter(([s]) => s >= 0)
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
