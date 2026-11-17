import { icon } from "./icons.js";
import { openPlaylists } from "../pages/playlists.js";
import { openRecent } from "../pages/recent.js";
import { openThemePicker } from "./theme-picker.js";
import { openImport } from "./import-dialog.js";
import { wireViewKey } from "./view-switch.js";

// Top of the home screen: Library bar (name + song count, Grid / List + lyrics filter keys (search.js fills .lib-keys),
// on Mac also the Full library key; Classic shows only the keys), then one LCD screen with the
// clock (time + date) and the greeting. Also fills the brand row's small keys (every look: playlists /
// recent / theme / import, top right).
// Greeting by local hour (F-22): [Japanese, romaji], plus the name set in the Theme sheet (none by default).
function greeting(h) {
  return h >= 5 && h < 11 ? ["おはよう", "ohayō"] : h >= 11 && h < 17 ? ["こんにちは", "konnichiwa"]
    : h >= 17 && h < 22 ? ["こんばんは", "konbanwa"] : ["おやすみ", "oyasumi"];
}

export function showHomeTop(root, songs) {
  root.innerHTML = `
    <div class="bar"><b>Library</b><span class="jp" lang="ja">ライブラリ</span><span class="count">${songs.length} songs</span><span class="lib-tools"><span class="lib-keys"></span><button class="key alt view-key"></button></span></div>
    <div class="lcd clock">
      <div class="c-row"><span class="c-time"></span><span class="c-date"></span></div>
      <p class="hello" lang="ja"></p>
      <p class="romaji"></p>
    </div>`;
  const keys = document.querySelector(".brand-keys");
  keys.innerHTML = `
    <button class="key" data-open="pl" aria-label="Playlists">${icon("note")}</button>
    <button class="key" data-open="recent" aria-label="Recently played">${icon("clock")}</button>
    <button class="key" data-open="theme" aria-label="Theme">${icon("palette")}</button>
    <button class="key" data-open="import" aria-label="Import songs">${icon("import")}</button>`;
  const opens = { pl: openPlaylists, recent: openRecent, theme: openThemePicker, import: openImport };
  keys.onclick = (e) => opens[e.target.closest("[data-open]")?.dataset.open]?.();

  wireViewKey(root.querySelector(".view-key")); // Mac only: Full library ↔ Back to player
  const $ = (s) => root.querySelector(s);
  const tick = () => {
    const now = new Date();
    $(".c-time").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $(".c-date").textContent = now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
    const [jp, ro] = greeting(now.getHours());
    let name = "";
    try { name = localStorage.getItem("name") || ""; } catch {}
    $(".hello").textContent = name ? `${jp} ${name}` : jp;
    $(".romaji").textContent = ro;
  };
  tick();
  setInterval(tick, 10000);
  addEventListener("name-change", tick); // theme-picker.js: name edited
}
