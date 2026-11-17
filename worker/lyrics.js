import { getFile, putFile, deleteFile } from "./storage.js";

// Your own lyrics (app editor): PUT /api/lyrics/<id> with the LRC or plain text.
// Writes lyrics/<id>.lrc and points the song's lyricsKey at it in library.json.
// The key gets ?v=<time> so every device's saved copy of the old text is never used again.
const MAX = 100_000; // bytes

export async function saveLyrics(request, env, id) {
  if (!/^[0-9a-f]{40}$/.test(id)) return new Response("Bad id", { status: 400 });
  const text = await request.text();
  if (!text.trim() || text.length > MAX) return new Response("Empty or too big", { status: 413 });
  const lib = await (await getFile(env, "library.json"))?.json();
  const song = lib?.tracks?.find((t) => t.id === id);
  if (!song) return new Response("No such song", { status: 404 });
  const key = `lyrics/${id}.lrc`;
  await putFile(env, key, text, "text/plain; charset=utf-8");
  song.lyricsKey = `${key}?v=${Date.now()}`;
  delete song.lyricsRemoved; // own lyrics clear the "removed" mark
  delete song.lyricsSource;  // and the "AI draft" mark (Edit or Looks good)
  await putFile(env, "library.json", JSON.stringify(lib));
  return Response.json({ lyricsKey: song.lyricsKey });
}

// Remove lyrics: DELETE /api/lyrics/<id>. Deletes the file, clears the song's lyrics fields and
// marks it lyricsRemoved so the Mac script (and later auto-fill) never fill it again.
export async function removeLyrics(env, id) {
  if (!/^[0-9a-f]{40}$/.test(id)) return new Response("Bad id", { status: 400 });
  const lib = await (await getFile(env, "library.json"))?.json();
  const song = lib?.tracks?.find((t) => t.id === id);
  if (!song) return new Response("No such song", { status: 404 });
  await deleteFile(env, `lyrics/${id}.lrc`);
  song.lyricsKey = null;
  delete song.lyricsSource;
  song.lyricsRemoved = true;
  await putFile(env, "library.json", JSON.stringify(lib));
  return new Response(null, { status: 204 });
}
