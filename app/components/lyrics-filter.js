import { icon } from "./icons.js";

// Lyrics filter key in the Library bar (B-48, was the B-45 chips): lyrics icon + a badge with the songs that
// need work (No lyrics + To check), hidden at 0. Tap opens a small menu: "No lyrics (n)" / "To check (n)".
// A pick shows only those songs; picking it again or "Clear" shows all. Counts redraw when lyrics change anywhere.
// Plain lyrics can't be told apart without fetching every file, so "To check" is AI drafts only.
export const lyricsFilters = {
  none: { label: "No lyrics", test: (s) => !s.lyricsKey },
  check: { label: "To check", test: (s) => !!s.lyricsKey && s.lyricsSource === "ai" },
};

let onLyricsChange = null; // one listener for the whole app: search rewires this key on every new song list
["lyrics-saved", "lyrics-changed"].forEach((ev) => document.addEventListener(ev, () => onLyricsChange?.()));
let closeMenu = null; // a tap outside the key or Esc closes the open menu
document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".lyr-wrap")) closeMenu?.(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu?.(); });

// pick(mode) is called with "none" | "check" | null; it also runs again after a lyrics change.
export function wireLyricsFilter(box, songs, pick) {
  box.innerHTML = `<button class="key alt lyr-key" aria-haspopup="true" aria-expanded="false" aria-pressed="false" aria-label="Lyrics filter">${icon("lyrics")}<span class="badge" hidden></span></button><div class="lyr-menu" hidden></div>`;
  const key = box.querySelector(".lyr-key"), badge = box.querySelector(".badge"), menu = box.querySelector(".lyr-menu");
  let mode = null;
  const count = (m) => songs.filter(lyricsFilters[m].test).length;
  const item = (html, pressed, onclick) => {
    const b = document.createElement("button");
    b.innerHTML = html;
    if (pressed !== null) b.setAttribute("aria-pressed", pressed);
    b.onclick = onclick;
    menu.append(b);
  };
  const draw = () => {
    const n = count("none") + count("check");
    badge.textContent = n;
    badge.hidden = !n;
    key.setAttribute("aria-pressed", !!mode);
    menu.textContent = "";
    for (const [m, f] of Object.entries(lyricsFilters)) item(`${f.label} (${count(m)})`, mode === m, () => set(mode === m ? null : m));
    if (mode) item(`${icon("close")} Clear`, null, () => set(null));
  };
  const show = (on) => {
    menu.hidden = !on;
    key.setAttribute("aria-expanded", on);
    closeMenu = on ? () => show(false) : null;
  };
  const set = (m) => { mode = m; show(false); draw(); pick(mode); };
  key.onclick = () => show(menu.hidden);
  onLyricsChange = () => { draw(); if (mode) pick(mode); };
  draw();
}
