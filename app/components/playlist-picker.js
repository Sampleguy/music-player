import { allPlaylists, addSong, createPlaylist } from "../data/playlists.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// Sheet: pick a playlist to add one song to, or make a new one. One <dialog>, made on first use.
let dialog, picked;

export function openPlaylistPicker(song) {
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.className = "sheet";
    dialog.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (btn?.dataset.id) addSong(allPlaylists()[btn.dataset.id], picked);
      if (btn?.dataset.act === "new") {
        const name = prompt("Playlist name")?.trim();
        if (name) addSong(createPlaylist(name), picked);
      }
      if (btn || e.target === dialog) dialog.close(); // tap outside closes too
    });
    document.body.append(dialog);
  }
  picked = song;
  dialog.innerHTML = `<p class="title">Add “${esc(song.title)}” to</p>
    ${allPlaylists().map((p, i) => `<button data-id="${i}">${esc(p.name)}</button>`).join("")}
    <button data-act="new">New playlist…</button>
    <button data-act="close">Cancel</button>`;
  dialog.showModal();
}
