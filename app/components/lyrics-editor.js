import { audio, current, seek } from "../player.js";
import { saveLyrics } from "../data/api.js";

// Add or edit your own lyrics for the playing song.
// Paste: a text box; lines with [mm:ss.xx] stay timed, else the lyrics are plain.
// Sync: plays the song from the start; each tap on the big button stamps the time on the next line.
// onSaved(newKey) runs after the Worker saved it. Lyrics are only set with textContent / value.
export function openLyricsEditor(song, text, onSaved) {
  const d = document.createElement("dialog");
  d.className = "sheet ly-edit";
  d.innerHTML = `
    <p class="title"></p>
    <div class="ly-tabs"><button data-act="paste" class="on">Paste</button><button data-act="sync">Sync</button></div>
    <textarea spellcheck="false" placeholder="Paste lyrics here. One line per row."></textarea>
    <div class="ly-sync" hidden>
      <p class="ly-done"></p>
      <p class="ly-next"></p>
      <button class="ly-tap" data-act="tap">Tap</button>
      <div class="ly-row"><button data-act="undo">Undo</button><button data-act="restart">Restart</button></div>
    </div>
    <p class="ly-msg" role="status"></p>
    <div class="ly-row"><button data-act="cancel">Cancel</button><button data-act="save" class="on">Save</button></div>`;
  const $ = (s) => d.querySelector(s);
  const box = $("textarea");
  $(".title").textContent = `Lyrics · ${song.title}`;
  box.value = text || "";

  let rows = [], stamps = [];
  const acts = {
    paste: () => mode(false),
    sync: () => mode(true),
    tap: () => {
      if (current() !== song) return say(CHANGED);
      if (stamps.length < rows.length) stamps.push(audio.currentTime);
      draw();
    },
    undo: () => { stamps.pop(); draw(); },
    restart: () => {
      if (current() !== song) return say(CHANGED);
      stamps = [];
      seek(0);
      audio.play().catch(() => {});
      draw();
    },
    cancel: () => d.close(),
    save,
  };
  d.addEventListener("click", (e) => acts[e.target.closest("button[data-act]")?.dataset.act]?.());
  d.addEventListener("close", () => d.remove());

  function mode(sync) {
    $("[data-act=paste]").classList.toggle("on", !sync);
    $("[data-act=sync]").classList.toggle("on", sync);
    box.hidden = sync;
    $(".ly-sync").hidden = !sync;
    say("");
    if (!sync) return;
    rows = box.value.split(/\r?\n/).map((r) => r.replace(/\[[^\]]*\]/g, "").trim()).filter(Boolean);
    if (!rows.length) { mode(false); return say("Paste the lyrics first."); }
    stamps = [];
    draw();
    acts.restart();
  }

  // Shows the last stamped line and the next one, and writes the result into the text box.
  function draw() {
    const n = stamps.length;
    $(".ly-done").textContent = n ? `${stamp(stamps[n - 1])} ${rows[n - 1]}` : "Tap when the first line starts.";
    $(".ly-next").textContent = n < rows.length ? rows[n] : "All lines done. Save.";
    $(".ly-tap").disabled = n >= rows.length;
    say(`${n} / ${rows.length}`);
    box.value = rows.map((r, i) => (i < n ? stamp(stamps[i]) : "") + r).join("\n");
  }

  async function save() {
    const value = box.value.trim();
    if (!value) return say("Nothing to save.");
    const lines = value.split(/\r?\n/).filter((r) => r.replace(/\[[^\]]*\]/g, "").trim());
    const timed = lines.filter((r) => /\[\d+:\d+(\.\d+)?\]/.test(r)).length;
    if (timed && timed < lines.length) return say(`Lines with no time: ${lines.length - timed}. Sync them all, or remove all times.`);
    say("Saving…");
    try {
      const key = await saveLyrics(song.id, value);
      d.close();
      onSaved(key);
    } catch { say("Not saved. Check the internet and try again."); }
  }

  function say(t) { $(".ly-msg").textContent = t; }
  document.body.append(d);
  d.showModal();
}

const CHANGED = "Another song is playing. Play this song again, then Restart.";

// 83.456 → "[01:23.45]"
function stamp(sec) {
  const cs = Math.floor(sec * 100), m = Math.floor(cs / 6000);
  return `[${String(m).padStart(2, "0")}:${((cs % 6000) / 100).toFixed(2).padStart(5, "0")}]`;
}
