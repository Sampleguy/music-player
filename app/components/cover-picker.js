import { saveArtistCover } from "../data/api.js";
import { allSongs } from "../data/plays.js";
import { current, redraw } from "../player.js";
import { coverHtml } from "./track-row.js";

// Cover pop-up: "Artist cover" (pick an image, choose which songs by the artist get it) or "Song cover"
// (B-44, this one song only). Save.
// The image is cropped to a square and made into 300×300 + 1000×1000 JPEGs here (canvas, no package).
let dialog, artist, file, songId; // songId set = song cover mode

// Center square crop of the picked image, as a JPEG blob of `size`×`size`.
export async function square(bitmap, size) {
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d").drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return new Promise((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
}

async function save() {
  const $ = (s) => dialog.querySelector(s);
  $(".save").disabled = true;
  $(".msg").textContent = "Saving…";
  try {
    const bitmap = await createImageBitmap(file);
    const [small, big] = await Promise.all([square(bitmap, 300), square(bitmap, 1000)]);
    const mode = songId ? "song" : $("input[name=mode]:checked").value;
    const { ids, coverKey, bigCoverKey } = await saveArtistCover(songId || artist, mode, small, big);
    const changed = new Set(ids);
    for (const s of allSongs()) if (changed.has(s.id)) Object.assign(s, { coverKey, bigCoverKey });
    for (const id of ids) {
      const song = allSongs().find((s) => s.id === id);
      document.querySelectorAll(`.track[data-id="${id}"] .cover`).forEach((el) => (el.outerHTML = coverHtml(song)));
    }
    if (changed.has(current()?.id)) redraw(); // player, now playing, lock screen
    dialog.close();
  } catch (e) {
    $(".msg").textContent = e.message === "No songs to change" ? "All songs by this artist already have a cover." : "Not saved. Try again.";
    $(".save").disabled = false;
  }
}

// one = true: only this song gets the cover.
export function openCoverPicker(song, one = false) {
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.className = "sheet";
    dialog.innerHTML = `<p class="title"></p>
      <input type="file" accept="image/*" hidden>
      <button data-act="pick">Pick image…</button>
      <label class="mode"><input type="radio" name="mode" value="all" checked> All songs by this artist</label>
      <label class="mode"><input type="radio" name="mode" value="missing"> Only songs with no cover</label>
      <p class="msg" aria-live="polite"></p>
      <button class="save on" data-act="save" disabled>Save</button>
      <button data-act="close">Cancel</button>`;
    const input = dialog.querySelector("input[type=file]");
    input.onchange = () => {
      file = input.files[0];
      dialog.querySelector(".msg").textContent = file ? file.name : "";
      dialog.querySelector(".save").disabled = !file;
    };
    dialog.addEventListener("click", (e) => {
      const act = e.target.dataset.act;
      if (act === "pick") input.click();
      if (act === "save") save();
      if (act === "close" || e.target === dialog) dialog.close();
    });
    document.body.append(dialog);
  }
  artist = song.artist;
  songId = one ? song.id : null;
  file = null;
  dialog.querySelectorAll(".mode").forEach((l) => (l.hidden = one));
  dialog.querySelector("input[type=file]").value = "";
  dialog.querySelector(".title").textContent = `Cover for ${one ? song.title : artist}`;
  dialog.querySelector(".msg").textContent = "";
  dialog.querySelector(".save").disabled = true;
  dialog.showModal();
}
