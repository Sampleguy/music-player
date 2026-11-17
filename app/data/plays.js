import { recordPlay } from "./api.js";

// Play counts: { [trackId]: {count, last} }, saved in R2 by the Worker.
let plays = {};
let songs = [];

const listeners = new Set();
export const onPlaysChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn());
export const allSongs = () => songs; // the whole library (set at start)

// `state`: from api.getState(), loaded once at start (index.html).
export function loadPlays(allSongs, state) {
  songs = allSongs;
  plays = state.plays;
  emit();
}

export const playCount = (song) => plays[song.id]?.count ?? 0;

// Counts one play. The Worker's answer wins, so the other device's plays are kept.
export async function countPlay(song) {
  const saved = await recordPlay(song.id);
  if (!saved) return;
  plays[song.id] = saved;
  emit();
}

// Last `n` songs played, newest first. Songs no longer in the library are skipped.
export const recentSongs = (n) =>
  songs.filter((s) => plays[s.id]).sort((a, b) => plays[b.id].last - plays[a.id].last).slice(0, n);

