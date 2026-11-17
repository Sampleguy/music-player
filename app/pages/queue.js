import { trackRow } from "../components/track-row.js";
import { icon } from "../components/icons.js";
import * as q from "../queue.js";
import { onChange, playSong } from "../player.js";
import { chunkedList } from "../components/chunked-list.js";

const LATER = 50; // compact views: how many songs of the play order to show after "up next"
const isFull = () => document.documentElement.dataset.view === "full"; // full library: whole order, 100 at a time
let stopChunks = null;
const REMOVE = `<button class="row-btn" data-act="remove" aria-label="Remove">${icon("close")}</button>`;
export const REPEAT_LABEL = { off: "Repeat: off", all: "Repeat: all", one: "Repeat: one" };

// Queue screen: now playing, up next (removable), then the play order. Shuffle + repeat here.
let dialog;

export function openQueue() {
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.className = "queue";
    dialog.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "close") dialog.close();
      if (act === "shuffle") q.toggleShuffle();
      if (act === "repeat") q.cycleRepeat();
      const row = e.target.closest(".track");
      if (act === "remove") return q.removeUpNext(Number(row.dataset.i));
      if (act || !row) return;
      // Tap a song: jump straight to it and play.
      const k = Number(row.dataset.i);
      const list = row.closest("[data-list]")?.dataset.list;
      if (list === "later") playSong(q.jumpLater(k));
      if (list === "next") playSong(q.jumpUpNext(k));
    });
    q.onQueueChange(draw);
    onChange(draw);
    new MutationObserver(draw).observe(document.documentElement, { attributeFilter: ["data-view"] }); // view switch: full ↔ capped list
    document.body.append(dialog);
    // Typing in search while the queue sits in the page → back to the song list with results.
    document.addEventListener("input", (e) => { if (e.target.closest(".search") && dialog.open && !dialog.matches(":modal")) dialog.close(); });
  }
  draw();
  if (dialog.open) return;
  // A look can ask for the queue in the page instead of a pop-up by setting --inline: 1
  // (Retro on Mac: it takes the song list's place, under the search box and chips).
  if (getComputedStyle(dialog).getPropertyValue("--inline").trim() === "1") {
    document.querySelector(".results")?.after(dialog);
    dialog.show();
  } else dialog.showModal();
}

function draw() {
  if (!dialog) return;
  stopChunks?.();
  stopChunks = null;
  const now = q.nowSong();
  const upNext = q.upNextSongs();
  const full = isFull();
  const later = q.laterSongs(full ? Infinity : LATER);
  const list = (songs, button, name = "") => `<ul class="tracks" data-list="${name}">${songs.map((s, i) => trackRow(s, i, button)).join("")}</ul>`;
  dialog.innerHTML = `
    <header><h2>Queue <span class="jp" lang="ja">次</span></h2><button data-act="close"><span class="q-done">Done</span><span class="q-back">Back</span></button></header>
    <div class="modes">
      <button data-act="shuffle" class="${q.isShuffle() ? "on" : ""}">${icon("shuffle")} Shuffle: ${q.isShuffle() ? "on" : "off"}</button>
      <button data-act="repeat" class="${q.repeatMode() !== "off" ? "on" : ""}">${icon("repeat")} ${REPEAT_LABEL[q.repeatMode()]}</button>
    </div>
    ${now ? `<h3>Now playing</h3>${list([now], "")}` : ""}
    ${upNext.length ? `<h3>Up next</h3>${list(upNext, REMOVE, "next")}` : ""}
    ${later.length ? `<h3>Then</h3>${full ? `<ul class="tracks" data-list="later"></ul><div class="more"></div>` : list(later, "", "later")}` : ""}`;
  if (full && later.length) stopChunks = chunkedList(dialog.querySelector("[data-list=later]"), dialog.querySelector(".more"), later, (s, i) => trackRow(s, i, ""));
}
