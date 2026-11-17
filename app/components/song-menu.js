import { playNext, addToQueue } from "../queue.js";
import { openPlaylistPicker } from "./playlist-picker.js";
import { openCoverPicker } from "./cover-picker.js";
import { openLyricsSearch } from "./lyrics-search.js";
import { askRemoveLyrics } from "./lyrics-remove.js";

// Small sheet for one song: "Play next" / "Add to queue" / "Add to playlist" / "Artist cover" / "Song cover" / "Search lyrics" / "Remove lyrics" (only with lyrics). One <dialog>, made on first use.
let dialog, picked;

export function openSongMenu(song) {
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.className = "sheet";
    dialog.innerHTML = `<p class="title"></p>
      <button data-act="next">Play next</button>
      <button data-act="add">Add to queue</button>
      <button data-act="playlist">Add to playlist…</button>
      <button data-act="cover">Artist cover…</button>
      <button data-act="songcover">Song cover…</button>
      <button data-act="lyrics">Search lyrics…</button>
      <button data-act="unlyrics">Remove lyrics…</button>
      <button data-act="close">Cancel</button>`;
    dialog.addEventListener("click", (e) => {
      const act = e.target.dataset.act;
      if (act === "next") playNext(picked);
      if (act === "add") addToQueue(picked);
      if (act || e.target === dialog) dialog.close(); // tap outside closes too
      if (act === "playlist") openPlaylistPicker(picked);
      if (act === "cover") openCoverPicker(picked);
      if (act === "songcover") openCoverPicker(picked, true);
      if (act === "lyrics") openLyricsSearch(picked);
      if (act === "unlyrics") askRemoveLyrics(picked);
    });
    document.body.append(dialog);
  }
  picked = song;
  dialog.querySelector(".title").textContent = song.title;
  dialog.querySelector("[data-act=unlyrics]").hidden = !song.lyricsKey;
  dialog.showModal();
}
