// Per-reader features, remembered in this browser only (nothing is sent anywhere):
// - "New" badges on builds and videos added since the reader's last visit
// - favourite builds (☆ buttons), a "Your favourites" list on the home page
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
  // build cards: inside the title; build page: inside the h1; video rows: after the link
  const h = el.matches("h1") ? el : el.querySelector("h2");
  if (h) h.append(b);
  else el.querySelector("td a")?.after(b);
}

if (since) {
  document.querySelectorAll("[data-date]").forEach((el) => { if (isNew(el.dataset.date)) badge(el); });
  loadIndex().then(({ items }) => {
    const counts = {
      builds: items.filter((i) => i.type === "Build" && isNew(i.date)).length,
      videos: items.filter((i) => i.type === "Video" && isNew(i.date)).length,
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
  const list = ids.map((id) => byKey["b:" + id]).filter(Boolean);
  box.querySelector(".favlist").innerHTML = list.map((b) => `
    <li><a href="${esc(b.url)}" data-hc="${esc(b.k)}">${esc(b.title)}</a>
      <span class="pill ${statusClass(b.status)}">${esc(b.status)}</span>
      <span class="small">${esc(b.sub)}</span>
      <button type="button" class="star" data-fav="${esc(b.k.slice(2))}" aria-pressed="true">★</button></li>`).join("");
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

paintStars();
paintHome();
