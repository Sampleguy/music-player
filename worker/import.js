import { getFile, hasFile, putFile, totalSize } from "./storage.js";
import { TYPES, trackFields, sortTracks } from "../app/data/track-rules.js";
import { fromLrclib } from "./lrclib.js";

// App import (B-33), one song in two steps, sent by the app one song at a time:
// 1. PUT  /api/import/<id>.<mp3|m4a>  body = the song file → audio/<id>.<ext>. Streamed straight to R2 (no Worker CPU).
// 2. POST /api/import/<id>  form {meta: JSON {title, artist, album, duration, ext}, small?, big?}
//    → covers, lyrics from LRCLIB, new track added to library.json. Returns the track.
// <id> = SHA-1 of the file, made by the app (same as the Mac script). 409 = already in the library.
const MAX_SONG = 60_000_000;   // bytes per song file
const MAX_TOTAL = 9e9;         // stop before the 10 GB free R2 limit (same as scripts/import.mjs)
const MAX_COVER = 2_000_000;   // bytes per cover JPEG
const ID = /^[0-9a-f]{40}$/;
const EXT = /^(mp3|m4a)$/;

const say = (text, status) => new Response(text, { status });
const library = async (env) => (await (await getFile(env, "library.json"))?.json()) || { version: 0, tracks: [] };
const isJpeg = (f) => f instanceof File && f.size > 0 && f.size <= MAX_COVER && f.type === "image/jpeg";

export async function putSong(request, env, name) {
  const [id, ext] = name.split(".");
  if (!ID.test(id) || !EXT.test(ext)) return say("Bad id or type", 400);
  const size = Number(request.headers.get("Content-Length"));
  if (!size || size > MAX_SONG) return say("Song file too big", 413);
  if ((await library(env)).tracks.some((t) => t.id === id)) return say("Already in the library", 409);
  if ((await totalSize(env, "audio/")) + size > MAX_TOTAL) return say("Storage full (9 GB)", 507);
  await putFile(env, `audio/${id}.${ext}`, request.body, TYPES[ext]);
  return say(null, 204);
}

export async function addSong(request, env, id) {
  if (!ID.test(id)) return say("Bad id", 400);
  let form, meta;
  try { form = await request.formData(); meta = JSON.parse(form.get("meta")); } catch { return say("Bad form", 400); }
  const { ext } = meta;
  const str = (s) => (typeof s === "string" ? s.trim().slice(0, 300) : "");
  if (!EXT.test(ext) || !(meta.duration >= 0)) return say("Bad details", 400);
  if (!(await hasFile(env, `audio/${id}.${ext}`))) return say("Song file not uploaded", 400);

  const fields = trackFields({ title: str(meta.title), artist: str(meta.artist), album: str(meta.album), duration: +meta.duration }, "Untitled");
  const track = { id, ...fields, audioKey: `audio/${id}.${ext}`, coverKey: null, bigCoverKey: null, addedAt: new Date().toISOString() };
  const small = form.get("small"), big = form.get("big");
  if (isJpeg(small) && isJpeg(big)) {
    track.coverKey = `covers/${id}.jpg`;
    track.bigCoverKey = `covers/${id}-big.jpg`;
    await Promise.all([putFile(env, track.coverKey, small.stream(), "image/jpeg"), putFile(env, track.bigCoverKey, big.stream(), "image/jpeg")]);
  }
  // Same as the Mac script: key if found, null if searched and none found, unset after an error (retried by the script).
  try {
    const text = await fromLrclib(track);
    if (text) await putFile(env, `lyrics/${id}.lrc`, text, "text/plain; charset=utf-8");
    track.lyricsKey = text ? `lyrics/${id}.lrc` : null;
  } catch {}

  const lib = await library(env); // read again after the lyrics wait, just before saving
  if (lib.tracks.some((t) => t.id === id)) return say("Already in the library", 409);
  lib.tracks.push(track);
  sortTracks(lib.tracks);
  lib.version = (lib.version || 0) + 1;
  await putFile(env, "library.json", JSON.stringify(lib));
  return Response.json(track);
}
