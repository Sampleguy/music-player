import { savePlaylists } from "./api.js";

// Playlists in memory. Every change saves the whole list to the Worker (last save wins).
let list = [];
let byId = new Map(); // track id -> song, to turn trackIds into songs

const listeners = new Set();
export const onPlaylistsChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn());

// `state`: from api.getState(), loaded once at start (index.html).
export function loadPlaylists(songs, state) {
  byId = new Map(songs.map((s) => [s.id, s]));
  list = state.playlists;
  emit();
}

export const allPlaylists = () => list;
export const findPlaylist = (id) => list.find((p) => p.id === id);
// Songs of a playlist. Songs no longer in the library are skipped.
export const playlistSongs = (p) => p.trackIds.map((id) => byId.get(id)).filter(Boolean);

// Saves go one at a time, so an older save can never land after a newer one.
let saving = Promise.resolve();
function save(p) {
  if (p) p.updatedAt = Date.now();
  emit();
  const copy = structuredClone(list);
  saving = saving.then(() => savePlaylists(copy)).catch(() => alert("Not saved. Check your internet and try again."));
}

export function createPlaylist(name) {
  const p = { id: crypto.randomUUID(), name, trackIds: [], updatedAt: 0 };
  list.push(p);
  save(p);
  return p;
}
export function renamePlaylist(p, name) { p.name = name; save(p); }
export function deletePlaylist(p) { list = list.filter((x) => x !== p); save(); }
export function addSong(p, song) { p.trackIds.push(song.id); save(p); }
// Remove the k-th shown song (shown list skips songs no longer in the library).
export function removeSongAt(p, k) {
  const shown = p.trackIds.map((id, i) => i).filter((i) => byId.has(p.trackIds[i]));
  p.trackIds.splice(shown[k], 1);
  save(p);
}
