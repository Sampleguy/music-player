// The one <audio> element. Nothing else plays sound. Which song comes next: queue.js.
import * as q from "./queue.js";
import { keepSong } from "./data/cache.js";
import { countPlay } from "./data/plays.js";

export const audio = new Audio();
audio.preload = "auto";

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(current()));

export const current = q.nowSong;
export const onChange = (fn) => listeners.add(fn);
export const setQueue = q.setSource;
export const redraw = emit; // song details changed (e.g. new cover): draw the current song again

// Repeat one = the element's own loop: no "ended" event, keeps going while locked.
q.onQueueChange(() => (audio.loop = q.repeatMode() === "one"));

function load(song) {
  if (!song) return;
  audio.oncanplay = null; // drop a retry left over from an earlier song
  audio.src = "/" + song.audioKey;
  audio.load();
  emit();
  // iOS can refuse play() while locked if the song isn't loaded yet: retry once it can play.
  // If that fails too it stays paused, so the play icon and lock screen show the truth.
  audio.play().catch((e) => {
    console.warn("play blocked, retrying on canplay", e);
    audio.oncanplay = () => {
      audio.oncanplay = null;
      audio.play().catch((e2) => console.warn("play failed", e2));
    };
  });
}

// Tap on a queue row: queue.js picks the song (jumpLater / jumpUpNext).
export const playSong = (song) => load(song);

// Tap on library row i.
export const play = (i) => load(q.start(i));

export function toggle() {
  if (!current()) return play(0);
  audio.paused ? audio.play() : audio.pause();
}

// End of list with repeat off: nothing to load, so the last song plays on and stops at its end.
// No pause() here: pausing mid-load while locked leaves iOS stuck in silence (BUG-01).
export function next() {
  const song = q.advance();
  if (song) load(song);
}

// Like most players: past 3 s, "previous" restarts the song.
export function prev() {
  if (audio.currentTime > 3) audio.currentTime = 0;
  else load(q.back());
}

export function seek(sec) {
  if (Number.isFinite(sec)) audio.currentTime = sec;
}

// Locked iPhone: a song that ends by itself leaves the player paused for a moment, and iOS
// can stop loading the next song: silence (BUG-01). So move on 0.6 s before the end, while
// still playing. "ended" stays as the backup. Repeat one uses loop, so it's left alone.
let movedOn = false;
audio.addEventListener("loadstart", () => (movedOn = false));
audio.addEventListener("timeupdate", () => {
  if (movedOn || audio.loop || audio.paused || audio.duration - audio.currentTime > 0.6) return;
  movedOn = true;
  next();
});
audio.addEventListener("ended", next);

// Device cache: save every song that plays; after 30 s, also save the next one.
audio.addEventListener("playing", () => keepSong(current()));
let prefetched = null;
audio.addEventListener("timeupdate", () => {
  if (audio.currentTime < 30 || prefetched === current()) return;
  prefetched = current();
  keepSong(q.peekNext());
});

// Lock screen, Control Center, AirPods: title/artist/cover + buttons. iOS only shows these
// for the one <audio> element, so this must stay on it (no Web Audio, no second player).
const ms = navigator.mediaSession;
if (ms) {
  // Locked, you can't see the time, so no "restart if past 3 s" rule: always the previous song.
  const prevSong = () => load(q.back());
  const handlers = {
    play: () => audio.play(),
    pause: () => audio.pause(),
    nexttrack: next,
    previoustrack: prevSong,
    seekto: (d) => seek(d.seekTime),
    // iOS Home Screen apps only show "skip 10 s" buttons and never send next/previous
    // (tested B-06), so those buttons change songs instead.
    seekforward: next,
    seekbackward: prevSong,
  };
  for (const [action, fn] of Object.entries(handlers)) {
    try { ms.setActionHandler(action, fn); } catch {} // older Safari lacks some actions
  }

  onChange((song) => {
    ms.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: song.album || "",
      // Big cover only: Safari scores sizes by closeness to 512 and would pick 300 over 1000.
      // Small one only for songs without a big cover.
      artwork: song.bigCoverKey ? [{ src: "/" + song.bigCoverKey, sizes: "1000x1000", type: "image/jpeg" }]
        : song.coverKey ? [{ src: "/" + song.coverKey, sizes: "300x300", type: "image/jpeg" }] : [],
    });
  });

  const syncPosition = () => {
    if (!Number.isFinite(audio.duration)) return;
    try {
      ms.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate });
    } catch {}
  };
  ["loadedmetadata", "seeked", "ratechange", "play", "pause"].forEach((e) => audio.addEventListener(e, syncPosition));
  audio.addEventListener("play", () => (ms.playbackState = "playing"));
  audio.addEventListener("pause", () => (ms.playbackState = "paused"));
}

// Play count: a song counts once it has played 30 s. Back at the start (new song, repeat one
// loop, seek to 0) it can count again.
let counted = false;
audio.addEventListener("timeupdate", () => {
  if (audio.currentTime < 1) counted = false;
  if (counted || audio.currentTime < 30 || !current()) return;
  counted = true;
  countPlay(current());
});
