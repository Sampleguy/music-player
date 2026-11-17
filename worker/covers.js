import { getFile, putFile } from "./storage.js";

// Artist cover (app picker): POST /api/artist-cover, form data {artist, mode: "all"|"missing", small, big},
// or one song's cover (B-44): {mode: "song", id, small, big} → covers/<id>[-big].jpg.
// small = 300×300 JPEG, big = 1000×1000 JPEG, both made in the browser.
// Saves covers/artist-<sha1 of name>[-big].jpg and points the chosen songs at them in library.json.
// Keys get ?v=<time> so every device's saved copy of an old cover is never used again.
const MAX = 2_000_000; // bytes per image

const sha1 = async (text) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text)))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

const isJpeg = (f) => f instanceof File && f.size > 0 && f.size <= MAX && f.type === "image/jpeg";

export async function saveArtistCover(request, env) {
  let form;
  try { form = await request.formData(); } catch { return new Response("Bad form", { status: 400 }); }
  const artist = form.get("artist"), mode = form.get("mode"), id = form.get("id"), small = form.get("small"), big = form.get("big");
  const ok = mode === "song" ? /^[0-9a-f]{40}$/.test(id) : typeof artist === "string" && artist && ["all", "missing"].includes(mode);
  if (!ok) return new Response("Bad artist, id or mode", { status: 400 });
  if (!isJpeg(small) || !isJpeg(big)) return new Response("Images must be JPEG, max 2 MB", { status: 413 });

  const lib = await (await getFile(env, "library.json"))?.json();
  const songs = (lib?.tracks || []).filter((t) => mode === "song" ? t.id === id : t.artist === artist && (mode === "all" || !t.coverKey));
  if (!songs.length) return new Response("No songs to change", { status: 404 });

  const key = mode === "song" ? `covers/${id}` : `covers/artist-${await sha1(artist)}`, v = `?v=${Date.now()}`;
  await Promise.all([
    putFile(env, `${key}.jpg`, small.stream(), "image/jpeg"),
    putFile(env, `${key}-big.jpg`, big.stream(), "image/jpeg"),
  ]);
  for (const t of songs) { t.coverKey = `${key}.jpg${v}`; t.bigCoverKey = `${key}-big.jpg${v}`; }
  await putFile(env, "library.json", JSON.stringify(lib));
  return Response.json({ ids: songs.map((t) => t.id), coverKey: `${key}.jpg${v}`, bigCoverKey: `${key}-big.jpg${v}` });
}
