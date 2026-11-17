import { setLyrics } from "../pages/now-playing.js";

// Mac only (≥ 900 px, CSS does the rest): Two cards ↔ Full library (<html data-view="full">,
// themes/layouts/full-library.css). Saved on this device; index.html sets it before the page draws (no flash).
// Only moves boxes: never touches playback.
const root = document.documentElement;
const full = () => root.dataset.view === "full";
const wide = matchMedia("(min-width: 900px)");

// Full library turns the lyrics off (no room); going back always shows them (F-31).
function setView(on) {
  if (on === full()) return;
  try { on ? localStorage.setItem("view", "full") : localStorage.removeItem("view"); } catch {} // private mode: works until reload
  const flip = () => {
    if (on) root.dataset.view = "full"; else delete root.dataset.view;
    setLyrics(!on);
    document.querySelectorAll(".view-key").forEach(drawKey);
  };
  // Smooth move: the browser morphs the cards (.vt names them, only while it runs). No support / less motion: instant.
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return flip();
  root.classList.add("vt");
  document.startViewTransition(flip).finished.finally(() => root.classList.remove("vt"));
}

const drawKey = (b) => { b.textContent = full() ? "Back to player" : "Full library"; };

// The Library card's key (components/home-top.js puts it in the Library bar).
export function wireViewKey(btn) {
  drawKey(btn);
  btn.addEventListener("click", () => setView(!full()));
}

// Full library: the Now playing bar. Its Lyrics key, or a click anywhere else on the bar (cover, title),
// goes back to two cards with lyrics on. Its other keys and the seek bar work as usual.
document.addEventListener("click", (e) => {
  if (!full() || !wide.matches || !e.target.closest(".np:not([open])")) return;
  if (e.target.closest("[data-act=lyrics]")) e.stopPropagation(); // not now-playing.js's own toggle
  else if (e.target.closest("button, input")) return;
  setView(false);
}, true);
