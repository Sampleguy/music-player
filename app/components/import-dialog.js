import { readFile, uploadFile } from "../data/import.js";
import { lookupLyrics, makeAiLyrics } from "../data/api.js";
import { allSongs } from "../data/plays.js";

// Import pop-up (B-33, check step B-44): pick MP3/M4A files (iPhone Files app or Mac). Each file is read on the
// device first and shown as one row: cover (tap to pick an image), title + artist (editable), lyrics badge from a
// live LRCLIB lookup (Search again after an edit). Add all uploads them one at a time with a status line each;
// a song with no lyrics then gets AI lyrics (B-43) until the daily limit. One failure never stops the rest.
// onImported(fn) gets the new tracks when the run ends.
let dialog, items = [], running = false;
const listeners = new Set();
export const onImported = (fn) => listeners.add(fn);
const BADGE = { synced: "✓ Synced", plain: "Plain", none: "None", ai: "AI" };
const $ = (s) => dialog.querySelector(s);

function lockButtons(on) {
  running = on;
  for (const b of dialog.querySelectorAll("[data-act=pick], [data-act=close], [data-act=add], .files button, .files input")) b.disabled = on;
}

// Plain status line (skipped or unreadable file).
function line(name, state) {
  const li = document.createElement("li");
  li.innerHTML = `<span class="name"></span><span class="state"></span>`;
  li.querySelector(".name").textContent = name;
  li.querySelector(".state").textContent = state;
  return li;
}

// Check row for one read file. Keeps its elements on the item.
function row(item) {
  const li = document.createElement("li");
  li.className = "check";
  li.innerHTML = `<label class="pic"><img alt=""><span>Cover</span><input type="file" accept="image/*" hidden></label>
    <div class="fields"><input class="t" aria-label="Title"><input class="a" aria-label="Artist">
      <span class="badge"></span> <span class="state"></span><button class="again" hidden>Search again</button></div>`;
  const q = (s) => li.querySelector(s);
  const img = q("img"), pick = q("input[type=file]");
  const show = () => { img.hidden = !item.cover; q(".pic span").hidden = !!item.cover; if (item.cover) img.src = URL.createObjectURL(item.cover); };
  show();
  pick.onchange = () => pick.files[0] && ((item.cover = pick.files[0]), show());
  q(".t").value = item.fields.title;
  q(".a").value = item.fields.artist;
  const edited = () => (q(".again").hidden = running || (q(".t").value.trim() === item.looked.title && q(".a").value.trim() === item.looked.artist));
  q(".t").oninput = q(".a").oninput = edited;
  q(".again").onclick = () => lookup(item);
  Object.assign(item, { li, edited, badge: q(".badge"), state: q(".state") });
  return li;
}

// Edited title/artist → fields (empty box keeps the tag value).
function takeEdits(item) {
  const t = item.li.querySelector(".t").value.trim(), a = item.li.querySelector(".a").value.trim();
  Object.assign(item.fields, { title: t || item.fields.title, artist: a || item.fields.artist });
}

async function lookup(item) {
  if (item.sent) return;
  takeEdits(item);
  item.looked = { title: item.fields.title, artist: item.fields.artist };
  item.edited();
  item.badge.textContent = "Lyrics…";
  let kind = "?";
  try { kind = await lookupLyrics(item.fields); } catch {}
  if (item.sent) return; // Add all started meanwhile: the upload sets the badge
  item.kind = kind;
  item.badge.textContent = BADGE[kind] || "Lyrics: ?";
}

async function pickFiles(files) {
  lockButtons(true);
  const list = $(".files");
  list.replaceChildren();
  items = [];
  const have = new Set(allSongs().map((s) => s.id));
  for (const [i, file] of files.entries()) {
    $(".msg").textContent = `Reading ${i + 1} of ${files.length}…`;
    try {
      const item = await readFile(file, have);
      if (!item) { list.append(line(file.name, "Already in library")); continue; }
      item.looked = {};
      items.push(item);
      list.append(row(item));
    } catch (e) { list.append(line(file.name, "Failed: " + e.message)); }
  }
  lockButtons(false);
  $("[data-act=add]").hidden = !items.length;
  $(".msg").textContent = items.length ? "Check the details, then Add all." : "Nothing new to add.";
  for (const item of items) await lookup(item); // one at a time: polite to LRCLIB
}

async function addAll() {
  lockButtons(true);
  for (const item of items) item.li.querySelector(".again").hidden = true;
  const added = [];
  let failed = 0, ai = true; // ai: false after the daily limit is hit
  for (const [i, item] of items.entries()) {
    $(".msg").textContent = `${i + 1} of ${items.length}`;
    item.li.scrollIntoView({ block: "nearest" });
    takeEdits(item);
    item.sent = true;
    item.state.textContent = "Uploading…";
    try {
      const track = await uploadFile(item);
      if (!track) { item.state.textContent = "Already in library"; continue; }
      added.push(track);
      item.state.textContent = "Added";
      if (track.lyricsKey) { if (item.kind === "none") item.badge.textContent = "✓ Found"; continue; }
      item.badge.textContent = BADGE.none;
      if (!ai) { item.state.textContent = "Added, AI limit today"; continue; }
      item.state.textContent = "Making AI lyrics…";
      try {
        Object.assign(track, await makeAiLyrics(track.id));
        item.badge.textContent = BADGE.ai;
        item.state.textContent = "Added";
      } catch (e) {
        if (e.status === 429) ai = false;
        item.state.textContent = e.status === 429 ? "Added, AI limit today" : e.status === 422 ? "Added, no singing found" : "Added, no lyrics";
      }
    } catch (e) {
      failed++;
      item.state.textContent = "Failed: " + e.message;
    }
  }
  $(".msg").textContent = `${added.length} added, ${failed} failed.`;
  lockButtons(false);
  for (const b of dialog.querySelectorAll(".files button, .files input")) b.disabled = true; // done: rows are read-only
  $("[data-act=add]").hidden = true;
  items = [];
  if (added.length) listeners.forEach((fn) => fn(added));
}

export function openImport() {
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.className = "sheet import";
    dialog.innerHTML = `<p class="title">Import songs</p>
      <input type="file" accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a" multiple hidden>
      <button class="on" data-act="pick">Pick MP3 / M4A files…</button>
      <ul class="files"></ul>
      <p class="msg" aria-live="polite"></p>
      <button class="on" data-act="add" hidden>Add all</button>
      <button data-act="close">Close</button>`;
    const input = dialog.querySelector("input");
    input.onchange = () => input.files.length && pickFiles([...input.files]);
    dialog.addEventListener("click", (e) => {
      const act = e.target.dataset.act;
      if (act === "pick") input.click();
      if (act === "add") addAll();
      if (act === "close" || (e.target === dialog && !running)) dialog.close();
    });
    dialog.addEventListener("cancel", (e) => running && e.preventDefault()); // Esc can't close it mid-run
    document.body.append(dialog);
  }
  if (!running) {
    items = [];
    dialog.querySelector("input").value = "";
    dialog.querySelector(".files").replaceChildren();
    dialog.querySelector("[data-act=add]").hidden = true;
    dialog.querySelector(".msg").textContent = "Songs already in the library are skipped.";
  }
  dialog.showModal();
}
