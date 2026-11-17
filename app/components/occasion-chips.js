import { allPlaylists, playlistSongs, onPlaylistsChange } from "../data/playlists.js";
import { playWithLyrics } from "../pages/now-playing.js";

// Occasion selector under the search box: one chip per playlist (named by occasion).
// Tap = play that playlist from the start. No playlists: the row is hidden.
export function wireChips(box) {
  const draw = () => {
    const lists = allPlaylists().filter((p) => playlistSongs(p).length);
    box.hidden = !lists.length;
    box.textContent = "";
    lists.forEach((p) => {
      const b = document.createElement("button");
      b.className = "chip key";
      b.textContent = p.name; // names are typed by the owner: text only, never HTML
      b.onclick = () => playWithLyrics(playlistSongs(p), 0);
      box.append(b);
    });
  };
  onPlaylistsChange(draw);
  draw();
}
