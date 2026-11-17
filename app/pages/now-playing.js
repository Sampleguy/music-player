import { audio, onChange, current, toggle, next, prev } from "../player.js";
import * as q from "../queue.js";
import { icon, swirl } from "../components/icons.js";
import { wireSeekBar } from "../components/seek-bar.js";
import { REPEAT_LABEL, openQueue } from "./queue.js";
import { wireLyrics } from "../components/lyrics-view.js";

// Now playing screen: big cover (or synced lyrics), title, artist, seek bar, prev/play/next, shuffle, repeat.
// Only calls the player's own controls: opening or closing never touches playback.
// Closes with ✕, Esc, or a swipe down. One markup for every theme: Classic hides the Retro-only
// pieces (再生中 tag, level meter, Lyrics/Queue keys, lyrics header) and flattens the wrappers.
let dialog, showLyrics;

// Built once at start (index.html), closed. Retro on wide screens shows the closed dialog as a
// card beside the library (CSS only); everywhere else it only shows when opened.
export function mountNowPlaying() {
  if (!dialog) build();
}

export function openNowPlaying() {
  mountNowPlaying();
  dialog.showModal();
  drawSong(current());
}

function build() {
  dialog = document.createElement("dialog");
  dialog.className = "np";
  dialog.innerHTML = `
    <div class="np-card">
      <div class="np-main">
        <div class="np-top">
          <button class="np-close" data-act="close" aria-label="Close">${icon("close")}</button>
          <button class="np-lyr" data-act="lyrics" aria-label="Lyrics" aria-pressed="false">${icon("mic")}</button>
        </div>
        <div class="np-head"><span class="tag" lang="ja">再生中 · now playing</span>${swirl()}</div>
        <div class="np-art"></div>
        <div class="np-info">
          <div class="np-meta"><div class="title">Pick a song</div><div class="artist"></div>
            <div class="lvl">${"<i></i>".repeat(20)}</div>
            <div class="s-time"><span class="pos">0:00</span><span class="dur">0:00</span></div>
          </div>
          <input type="range" min="0" max="0" step="0.1" value="0" aria-label="Seek">
        </div>
        <div class="np-controls">
          <button data-act="shuffle" aria-label="Shuffle">${icon("shuffle")}</button>
          <button data-act="prev" aria-label="Previous">${icon("prev")}</button>
          <button data-act="toggle" class="np-play" aria-label="Play">${icon("play")}</button>
          <button data-act="next" aria-label="Next">${icon("next")}</button>
          <button data-act="repeat" aria-label="Repeat">${icon("repeat")}<span class="np-one">1</span></button>
        </div>
        <div class="np-keys">
          <button class="key alt np-lykey" data-act="lyrics" aria-pressed="false">${icon("lyrics")}Lyrics <span class="jp" lang="ja">歌詞</span></button>
          <button class="key alt" data-act="queue">${icon("queue")}Queue <span class="jp" lang="ja">次</span></button>
        </div>
      </div>
      <aside class="np-ly" aria-label="Lyrics">
        <div class="ly-head"><span lang="ja">歌詞 · lyrics</span><button class="key sm" data-act="lyrics" aria-label="Close lyrics">${icon("close")}</button></div>
        <div class="np-lyrics"></div>
      </aside>
    </div>`;
  const acts = { close: () => dialog.close(), lyrics: toggleLyrics, shuffle: q.toggleShuffle, repeat: q.cycleRepeat, queue: openQueue, prev, next, toggle };
  dialog.addEventListener("click", (e) => acts[e.target.closest("[data-act]")?.dataset.act]?.());

  // Swipe down closes. A drag that starts on the seek bar is a seek, on the lyrics a scroll, not a swipe.
  // The screen follows the finger, then slides away (or springs back if the pull was short).
  let startY = null;
  const dy = (e) => Math.max(0, e.changedTouches[0].clientY - startY);
  dialog.addEventListener("touchstart", (e) => {
    startY = e.target.closest("input[type=range], .np-lyrics") ? null : e.touches[0].clientY;
    dialog.style.transition = "none";
  }, { passive: true });
  dialog.addEventListener("touchmove", (e) => {
    if (startY === null) return;
    e.preventDefault(); // no page bounce under the finger
    dialog.style.transform = `translateY(${dy(e)}px)`;
  }, { passive: false });
  dialog.addEventListener("touchend", (e) => {
    if (startY === null) return;
    const away = dy(e) > 100;
    startY = null;
    dialog.style.transition = "transform 0.2s ease-out";
    dialog.style.transform = away ? "translateY(100%)" : "";
    if (away) setTimeout(() => { dialog.close(); dialog.style.transform = ""; }, 200);
  });

  wireSeekBar(dialog.querySelector(".np-info"));
  showLyrics = wireLyrics(dialog.querySelector(".np-lyrics"));
  onChange(drawSong);
  q.onQueueChange(drawModes);
  audio.addEventListener("play", drawPlay);
  audio.addEventListener("pause", drawPlay);
  drawModes();
  drawPlay();
  // Level meter (Retro): decoration only, random bars while playing. It never reads the audio.
  const bars = [...dialog.querySelectorAll(".lvl i")];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  setInterval(() => {
    if (!dialog.offsetWidth) return; // not on screen
    const lit = audio.paused ? 3 : still ? 14 : 8 + Math.floor(Math.random() * 11);
    bars.forEach((b, i) => b.classList.toggle("on", i < lit));
  }, 160);
  document.body.append(dialog);
}

function drawSong(song) {
  if (!song) return;
  const key = song.bigCoverKey || song.coverKey;
  dialog.querySelector(".np-art").innerHTML = key ? `<img src="/${key}" alt="">` : "";
  dialog.querySelector(".title").textContent = song.title;
  dialog.querySelector(".artist").textContent = song.artist;
  if (dialog.open || dialog.classList.contains("lyrics")) showLyrics(song);
}

// Lyrics button: swaps the big cover for the lyrics panel and back. Full library (components/view-switch.js) sets it too.
export function setLyrics(on) {
  if (!dialog) return;
  dialog.classList.toggle("lyrics", on);
  dialog.querySelectorAll(".np-lyr, .np-lykey").forEach((b) => b.setAttribute("aria-pressed", on));
  if (on) showLyrics(current());
}
const toggleLyrics = () => setLyrics(!dialog.classList.contains("lyrics"));

function drawPlay() {
  const b = dialog.querySelector(".np-play");
  b.innerHTML = icon(audio.paused ? "play" : "pause");
  b.setAttribute("aria-label", audio.paused ? "Play" : "Pause");
}

function drawModes() {
  const s = dialog.querySelector("[data-act=shuffle]");
  const r = dialog.querySelector("[data-act=repeat]");
  s.classList.toggle("on", q.isShuffle());
  s.setAttribute("aria-label", `Shuffle: ${q.isShuffle() ? "on" : "off"}`);
  r.classList.toggle("on", q.repeatMode() !== "off");
  r.classList.toggle("one", q.repeatMode() === "one");
  r.setAttribute("aria-label", REPEAT_LABEL[q.repeatMode()]);
}
