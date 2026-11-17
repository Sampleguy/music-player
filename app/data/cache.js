// Device cache: saves whole song files so they replay and seek with no network.
// app/sw.js reads them back. The download itself goes through api.js.
import { fetchSong, fetchLyrics } from "./api.js";

const SONGS = "songs-v1"; // same name as in app/sw.js
const busy = new Set();    // keys downloading now, so one song is never fetched twice at once

// Save a song if it isn't saved yet. Never throws: no network, logged out or full storage
// just means it isn't saved this time. Its lyrics are saved too (app/sw.js keeps them).
export async function keepSong(song) {
  if (song?.lyricsKey) fetchLyrics(song.lyricsKey);
  const url = song && "/" + song.audioKey;
  if (!url || busy.has(url) || !self.caches) return;
  busy.add(url);
  try {
    const cache = await caches.open(SONGS);
    if (await cache.match(url)) return;
    const res = await fetchSong(url);
    if (res.ok && res.status === 200) await cache.put(url, res);
  } catch (e) {
    console.warn("song not saved", url, e);
  } finally {
    busy.delete(url);
  }
}
