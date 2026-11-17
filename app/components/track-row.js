import { icon } from "./icons.js";

// One song row: cover, title, artist, album (Full library only), length (Classic hides it). Reused by library, search, playlists.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function coverHtml(song) {
  return song?.coverKey
    ? `<img class="cover" src="/${esc(song.coverKey)}" alt="" loading="lazy">`
    : `<div class="cover"></div>`;
}

export const time = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

const MORE = `<button class="row-btn key sm" data-act="menu" aria-label="More">${icon("more")}</button>`;

// `button`: the action at the end of the row (More menu by default, Remove in the queue).
export function trackRow(song, i, button = MORE) {
  return `<li class="track" data-i="${i}" data-id="${song.id}">
    ${coverHtml(song)}
    <div class="meta"><div class="title">${esc(song.title)}</div><div class="artist">${esc(song.artist)}</div></div>
    <span class="album">${esc(song.album || "")}</span>
    <span class="t">${time(song.duration)}</span>
    ${button}
  </li>`;
}
