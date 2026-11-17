// Serves song files, covers and lyrics from R2. Answers Range with 206 (Safari needs it).
import { getFile } from "./storage.js";

// Only real file keys: audio/<sha1>.mp3|m4a, covers/<sha1>|artist-<sha1>[-big].jpg, lyrics/<sha1>.lrc. Blocks state/, library.json, "..".
const KEY = /^(audio\/[0-9a-f]{40}\.(mp3|m4a)|covers\/(artist-)?[0-9a-f]{40}(-big)?\.jpg|lyrics\/[0-9a-f]{40}\.lrc)$/;
const TYPES = { mp3: "audio/mpeg", m4a: "audio/mp4", jpg: "image/jpeg", lrc: "text/plain; charset=utf-8" };

export async function serveFile(request, env, pathname) {
  const key = pathname.slice(1);
  if (!KEY.test(key)) return new Response("Not found", { status: 404 });

  let file;
  try {
    file = await getFile(env, key, { range: request.headers });
  } catch {
    return new Response("Bad range", { status: 416 });
  }
  if (!file) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": TYPES[key.split(".").pop()],
    "Cache-Control": "private, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    ETag: file.httpEtag,
  });
  const r = file.range;
  if (!request.headers.has("Range") || !r) return new Response(file.body, { headers });

  // R2 gives {offset, length} or {suffix} (for "bytes=-N").
  const offset = r.suffix != null ? file.size - r.suffix : r.offset ?? 0;
  const length = r.suffix != null ? r.suffix : r.length ?? file.size - offset;
  headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${file.size}`);
  return new Response(file.body, { status: 206, headers });
}
