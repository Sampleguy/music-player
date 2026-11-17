import { readTags } from "./tags.js";
import { TYPES, trackFields } from "./track-rules.js";
import { uploadSong, addSong } from "./api.js";
import { square } from "../components/cover-picker.js";

// App import in two steps (B-44): readFile() on the device only, so the check step can show and edit it,
// then uploadFile() sends it. `have`: Set of ids already in the library; new ids are added so the
// same file twice in one pick is skipped.

// One picked file → {file, ext, id, fields: {title, artist, album, duration}, cover: Blob|null}, or null if already there.
export async function readFile(file, have) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (!Object.hasOwn(TYPES, ext)) throw new Error("Not an MP3 or M4A file");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const id = [...new Uint8Array(await crypto.subtle.digest("SHA-1", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (have.has(id)) return null;
  have.add(id);
  const tags = readTags(bytes, ext);
  if (!tags.duration) throw new Error("Can't read this file"); // no MP3 frame / no M4A movie box found
  return { file, ext, id, fields: trackFields(tags, file.name), cover: tags.picture || null };
}

// Read item → library. Returns the new track, or null if it is already there.
export async function uploadFile({ file, ext, id, fields, cover }) {
  let small = null, big = null;
  if (cover) {
    try {
      const bitmap = await createImageBitmap(cover);
      [small, big] = await Promise.all([square(bitmap, 300), square(bitmap, 1000)]);
    } catch {} // broken cover image: import the song without one
  }
  if (!(await uploadSong(id, ext, file, TYPES[ext]))) return null;
  return addSong(id, { ...fields, ext }, small, big);
}
