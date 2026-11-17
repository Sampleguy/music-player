import { coverHtml } from "./track-row.js";
import { chunkedList } from "./chunked-list.js";
import { openSongMenu } from "./song-menu.js";

// Library Grid (B-50): one tile per song (cover, title, artist), no grouping. "Unknown artist" is never shown.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const known = (s) => (s && !/^unknown( artist)?$/i.test(s.trim()) ? s : "");

const tileHtml = (s, i) => `<li class="tile" data-i="${i}" role="button" tabindex="0">
    ${coverHtml(s)}
    <div class="name">${esc(s.title)}</div>${known(s.artist) ? `<div class="sub">${esc(s.artist)}</div>` : ""}
  </li>`;

// Draws the tiles into `root`. open(i) runs on tap with the song's index; press-and-hold (or right-click)
// opens the song's ⋯ menu. Returns a stop function (ends the chunk observer).
export function showGrid(root, songs, open) {
  root.insertAdjacentHTML("beforeend", `<ul class="grid"></ul><div class="more"></div>`);
  const grid = root.querySelector(".grid");
  const stop = chunkedList(grid, root.querySelector(".more"), songs, tileHtml);
  const idx = (e) => e.target.closest(".tile")?.dataset.i;
  const tileAt = (e) => songs[idx(e)];

  let timer = null, held = false;
  const cancel = () => clearTimeout(timer);
  grid.addEventListener("pointerdown", (e) => {
    const t = tileAt(e);
    held = false;
    if (t) timer = setTimeout(() => { held = true; openSongMenu(t); }, 500);
  });
  ["pointerup", "pointercancel", "pointerleave", "scroll"].forEach((ev) => grid.addEventListener(ev, cancel));
  grid.addEventListener("pointermove", (e) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 4) cancel(); });
  grid.addEventListener("contextmenu", (e) => {
    const t = tileAt(e);
    if (!t) return;
    e.preventDefault();
    if (!held) openSongMenu(t);
  });
  grid.addEventListener("click", (e) => {
    const t = tileAt(e);
    if (!t || held) return void (held = false); // the hold already opened the menu
    open(+idx(e));
  });
  grid.addEventListener("keydown", (e) => { if (e.key === "Enter" && tileAt(e)) open(+idx(e)); });
  return stop;
}
