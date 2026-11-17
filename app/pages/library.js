import { trackRow } from "../components/track-row.js";
import { setQueue, play, onChange, current } from "../player.js";
import { openSongMenu } from "../components/song-menu.js";
import { chunkedList } from "../components/chunked-list.js";
import { showGrid } from "../components/cover-grid.js";
import { openNowPlaying, setLyrics } from "./now-playing.js";
import { icon } from "../components/icons.js";

// Search redraws this list on every keystroke: one song-change hook and one observer, reused.
let markCurrent = null;
let stopChunks = null;
onChange((song) => markCurrent?.(song));

// Grid / List (B-47), saved on this device.
const isGrid = () => { try { return localStorage.getItem("libMode") === "grid"; } catch { return false; } };
const setGrid = (on) => { try { on ? localStorage.setItem("libMode", "grid") : localStorage.removeItem("libMode"); } catch {} };

// Grid / List icon key in the Library bar (B-48): shows the other mode's icon; a tap switches and calls redraw().
export function wireModeKey(btn, redraw) {
  const drawKey = () => {
    const grid = isGrid();
    btn.innerHTML = icon(grid ? "list" : "grid");
    btn.setAttribute("aria-label", grid ? "Show as list" : "Show as grid");
  };
  drawKey();
  btn.onclick = () => { setGrid(!isGrid()); drawKey(); redraw(); };
}

// Plays songs[i] (queue = songs). `lyrics` (lyrics filter on, B-45): also opens Now playing on the lyrics panel.
function playFrom(songs, i, lyrics) {
  setQueue(songs);
  play(i);
  // Mac: Now playing is always open beside the list (Full library has no room for lyrics), iPhone: open the pop-up.
  if (lyrics && document.documentElement.dataset.view !== "full") {
    if (!matchMedia("(min-width: 900px)").matches) openNowPlaying();
    setLyrics(true);
  }
}

// Library: the cover grid or the song list (Grid / List key: wireModeKey).
// The queue is set on tap, so redrawing (search) never disturbs what is playing.
export function showLibrary(root, songs, lyrics = false) {
  stopChunks?.();
  markCurrent = null;
  if (!songs.length) return void (root.innerHTML = `<p class="empty">No songs yet. Tap Import to add songs.</p>`);
  const grid = isGrid();
  root.innerHTML = `<div class="lib-scroll"></div>`;
  const box = root.querySelector(".lib-scroll"); // phone: only this box scrolls (B-49)
  if (!grid) return drawList(box, songs, lyrics);
  stopChunks = showGrid(box, songs, (i) => playFrom(songs, i, lyrics));
}

// Song list (column titles show in Full library only). Draws 100 rows, then 100 more each time the end scrolls into view.
function drawList(root, songs, lyrics) {
  root.insertAdjacentHTML("beforeend", `<div class="cols" aria-hidden="true"><span>Title</span><span>Artist</span><span>Album</span><span>Time</span></div><ul class="tracks"></ul><div class="more"></div>`);
  const list = root.querySelector(".tracks");
  let playing = songs.indexOf(current()); // keep the playing song marked after a redraw
  stopChunks = chunkedList(list, root.querySelector(".more"), songs, trackRow, () => markPlaying());

  list.addEventListener("click", (e) => {
    const row = e.target.closest(".track");
    if (!row) return;
    const i = Number(row.dataset.i);
    if (e.target.closest("[data-act=menu]")) return openSongMenu(songs[i]);
    playFrom(songs, i, lyrics);
  });

  function markPlaying(song) {
    if (song) playing = songs.indexOf(song);
    list.querySelector(".playing")?.classList.remove("playing");
    list.querySelector(`[data-i="${playing}"]`)?.classList.add("playing");
  }
  markCurrent = markPlaying;
}
