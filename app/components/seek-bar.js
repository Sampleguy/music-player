import { audio, seek } from "../player.js";
import { time } from "./track-row.js";

export const seekBarHtml = `<div class="seek"><span class="pos">0:00</span><input type="range" min="0" max="0" step="0.1" value="0" aria-label="Seek"><span class="dur">0:00</span></div>`;

// Wires a seekBarHtml block (or any box with one range input, .pos and .dur) to the one <audio>.
// --p on the input = played part in %, for themes that draw the fill themselves (Retro). Used by the mini player and the now playing screen.
export function wireSeekBar(el) {
  const bar = el.querySelector("input");
  const pos = el.querySelector(".pos");
  const dur = el.querySelector(".dur");
  let dragging = false;
  const fill = () => bar.style.setProperty("--p", `${(bar.value / bar.max) * 100 || 0}%`);
  const show = () => {
    bar.max = audio.duration || 0;
    dur.textContent = time(audio.duration);
    if (!dragging) { bar.value = audio.currentTime; pos.textContent = time(audio.currentTime); }
    fill();
  };
  bar.addEventListener("input", () => { dragging = true; pos.textContent = time(+bar.value); fill(); });
  bar.addEventListener("change", () => { dragging = false; seek(+bar.value); });
  audio.addEventListener("durationchange", show);
  audio.addEventListener("timeupdate", show);
  audio.addEventListener("error", () => { bar.max = bar.value = 0; pos.textContent = dur.textContent = "0:00"; });
  show();
}
