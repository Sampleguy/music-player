import { showLibrary, wireModeKey } from "./library.js";
import { icon } from "../components/icons.js";
import { wireLyricsFilter, lyricsFilters } from "../components/lyrics-filter.js";

// "Beyoncé" -> "beyonce": lowercase, accents removed.
export const plain = (s) => (s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Songs whose title/artist/album contain every word of the query. Keys built once per list.
export function makeFilter(songs) {
  const keys = songs.map((s) => plain(`${s.title} ${s.artist} ${s.album}`));
  return (query) => {
    const words = plain(query).split(/\s+/).filter(Boolean);
    return words.length ? songs.filter((_, i) => words.every((w) => keys[i].includes(w))) : songs;
  };
}

// Search box on top, occasion chips (components/occasion-chips.js fills .chips), song list below.
// `tools` (.lib-keys in the Library bar) gets the Grid / List key and the lyrics filter key (B-48).
// Each keystroke or filter pick redraws the list.
export function showSearch(root, songs, tools) {
  root.innerHTML = `<label class="search">${icon("search")}<input type="search" placeholder="Search songs, artists, albums" aria-label="Search"></label>
    <div class="chips" hidden></div><div class="results"></div>`;
  const box = root.querySelector(".search input");
  const results = root.querySelector(".results");
  const filter = makeFilter(songs);
  let mode = null;
  const draw = () => {
    const found = mode ? filter(box.value).filter(lyricsFilters[mode].test) : filter(box.value);
    if (found.length || (!box.value.trim() && !mode)) showLibrary(results, found, !!mode);
    else results.innerHTML = `<p class="empty">No matches.</p>`;
  };
  tools.innerHTML = `<button class="key alt mode-key"></button><span class="lyr-wrap"></span>`;
  wireModeKey(tools.querySelector(".mode-key"), draw);
  wireLyricsFilter(tools.querySelector(".lyr-wrap"), songs, (m) => { mode = m; draw(); });
  box.addEventListener("input", draw);
  draw();
}
