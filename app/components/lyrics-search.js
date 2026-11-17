import { searchLyrics, saveLyrics } from "../data/api.js";
import { cleanTitle, mainArtist } from "../data/track-rules.js";

// Search lyrics pop-up (B-42): LRCLIB results through the Worker, one tap saves one as the song's lyrics.
// After saving it fires "lyrics-saved" (detail = song) so the lyrics panel redraws. Text from outside: textContent only.
export function openLyricsSearch(song) {
  const d = document.createElement("dialog");
  d.className = "sheet ly-search";
  d.innerHTML = `
    <p class="title"></p>
    <form class="ly-row"><input type="search" enterkeyhint="search" aria-label="Search lyrics"><button class="on">Search</button></form>
    <p class="msg" role="status"></p>
    <ul class="ly-results"></ul>
    <button data-act="close">Cancel</button>`;
  const $ = (s) => d.querySelector(s);
  const input = $("input"), list = $(".ly-results");
  $(".title").textContent = `Lyrics · ${song.title}`;
  input.value = `${cleanTitle(song.title) || song.title} ${mainArtist(song.artist) || song.artist}`;
  let results = [];

  $("form").addEventListener("submit", (e) => { e.preventDefault(); search(); });
  d.addEventListener("click", (e) => {
    if (e.target.closest("[data-act=close]") || e.target === d) return d.close();
    const li = e.target.closest("button[data-i]");
    if (li) save(results[+li.dataset.i]);
  });
  d.addEventListener("close", () => d.remove());

  async function search() {
    const q = input.value.trim();
    if (!q) return;
    list.textContent = "";
    say("Searching…");
    try { results = await searchLyrics(q); } catch { return say("Search failed. Check the internet and try again."); }
    say(results.length ? "Tap one to use it." : "Nothing found. Try fewer words.");
    results.forEach((r, i) => {
      const b = document.createElement("button");
      b.dataset.i = i;
      b.innerHTML = `<span class="ly-name"></span><span class="ly-info"></span><span class="ly-badge"></span>`;
      b.querySelector(".ly-name").textContent = `${r.title} · ${r.artist}`;
      b.querySelector(".ly-info").textContent = `${time(r.duration)} (song ${time(song.duration)})`;
      b.querySelector(".ly-badge").textContent = r.synced ? "Synced" : "Plain";
      b.querySelector(".ly-badge").classList.toggle("on", r.synced);
      const li = document.createElement("li");
      li.append(b);
      list.append(li);
    });
  }

  async function save(r) {
    say("Saving…");
    try {
      song.lyricsKey = await saveLyrics(song.id, r.lyrics);
      delete song.lyricsRemoved;
      d.close();
      document.dispatchEvent(new CustomEvent("lyrics-saved", { detail: song }));
    } catch { say("Not saved. Check the internet and try again."); }
  }

  function say(t) { $(".msg").textContent = t; }
  document.body.append(d);
  d.showModal();
  search();
}

// 83.4 → "1:23"
const time = (s) => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
