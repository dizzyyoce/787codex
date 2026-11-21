// Per-reader features, remembered in this browser only (nothing is sent anywhere):
// - "New" badges on builds added since the reader's last visit (not on videos: the Videos tab is an index)
// - favourites (☆ buttons on builds, mechanics, patch changes, Trial of Chaos notes, mindset ideas
//   and videos), a "Your favourites" list on the home page
import { loadIndex, esc, statusClass } from "./index.js";

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const ss = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
};

// ---- New since last visit ------------------------------------------------------
// The first page of a browsing session remembers the previous visit date for the whole
// session, so badges don't vanish as you click around. A first-ever visit shows none.
const today = new Date().toISOString().slice(0, 10);
let since = ss.get("c787-since");
if (since === null) {
  since = store.get("c787-lastVisit", "") || "";
  ss.set("c787-since", since);
  store.set("c787-lastVisit", today);
}
const isNew = (d) => !!since && !!d && d > since;

function badge(el) {
  if (el.querySelector(".newbadge")) return;
  const b = document.createElement("span");
  b.className = "newbadge";
  b.textContent = "New";
  b.title = "Added since your last visit";
  // build cards: inside the title; build page: inside the h1
  const h = el.matches("h1") ? el : el.querySelector("h2");
  if (h) h.append(b);
}

if (since) {
  // Video rows (Videos tab, home page's Newest videos) carry data-date too but get no badge.
  document.querySelectorAll("[data-date]:not(tr)").forEach((el) => { if (isNew(el.dataset.date)) badge(el); });
  loadIndex().then(({ items }) => {
    const counts = {
      builds: items.filter((i) => i.type === "Build" && isNew(i.date)).length,
    };
    for (const [k, n] of Object.entries(counts)) {
      const tab = document.querySelector(`[data-tab="${k}"]`);
      if (n && tab && !tab.querySelector(".newdot")) {
        tab.insertAdjacentHTML("beforeend", `<span class="newdot" title="${n} new since your last visit">${n} new</span>`);
      }
    }
  });
}

// ---- Offline copy (service worker) --------------------------------------------
if ("serviceWorker" in navigator && document.body.dataset.sw && (location.protocol === "https:" || location.hostname === "localhost")) {
  addEventListener("load", () => navigator.serviceWorker.register(document.body.dataset.sw).catch(() => {}));
}

// ---- Favourites ----------------------------------------------------------------
const favs = () => store.get("c787-favs", []);

function paintStars() {
  const f = new Set(favs());
  document.querySelectorAll("[data-fav]").forEach((btn) => {
    const on = f.has(btn.dataset.fav);
    btn.setAttribute("aria-pressed", on);
    btn.textContent = on ? "★" : "☆";
    btn.title = btn.ariaLabel = on ? "Remove from favourites" : "Add to favourites";
  });
}

async function paintHome() {
  const box = document.getElementById("favs");
  if (!box) return;
  const ids = favs();
  if (!ids.length) { box.hidden = true; return; }
  const { byKey } = await loadIndex();
  // builds first (saved as bare IDs), then everything else in the order it was starred
  const list = ids.map((id) => [id, byKey[id.includes(":") ? id : "b:" + id]]).filter(([, it]) => it)
    .sort(([a], [b]) => (a.includes(":") ? 1 : 0) - (b.includes(":") ? 1 : 0));
  box.querySelector(".favlist").innerHTML = list.map(([id, it]) => `
    <li><a href="${esc(it.url)}"${it.external ? ' target="_blank" rel="noopener"' : ""}${/^[bm]:/.test(it.k) ? ` data-hc="${esc(it.k)}"` : ""}>${esc(it.title)}${it.external ? " ↗" : ""}</a>
      ${it.status ? `<span class="pill ${statusClass(it.status)}">${esc(it.status)}</span>` : `<span class="chip">${esc(it.type)}</span>`}
      <span class="small">${esc(it.sub)}</span>
      <button type="button" class="star" data-fav="${esc(id)}" aria-pressed="true">★</button></li>`).join("");
  box.hidden = !list.length;
  paintStars();
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-fav]");
  if (!btn) return;
  e.preventDefault();
  const id = btn.dataset.fav;
  const f = favs();
  store.set("c787-favs", f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);
  paintStars();
  paintHome();
  document.dispatchEvent(new CustomEvent("c787:favs"));
});

// Keep every page in step with favourites changed elsewhere: a page brought back with the
// Back/Forward buttons is restored as it was left, and another open tab doesn't reload.
const refresh = () => { paintStars(); paintHome(); document.dispatchEvent(new CustomEvent("c787:favs")); };
addEventListener("pageshow", (e) => { if (e.persisted) refresh(); });
addEventListener("storage", (e) => { if (e.key === "c787-favs") refresh(); });

paintStars();
paintHome();
