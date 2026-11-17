import { removeLyrics } from "../data/api.js";

// Remove lyrics (B-46): asks first, then the Worker deletes them. Fires "lyrics-saved" so the panel shows "No lyrics".
export async function askRemoveLyrics(song) {
  if (!confirm(`Remove lyrics for ${song.title}?`)) return;
  try {
    await removeLyrics(song.id);
    song.lyricsKey = null;
    song.lyricsRemoved = true;
    document.dispatchEvent(new CustomEvent("lyrics-saved", { detail: song }));
  } catch { alert("Not removed. Check the internet and try again."); }
}
