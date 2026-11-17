import { setLyrics } from "../pages/now-playing.js";

// Mac only (≥ 900 px, CSS does the rest): Two cards ↔ Full library (<html data-view="full">,
// themes/layouts/full-library.css). Saved on this device; index.html sets it before the page draws (no flash).
// Only moves boxes: never touches playback.
const root = document.documentElement;
const full = () => root.dataset.view === "full";
const wide = matchMedia("(min-width: 900px)");

// `lyrics`: going back with the lyrics on (the bar's Lyrics key). Full library always turns them off (no room).
function setView(on, lyrics = false) {
  if (on === full()) return;
  try { on ? localStorage.setItem("view", "full") : localStorage.removeItem("view"); } catch {} // private mode: works until reload
  const flip = () => {
    if (on) root.dataset.view = "full"; else delete root.dataset.view;
    setLyrics(lyrics);
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

// Full library: the Now playing bar. Its Lyrics key goes back to two cards with lyrics on; a click anywhere
// else on the bar (cover, title) goes back too. Its other keys and the seek bar work as usual.
document.addEventListener("click", (e) => {
  if (!full() || !wide.matches || !e.target.closest(".np:not([open])")) return;
  const lyrics = !!e.target.closest("[data-act=lyrics]");
  if (lyrics) e.stopPropagation(); // not now-playing.js's own toggle
  else if (e.target.closest("button, input")) return;
  setView(false, lyrics);
}, true);
