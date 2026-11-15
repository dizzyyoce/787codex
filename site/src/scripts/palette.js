// Search box in the header: results appear underneath as you type, with a preview of the
// highlighted result beside them on wide screens. "/" or Ctrl/Cmd+K jumps to the box.
import { loadIndex, esc, statusClass } from "./index.js";

const box = document.getElementById("search");
const pal = document.getElementById("palette");   // the results panel
const input = document.getElementById("pq");
const list = document.getElementById("pres");
const preview = document.getElementById("sprev");
let results = [];
let sel = 0;
let lastQuery = "";

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

function score(it, q, toks, exact, res) {
  let s = 0;
  for (const [i, t] of toks.entries()) {
    const alias = ALIASES[t];
    const re = res[i];
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

async function search(raw) {
  const { items } = await loadIndex();
  const q = raw.trim().toLowerCase();
  if (raw !== input.value) return; // a newer keystroke has arrived
  lastQuery = q;
  if (!q) { close(); return; }
  const toks = q.split(/\s+/);
  // Words match from their start. Short finished words (1–3 letters) must match a whole word,
  // so "ci" doesn't find "decimating"; the word still being typed matches any word start.
  const res = toks.map((t, i) => (t.length <= 3 && (i < toks.length - 1 || raw.endsWith(" ")) ? wordRe(t) : startRe(t)));
  // typo matching only for words that match nothing exactly ("ward" shouldn't find "warp")
  const exact = new Set(toks.filter((t, i) => items.some((it) => res[i].test(it._t) || res[i].test(it._x)) || ALIASES[t]));
  results = items.map((it) => [score(it, q, toks, exact, res), it]).filter(([s]) => s >= 0)
    .sort((a, b) => b[0] - a[0]).slice(0, 30).map(([, it]) => it);
  sel = 0;
  draw(q);
  openPanel();
}

function draw(q) {
  if (!results.length) {
    list.innerHTML = `<li class="none">Nothing matches “${esc(q)}”.</li>`;
    preview.innerHTML = "";
    return;
  }
  list.innerHTML = results.map((it, i) => `
    <li role="option" id="pr${i}" aria-selected="${i === sel}" data-i="${i}">
      <a href="${esc(it.url)}" ${it.external ? 'target="_blank" rel="noopener"' : ""} tabindex="-1">
        <span class="ptype">${esc(it.type)}</span>
        <span class="ptitle">${esc(it.title)}${it.external ? " ↗" : ""}</span>
        <span class="psub">${it.status ? `<span class="pill ${statusClass(it.status)}">${esc(it.status)}</span> ` : ""}${esc(it.sub || "")}</span>
      </a></li>`).join("");
  list.scrollTop = 0;
  showPreview();
  input.setAttribute("aria-activedescendant", "pr" + sel);
}

function showPreview() {
  const it = results[sel];
  if (!it) { preview.innerHTML = ""; return; }
  preview.innerHTML = `
    <div class="ptype">${esc(it.type)}</div>
    <div class="hc-title">${esc(it.title)}</div>
    <div class="meta">${it.status ? `<span class="pill ${statusClass(it.status)}">${esc(it.status)}</span>` : ""}<span class="small">${esc(it.sub || "")}</span></div>
    ${it.skills ? `<div class="skills">${esc(it.skills)}</div>` : ""}
    ${it.body ? `<p class="text sprev-body">${esc(it.body)}</p>` : ""}
    <div class="hc-links">
      ${it.url && !it.external ? `<a class="btn" href="${esc(it.url)}">Open page →</a>` : ""}
      ${it.video || it.external ? `<a class="btn primary" href="${esc(it.video || it.url)}" target="_blank" rel="noopener">▶ Watch</a>` : ""}
      ${it.ninja ? `<a class="btn" href="${esc(it.ninja)}" target="_blank" rel="noopener">poe.ninja ↗</a>` : ""}
    </div>`;
}

function move(d) {
  if (!results.length) return;
  sel = (sel + d + results.length) % results.length;
  list.querySelectorAll("[role=option]").forEach((li) => li.setAttribute("aria-selected", li.dataset.i == sel));
  document.getElementById("pr" + sel)?.scrollIntoView({ block: "nearest" });
  input.setAttribute("aria-activedescendant", "pr" + sel);
  showPreview();
}

function go(it, newTab) {
  if (!it) return;
  if (newTab || it.external) window.open(it.url, "_blank", "noopener");
  else location.href = it.url;
}

function openPanel() {
  pal.hidden = false;
  input.setAttribute("aria-expanded", "true");
  box.classList.add("open");
}
function close() {
  pal.hidden = true;
  input.setAttribute("aria-expanded", "false");
  box.classList.remove("open");
}

input.addEventListener("input", () => search(input.value));
input.addEventListener("focus", () => { if (input.value.trim()) search(input.value); });
input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); if (pal.hidden && input.value.trim()) search(input.value); else move(1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
  else if (e.key === "Enter") { e.preventDefault(); if (!pal.hidden) go(results[sel], e.ctrlKey || e.metaKey); }
  else if (e.key === "Escape") { e.preventDefault(); if (!pal.hidden) close(); else { input.value = ""; input.blur(); } }
  else if (e.key === "Tab" && !pal.hidden && results.length) { e.preventDefault(); move(e.shiftKey ? -1 : 1); }
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
// click anywhere else closes the panel
document.addEventListener("pointerdown", (e) => { if (!pal.hidden && !box.contains(e.target)) close(); });

document.addEventListener("keydown", (e) => {
  const t = e.target;
  const typing = t.isContentEditable || /^(TEXTAREA|SELECT)$/.test(t.tagName) ||
    (t.tagName === "INPUT" && !/^(checkbox|radio|button|submit|reset)$/.test(t.type));
  if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); input.focus(); input.select(); return; }
  if (typing) return;
  if (e.key === "/") { e.preventDefault(); input.focus(); input.select(); }
});

// Warm the index in the background so the first search is instant.
(window.requestIdleCallback || setTimeout)(() => loadIndex());
