// Sheet with two pickers: Theme (looks/: shapes, fonts, motion) and Color (colors/: colors only).
// Any theme works with any color. classic.css + black.css always load; the picked file loads on top
// (link#look, link#color), so a file missing offline just falls back. Choices saved on this device;
// index.html reads them before the page draws, so the wrong one never flashes.
// Names (device only, empty by default): "name" = greeting name, "retroName" = what the Retro button is called.
// Retro with no color picked yet wears its own paint (cream), Classic wears black.
const KINDS = {
  look: { title: "Theme", base: "classic", names: { classic: "Classic", retro: "Retro", glass: "Glass", terminal: "Terminal" } },
  color: { title: "Color", base: "black", names: { cream: "Cream", orange: "Orange", black: "Black", red: "Red", ocean: "Ocean", purple: "Purple", brown: "Brown", olive: "Olive" } },
};
let dialog;
const get = (k) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
const NAMES = [["name", "Your name (greeting)"], ["retroName", "Retro theme name"]];

const picked = (kind) => document.getElementById(kind).getAttribute("href")?.match(/(\w+)\.css/)?.[1] || KINDS[kind].base;

function load(kind, name) {
  const link = document.getElementById(kind);
  if (name === KINDS[kind].base) link.removeAttribute("href");
  else link.href = `/themes/${kind}s/${name}.css`;
}

function apply(kind, name) {
  load(kind, name);
  let chosen = null;
  try { localStorage.setItem(kind, name); chosen = localStorage.getItem("color"); } catch {} // private mode: works until reload
  if (kind === "look" && !chosen) load("color", name === "retro" || name === "glass" ? "cream" : "black");
  mark();
}

function mark() {
  dialog.querySelectorAll("[data-id]").forEach((b) => {
    const on = b.dataset.id === picked(b.dataset.kind);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
  });
}

export function openThemePicker() {
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.className = "sheet";
    dialog.innerHTML = Object.entries(KINDS).map(([kind, k]) => `<p class="title" data-kind="${kind}">${k.title}</p>
      ${Object.entries(k.names).map(([id, label]) => `<button data-kind="${kind}" data-id="${id}">${label}</button>`).join("")}`).join("")
      + NAMES.map(([k, label]) => `<label class="name-set">${label}<input data-set="${k}" maxlength="20" autocomplete="off"></label>`).join("")
      + `<button class="close">Close</button>`;
    dialog.querySelectorAll("[data-set]").forEach((el) => { el.value = get(el.dataset.set); });
    dialog.addEventListener("input", (e) => {
      const k = e.target.dataset.set;
      try { localStorage.setItem(k, e.target.value.trim()); } catch {}
      if (k === "retroName") dialog.querySelector('[data-id="retro"]').textContent = e.target.value.trim() || "Retro";
      else dispatchEvent(new Event("name-change"));
    });
    dialog.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (btn?.dataset.id) return apply(btn.dataset.kind, btn.dataset.id); // stay open: pick both
      if (btn || e.target === dialog) dialog.close();
    });
    const retro = dialog.querySelector('[data-id="retro"]');
    retro.textContent = get("retroName") || "Retro"; // textContent: a typed name is never HTML
    document.body.append(dialog);
  }
  mark();
  dialog.showModal();
  dialog.querySelector(".on").focus(); // iOS focuses the first button; put focus on the current pick instead
}
