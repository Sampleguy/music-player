// What plays next: the play order (library or shuffled), "up next" songs, repeat mode.
// Plain logic, no sound and no screen. player.js asks it which song to load.
let source = [];   // songs the order is made from (the library)
let order = [];    // indexes into source, in play order
let pos = -1;      // where we are in order
let upNext = [];   // "play next" / "add to queue" songs; they play before order continues
let now = null;    // the song loaded now
let shuffle = false;
let repeat = "off"; // "off" | "all" | "one"

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
export const onQueueChange = (fn) => listeners.add(fn);

export const nowSong = () => now;
export const isShuffle = () => shuffle;
export const repeatMode = () => repeat;
export const upNextSongs = () => upNext;
// The song "next" would load, without moving there (for prefetch). null at the end of the list.
export const peekNext = () => upNext[0] ?? source[order[pos + 1]] ?? null;
export const laterSongs = (max) => order.slice(pos + 1, pos + 1 + max).map((i) => source[i]);

const range = (n) => [...Array(n).keys()];
function mixed(list) { // Fisher–Yates: every order equally likely, each song once
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
// Shuffled order that starts with `first` (or any song if none given).
const shuffledFrom = (first) => (first == null ? mixed(range(source.length)) : [first, ...mixed(range(source.length).filter((i) => i !== first))]);

function at(p) {
  pos = p;
  now = source[order[pos]];
  emit();
  return now;
}

export function setSource(songs) {
  source = songs;
  order = range(songs.length);
  pos = -1;
}

// User tapped song i of the library.
export function start(i) {
  if (!source[i]) return null;
  order = shuffle ? shuffledFrom(i) : range(source.length);
  return at(shuffle ? 0 : i);
}

// Song end or "next". Returns the song to load, or null to stop (end of list, repeat off).
export function advance() {
  if (upNext.length) {
    now = upNext.shift();
    emit();
    return now;
  }
  if (pos + 1 < order.length) return at(pos + 1);
  if (repeat === "off" || !order.length) return null;
  if (shuffle) {
    const last = order[pos];
    order = mixed(range(source.length));
    // Don't play the same song twice in a row across the new mix.
    if (order.length > 1 && order[0] === last) [order[0], order[order.length - 1]] = [order[order.length - 1], order[0]];
  }
  return at(0);
}

// "Previous": the song before in play order; wraps only with repeat all.
export function back() {
  if (pos > 0) return at(pos - 1);
  if (repeat === "all" && order.length) return at(order.length - 1);
  return pos === 0 ? at(0) : null;
}

export function playNext(song) { upNext.unshift(song); emit(); }
export function addToQueue(song) { upNext.push(song); emit(); }
export function removeUpNext(k) { upNext.splice(k, 1); emit(); }

// Tap in the queue. "Then" row k: move there, the order after it stays. "Up next" row k: play it now, out of up next.
export const jumpLater = (k) => (pos + 1 + k < order.length ? at(pos + 1 + k) : null);
export function jumpUpNext(k) {
  const [song] = upNext.splice(k, 1);
  if (!song) return null;
  now = song;
  emit();
  return song;
}

// Shuffle on: current song stays, the rest is mixed. Off: library order from the current song.
export function toggleShuffle() {
  shuffle = !shuffle;
  // Anchor on the song playing now (it may have come from "up next"), not the old spot.
  const i = source.indexOf(now);
  const cur = i >= 0 ? i : null;
  order = shuffle ? shuffledFrom(cur) : range(source.length);
  pos = cur == null ? -1 : shuffle ? 0 : cur;
  emit();
}

export function cycleRepeat() {
  repeat = { off: "all", all: "one", one: "off" }[repeat];
  emit();
}
