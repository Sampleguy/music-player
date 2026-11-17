import { trackRow } from "../components/track-row.js";
import { icon } from "../components/icons.js";
import { setQueue, play } from "../player.js";
import * as pl from "../data/playlists.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const REMOVE = `<button class="row-btn" data-act="remove" aria-label="Remove">${icon("close")}</button>`;

// Playlists screen: the list, or one playlist (play, rename, delete, remove songs).
let dialog;
let open = null; // the playlist shown, or null for the list

export function openPlaylists() {
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.className = "queue";
    dialog.addEventListener("click", onClick);
    pl.onPlaylistsChange(draw);
    document.body.append(dialog);
  }
  open = null;
  draw();
  dialog.showModal();
}

function onClick(e) {
  const el = e.target.closest("[data-act]");
  const act = el?.dataset.act;
  const songs = open ? pl.playlistSongs(open) : [];
  if (act === "close") dialog.close();
  if (act === "back") { open = null; draw(); }
  if (act === "new") {
    const name = prompt("Playlist name")?.trim();
    if (name) { open = pl.createPlaylist(name); draw(); }
  }
  if (act === "open") { open = pl.allPlaylists()[el.dataset.i]; draw(); }
  if (act === "rename") {
    const name = prompt("New name", open.name)?.trim();
    if (name) pl.renamePlaylist(open, name);
  }
  if (act === "delete" && confirm(`Delete “${open.name}”? Songs stay in your library.`)) {
    pl.deletePlaylist(open);
    open = null;
    draw();
  }
  if (act === "remove") return pl.removeSongAt(open, Number(el.closest(".track").dataset.i));
  const row = e.target.closest(".track");
  if ((act === "play" && songs.length) || (row && !act)) {
    setQueue(songs);
    play(row ? Number(row.dataset.i) : 0);
  }
}

function draw() {
  if (!dialog) return;
  if (open && !pl.allPlaylists().includes(open)) open = null; // deleted elsewhere
  if (!open) {
    const lists = pl.allPlaylists();
    dialog.innerHTML = `
      <header><h2>Playlists</h2><button data-act="close">Done</button></header>
      <div class="modes"><button data-act="new">New playlist</button></div>
      ${lists.length ? `<ul class="tracks">${lists.map((p, i) => `<li class="track" data-act="open" data-i="${i}">
        <div class="meta"><div class="title">${esc(p.name)}</div><div class="artist">${pl.playlistSongs(p).length} songs</div></div></li>`).join("")}</ul>`
        : `<p class="empty">No playlists yet.</p>`}`;
    return;
  }
  const songs = pl.playlistSongs(open);
  dialog.innerHTML = `
    <header><button data-act="back">‹ Playlists</button><button data-act="close">Done</button></header>
    <h2 class="pl-name">${esc(open.name)}</h2>
    <div class="modes">
      <button data-act="play">${icon("play")} Play</button>
      <button data-act="rename">Rename</button>
      <button data-act="delete">Delete</button>
    </div>
    ${songs.length ? `<ul class="tracks">${songs.map((s, i) => trackRow(s, i, REMOVE)).join("")}</ul>`
      : `<p class="empty">No songs yet. Use the More button on a song, then Add to playlist.</p>`}`;
}
