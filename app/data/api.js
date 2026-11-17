// The only file that calls the Worker.
export async function login(password) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (res.status === 429) throw new Error("Too many tries. Wait 1 minute.");
  if (!res.ok) throw new Error("Wrong password.");
}

// Returns the song list, [] if none yet, or null if not logged in.
export async function getLibrary() {
  const res = await fetch("/api/library");
  if (res.status === 401) return null;
  return res.ok ? (await res.json()).tracks : [];
}

// Whole song file (no Range), for saving on the device (data/cache.js).
export const fetchSong = (url) => fetch(url);

// Lyrics text (LRC) of a song, or null (no internet and not saved by sw.js).
export async function fetchLyrics(key) {
  try {
    const res = await fetch("/" + key);
    return res.ok ? res.text() : null;
  } catch { return null; }
}

// Saved state: { playlists, plays }. Empty if it can't load (the app still plays).
export async function getState() {
  try {
    const res = await fetch("/api/state");
    if (res.ok) return res.json();
  } catch {} // no internet and never saved by sw.js
  return { playlists: [], plays: {} };
}

// One play of a song. Returns the saved { count, last }, or null if not saved (offline).
export async function recordPlay(id) {
  try {
    const res = await fetch("/api/play", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

// Saves the whole playlist list. Throws if the Worker did not save it.
export async function savePlaylists(playlists) {
  const res = await fetch("/api/playlists", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playlists }),
  });
  if (!res.ok) throw new Error("Not saved");
}

// Saves your own lyrics for a song. Returns the new lyricsKey. Throws if not saved.
export async function saveLyrics(id, text) {
  const res = await fetch("/api/lyrics/" + id, { method: "PUT", headers: { "Content-Type": "text/plain; charset=utf-8" }, body: text });
  if (!res.ok) throw new Error("Not saved");
  return (await res.json()).lyricsKey;
}

// Makes AI lyrics for a song (Whisper, B-43). Returns {lyricsKey, lyricsSource}.
// Throws an Error whose .status is 429 (daily free AI limit used up), 422 (no singing found) or other.
export async function makeAiLyrics(id) {
  const res = await fetch("/api/lyrics-ai/" + id, { method: "POST" });
  if (!res.ok) throw Object.assign(new Error("Not made"), { status: res.status });
  return res.json();
}

// Removes a song's lyrics (file + fields; marks it lyricsRemoved). Throws if not removed.
export async function removeLyrics(id) {
  const res = await fetch("/api/lyrics/" + id, { method: "DELETE" });
  if (!res.ok) throw new Error("Not removed");
}

// Sets one cover for an artist's songs (mode "all" or "missing"), or for one song (mode "song", artist = song id).
// small/big: JPEG blobs. Returns {ids, coverKey, bigCoverKey}. Throws if not saved.
export async function saveArtistCover(artist, mode, small, big) {
  const form = new FormData();
  form.append(mode === "song" ? "id" : "artist", artist);
  form.append("mode", mode);
  form.append("small", small, "small.jpg");
  form.append("big", big, "big.jpg");
  const res = await fetch("/api/artist-cover", { method: "POST", body: form });
  if (!res.ok) throw new Error(res.status === 404 ? "No songs to change" : "Not saved");
  return res.json();
}

// App import, step 1: the song file. Returns false if it is already in the library. Throws a short reason if not saved.
const IMPORT_ERRORS = { 401: "Not logged in", 413: "File too big", 507: "Storage full (9 GB)" };
export async function uploadSong(id, ext, file, type) {
  const res = await fetch(`/api/import/${id}.${ext}`, { method: "PUT", headers: { "Content-Type": type }, body: file });
  if (res.status === 409) return false;
  if (!res.ok) throw new Error(IMPORT_ERRORS[res.status] || "Upload failed");
  return true;
}

// App import, step 2: details + covers (JPEG blobs or null). Returns the new track, or null if already in the library.
export async function addSong(id, meta, small, big) {
  const form = new FormData();
  form.append("meta", JSON.stringify(meta));
  if (small && big) { form.append("small", small, "small.jpg"); form.append("big", big, "big.jpg"); }
  const res = await fetch("/api/import/" + id, { method: "POST", body: form });
  if (res.status === 409) return null;
  if (!res.ok) throw new Error(IMPORT_ERRORS[res.status] || "Not saved");
  return res.json();
}

// Lyrics search on LRCLIB through the Worker. Returns [{title, artist, duration, synced, lyrics}]. Throws if it failed.
export async function searchLyrics(q) {
  const res = await fetch("/api/lyrics-search?" + new URLSearchParams({ q }));
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

// Import check step (B-44): which lyrics LRCLIB has for these details. Returns "synced" | "plain" | "none". Throws if it failed.
export async function lookupLyrics({ title, artist, album, duration }) {
  const res = await fetch("/api/lyrics-lookup?" + new URLSearchParams({ title, artist, album, duration }));
  if (!res.ok) throw new Error("Lookup failed");
  return (await res.json()).kind;
}
