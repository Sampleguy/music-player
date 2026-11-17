import { audio, onChange, toggle, next, prev, current } from "../player.js";
import { coverHtml } from "./track-row.js";
import { openQueue } from "../pages/queue.js";
import { icon } from "./icons.js";
import { seekBarHtml, wireSeekBar } from "./seek-bar.js";
import { openNowPlaying } from "../pages/now-playing.js";

// Bottom bar: cover + title (tap: now playing screen), prev / play-pause / next / queue, seek bar (other keys: top right, home-top.js). Space bar toggles play.
export function showMiniPlayer(root) {
  root.innerHTML = `
    <div class="now"><div class="cover"></div><div class="meta"><div class="title">Pick a song</div><div class="artist"></div></div></div>
    <div class="controls">
      <button class="prev" aria-label="Previous">${icon("prev")}</button>
      <button class="toggle" aria-label="Play">${icon("play")}</button>
      <button class="next" aria-label="Next">${icon("next")}</button>
      <button class="queue-btn" aria-label="Queue">${icon("queue")}</button>
    </div>
    <p class="msg" hidden></p>
    ${seekBarHtml}`;
  const $ = (s) => root.querySelector(s);
  wireSeekBar($(".seek"));

  $(".prev").onclick = prev;
  $(".next").onclick = next;
  $(".toggle").onclick = toggle;
  $(".queue-btn").onclick = openQueue;
  $(".now").onclick = () => current() && openNowPlaying();

  onChange((song) => {
    $(".now").innerHTML = `${coverHtml(song)}<div class="meta"><div class="title"></div><div class="artist"></div></div>`;
    $(".now .title").textContent = song.title;
    $(".now .artist").textContent = song.artist;
    $(".msg").hidden = true;
    // Playing cover as a CSS variable, for looks that paint it behind everything (Glass). Others ignore it.
    document.documentElement.style.setProperty("--art", song.coverKey ? `url("/${song.coverKey}")` : "none");
  });

  const setIcon = () => {
    $(".toggle").innerHTML = icon(audio.paused ? "play" : "pause");
    $(".toggle").setAttribute("aria-label", audio.paused ? "Play" : "Pause");
  };
  // Song not saved on this device and no internet (or a load error): say so, stay usable.
  audio.addEventListener("error", () => {
    $(".msg").hidden = false;
    $(".msg").textContent = navigator.onLine ? "Could not load this song." : "Not saved on this device. Needs internet.";
    $(".toggle").innerHTML = icon("play"); // nothing plays, even if the element still says "not paused"
  });
  audio.addEventListener("play", setIcon);
  audio.addEventListener("pause", setIcon);

  // Skip when typing in a text box. preventDefault stops page scroll and a focused button
  // also firing its own click (buttons click on keyup, so block that too).
  const isSpace = (e) => e.code === "Space" && !e.target.closest("input:not([type=range]), textarea");
  document.addEventListener("keydown", (e) => {
    if (!isSpace(e)) return;
    e.preventDefault();
    if (!e.repeat) toggle();
  });
  document.addEventListener("keyup", (e) => isSpace(e) && e.preventDefault());
}
