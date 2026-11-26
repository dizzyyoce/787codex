// Title lists that open in place (Mindset, Trial of Chaos, Patch Changes).
// - A link to an entry (#p3, #t12, #c2, from search, favourites or a shared link) opens it.
// - "Open all" / "Close all" buttons.
function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const el = document.getElementById(id);
  const d = el && el.querySelector("details");
  if (!d) return;
  d.open = true;
  requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
}
openFromHash();
addEventListener("hashchange", openFromHash);

document.querySelectorAll("[data-acc-all]").forEach((b) => b.addEventListener("click", () => {
  const open = b.dataset.accAll === "open";
  document.querySelectorAll(".acc-item details").forEach((d) => { d.open = open; });
}));
