import { audio, seek } from "../player.js";
import { fetchLyrics, makeAiLyrics, saveLyrics } from "../data/api.js";
import { openLyricsEditor } from "./lyrics-editor.js";
import { openLyricsSearch } from "./lyrics-search.js";
import { askRemoveLyrics } from "./lyrics-remove.js";

// Synced lyrics panel (Now playing). Shows the song's LRC lines, highlights the line being sung
// and keeps it in the middle; tap a line to jump there. Lyrics are text from outside, so
// they are only ever set with textContent.
export function wireLyrics(box) {
  let lines = [];  // [{ t: seconds, el: button }]
  let cur = -1;
  let shown = null; // song whose lyrics are in the box
  let text = "";    // its lyrics text, for "Edit lyrics"

  box.addEventListener("click", (e) => {
    if (e.target.closest(".np-lyrics-remove")) return askRemoveLyrics(shown);
    if (e.target.closest(".np-lyrics-make")) return makeAi(shown);
    if (e.target.closest(".np-lyrics-ok")) return looksGood(shown);
    if (e.target.closest(".np-lyrics-own")) return edit();
    if (e.target.closest(".np-lyrics-find")) return openLyricsSearch(shown);
    const b = e.target.closest("button[data-i]");
    if (b) seek(lines[+b.dataset.i].t);
  });

  // Add your own / Edit lyrics: after saving, the song points at the new key and is drawn again.
  function edit() {
    const song = shown;
    openLyricsEditor(song, text, (key) => {
      song.lyricsKey = key;
      delete song.lyricsSource; // own lyrics are no AI draft (the Worker clears it too)
      if (shown === song) { shown = null; show(song); }
      changed();
    });
  }
  audio.addEventListener("timeupdate", highlight);
  // Lyrics saved from the Search lyrics pop-up (here or the song ⋯ menu): redraw if this song is shown.
  document.addEventListener("lyrics-saved", (e) => { delete e.detail.lyricsSource; redraw(e.detail); });

  // Tells the lyrics filter key (lyrics-filter.js) to recount. Search / Remove fire "lyrics-saved" instead.
  const changed = () => document.dispatchEvent(new Event("lyrics-changed"));
  function redraw(song) { if (song === shown) { shown = null; show(song); } }

  // "Make with AI" (B-43): Whisper writes timed lyrics, marked as an AI draft.
  async function makeAi(song) {
    message("Making lyrics with AI…");
    try {
      Object.assign(song, await makeAiLyrics(song.id));
      delete song.lyricsRemoved;
      redraw(song);
      changed();
    } catch (err) {
      if (shown !== song) return;
      message(err.status === 429 ? "AI limit reached for today. Try again tomorrow."
        : err.status === 422 ? "AI found no singing in this song." : "AI lyrics failed. Try again.", song);
    }
  }

  // "Looks good": saves the same text as your own, which clears the AI draft mark.
  async function looksGood(song) {
    try {
      song.lyricsKey = await saveLyrics(song.id, text);
      delete song.lyricsSource;
      redraw(song);
      changed();
    } catch { alert("Not saved. Try again."); }
  }

  function message(text, song) {
    lines = [];
    box.innerHTML = `<p class="np-lyrics-msg"><span></span></p>`;
    box.firstChild.firstChild.textContent = text;
    if (song) box.firstChild.append(findLink(), key("np-lyrics-own np-lyrics-make", "Make with AI"), ownButton("Add your own"));
  }

  const ownButton = (label) => key("np-lyrics-own", label);

  function highlight() {
    if (!lines.length) return;
    let i = lines.length - 1;
    while (i >= 0 && lines[i].t > audio.currentTime + 0.2) i--;
    if (i === cur) return;
    lines[cur]?.el.classList.remove("on");
    cur = i;
    const el = lines[cur]?.el;
    if (!el) return;
    el.classList.add("on");
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2, behavior: "smooth" });
  }

  // Load and draw the lyrics of this song (once per song).
  async function show(song) {
    if (!song || song === shown) return;
    shown = song;
    text = "";
    cur = -1;
    box.scrollTop = 0; // new song starts at the top, not where the last one ended
    if (!song.lyricsKey) return message("No lyrics", song);
    message("");
    const got = await fetchLyrics(song.lyricsKey);
    if (shown !== song) return; // song changed while loading
    if (!got) return message("Lyrics not loaded");
    text = got;
    lines = parse(text);
    box.textContent = "";
    if (!lines.length) { if (plain(text)) box.append(ownButton("Edit lyrics"), removeButton()); else message("No lyrics", song); return; }
    if (song.lyricsSource === "ai") box.append(aiBar());
    lines.forEach((l, i) => {
      l.el = document.createElement("button");
      l.el.dataset.i = i;
      l.el.textContent = l.text || " ";
      box.append(l.el);
    });
    box.append(ownButton("Edit lyrics"), removeButton());
    highlight();
  }
  return show;

  // Lyrics with no time stamps: just text to scroll, no highlight, no tap.
  function plain(text) {
    const rows = text.split(/\r?\n/).map((r) => r.trim());
    if (!rows.some(Boolean)) return false;
    for (const r of rows) {
      const p = document.createElement("p");
      p.className = "line";
      p.textContent = r || " ";
      box.append(p);
    }
    return true;
  }
}

// "Remove lyrics" key, after "Edit lyrics" (B-46).
const removeButton = () => key("np-lyrics-own np-lyrics-remove", "Remove lyrics");

function key(className, label) {
  const b = document.createElement("button");
  b.className = className;
  b.textContent = label;
  return b;
}

// Bar over AI lyrics (B-43): "AI draft" tag, Edit, Looks good.
function aiBar() {
  const bar = document.createElement("div");
  bar.className = "np-lyrics-ai";
  const tag = document.createElement("span");
  tag.textContent = "AI draft";
  bar.append(tag, key("np-lyrics-own", "Edit"), key("np-lyrics-own np-lyrics-ok", "Looks good"));
  return bar;
}

// "Find lyrics" key: opens the in-app Search lyrics pop-up (B-42).
function findLink() {
  const b = document.createElement("button");
  b.className = "np-lyrics-find";
  b.textContent = "Find lyrics";
  return b;
}

// "[01:02.50][02:10.00]Some words" → one line per time stamp, sorted by time.
function parse(text) {
  const out = [];
  for (const row of text.split(/\r?\n/)) {
    const words = row.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of row.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)) out.push({ t: +m[1] * 60 + +m[2], text: words });
  }
  return out.sort((a, b) => a.t - b.t);
}
