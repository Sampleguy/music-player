import { trackRow } from "../components/track-row.js";
import { playWithLyrics } from "./now-playing.js";
import { recentSongs, playCount, onPlaysChange } from "../data/plays.js";

const SHOW = 50;

// Recently played: last 50 songs, newest first, with play counts. Tap plays the list from there.
let dialog;

export function openRecent() {
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.className = "queue";
    dialog.addEventListener("click", (e) => {
      if (e.target.closest("[data-act]")?.dataset.act === "close") return dialog.close();
      const row = e.target.closest(".track");
      if (!row) return;
      playWithLyrics(recentSongs(SHOW), Number(row.dataset.i));
    });
    onPlaysChange(draw);
    document.body.append(dialog);
  }
  draw();
  dialog.showModal();
}

function draw() {
  if (!dialog) return;
  const songs = recentSongs(SHOW);
  const count = (s) => `<span class="row-btn count">${playCount(s)}×</span>`;
  dialog.innerHTML = `
    <header><h2>Recently played</h2><button data-act="close">Done</button></header>
    ${songs.length ? `<ul class="tracks">${songs.map((s, i) => trackRow(s, i, count(s))).join("")}</ul>`
      : `<p class="empty">Nothing yet. A song shows here after 30 s of play.</p>`}`;
}
