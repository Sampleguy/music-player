// LRCLIB lookup (lrclib.net, free, no key). Used by the Worker (app import) and scripts/lyrics.mjs (Mac).
// The phone never calls LRCLIB itself. Returns timed lyrics, else plain lyrics, else null. Throws on a network error.
import { cleanTitle, mainArtist } from "../app/data/track-rules.js";

export const TIMED = /^\[\d+:\d{2}(?:\.\d+)?\]/m; // has at least one "[m:ss.xx]" line
const API = "https://lrclib.net/api";
const HEADERS = { "User-Agent": "music-player-import (personal, no tracking)" };

async function lrclibOnce({ title, artist, album, duration }) {
  const get = async (path, params, tries = 3) => {
    const res = await fetch(`${API}/${path}?${new URLSearchParams(params)}`, { headers: HEADERS });
    if (res.status === 429 && tries > 1) { // too many at once: wait and try again
      await new Promise((r) => setTimeout(r, 3000));
      return get(path, params, tries - 1);
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`LRCLIB ${res.status}`);
    return res.json();
  };
  // Exact match first (LRCLIB checks length ±2 s), then a search with the same length check.
  const hit = await get("get", { track_name: title, artist_name: artist, album_name: album, duration: Math.round(duration) });
  if (hit?.syncedLyrics) return hit.syncedLyrics;
  const near = ((await get("search", { track_name: title, artist_name: artist })) || [])
    .filter((r) => Math.abs(r.duration - duration) <= 10);
  const list = near.filter((r) => Math.abs(r.duration - duration) <= 2);
  // Timed within 2 s wins, then plain within 2 s, then plain within 10 s (timed from 10 s would drift).
  return list.find((r) => r.syncedLyrics)?.syncedLyrics || hit?.plainLyrics || list.find((r) => r.plainLyrics)?.plainLyrics
    || near.find((r) => r.plainLyrics)?.plainLyrics || null;
}

// LRCLIB as tagged, then once more with a cleaned title + main artist if that changes anything
// and the first try found no timed lyrics. Timed beats plain; plain beats nothing.
export async function fromLrclib(track) {
  const hit = await lrclibOnce(track);
  const clean = { ...track, title: cleanTitle(track.title) || track.title, artist: mainArtist(track.artist) || track.artist };
  if ((hit && TIMED.test(hit)) || (clean.title === track.title && clean.artist === track.artist)) return hit;
  const again = await lrclibOnce(clean);
  return again && TIMED.test(again) ? again : hit || again;
}

// In-app lyrics search (B-42): free text → up to 20 results with their lyrics, synced first.
// Throws on a network error, LRCLIB error or after 10 s.
export async function searchLrclib(q) {
  const res = await fetch(`${API}/search?${new URLSearchParams({ q })}`, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`LRCLIB ${res.status}`);
  return (await res.json())
    .filter((r) => r.syncedLyrics || r.plainLyrics)
    .sort((a, b) => !a.syncedLyrics - !b.syncedLyrics)
    .slice(0, 20)
    .map((r) => ({ title: r.trackName, artist: r.artistName, duration: r.duration, synced: !!r.syncedLyrics, lyrics: r.syncedLyrics || r.plainLyrics }));
}
