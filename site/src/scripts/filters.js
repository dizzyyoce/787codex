// Filters on list pages. Cards carry data-* values; selects use data-f="<field>".
const root = document.querySelector("[data-filters]");
if (root) {
  const cards = [...document.querySelectorAll("[data-row]")];
  const selects = [...root.querySelectorAll("select[data-f]")];
  const text = root.querySelector("input.filter");
  const hideOld = root.querySelector("#hideOld");
  const favOnly = root.querySelector("#favOnly");
  const favs = () => { try { return JSON.parse(localStorage.getItem("c787-favs") || "[]"); } catch { return []; } };
  const count = root.querySelector(".count");
  const empty = document.querySelector(".empty");
  const noun = root.dataset.noun || "entries";
  const params = new URLSearchParams(location.search);

  try { const s = localStorage.getItem("c787-hideOld"); if (hideOld && s !== null) hideOld.checked = s === "1"; } catch {}
  for (const s of selects) if (params.get(s.dataset.f)) s.value = params.get(s.dataset.f);

  function apply() {
    const q = (text?.value || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    const f = Object.fromEntries(selects.filter((s) => s.value).map((s) => [s.dataset.f, s.value]));
    let n = 0;
    for (const c of cards) {
      let ok = Object.entries(f).every(([k, v]) => c.dataset[k] === v);
      if (ok && q.length) ok = q.every((t) => (c.dataset.text || c.textContent.toLowerCase()).includes(t));
      if (ok && hideOld?.checked && !f.status && c.dataset.status === "Superseded") ok = false;
      if (ok && favOnly?.checked && !favs().includes(c.dataset.id)) ok = false;
      c.hidden = !ok;
      if (ok) n++;
    }
    if (count) count.textContent = `${n} ${n === 1 ? noun.replace(/s$/, "") : noun}`;
    if (empty) empty.hidden = n > 0;
    const u = new URL(location.href);
    for (const s of selects) s.value ? u.searchParams.set(s.dataset.f, s.value) : u.searchParams.delete(s.dataset.f);
    history.replaceState(null, "", u);
  }
  selects.forEach((s) => s.addEventListener("change", apply));
  favOnly?.addEventListener("change", apply);
  document.addEventListener("c787:favs", () => { if (favOnly?.checked) apply(); });
  text?.addEventListener("input", apply);
  hideOld?.addEventListener("change", () => {
    try { localStorage.setItem("c787-hideOld", hideOld.checked ? "1" : "0"); } catch {}
    apply();
  });
  apply();
}
