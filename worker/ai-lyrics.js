import { getFile, putFile } from "./storage.js";

// AI lyrics (B-43): POST /api/lyrics-ai/<id>. Sends the song's audio from R2 to Whisper
// (Workers AI, free tier) and saves timed lyrics as lyrics/<id>.lrc, marked lyricsSource "ai".
// The audio is passed as a stream, never turned into base64 (keeps CPU inside the free limit).
// 429 = daily free quota used up (resets 00:00 UTC), 422 = no singing found.
const MODEL = "@cf/openai/whisper-large-v3-turbo";

export async function makeAiLyrics(env, id) {
  if (!/^[0-9a-f]{40}$/.test(id)) return new Response("Bad id", { status: 400 });
  const lib = await (await getFile(env, "library.json"))?.json();
  const song = lib?.tracks?.find((t) => t.id === id);
  if (!song) return new Response("No such song", { status: 404 });
  const file = await getFile(env, song.audioKey);
  if (!file) return new Response("Song file missing", { status: 404 });

  let out;
  try {
    out = await env.AI.run(MODEL, {
      audio: { body: file.body, contentType: file.httpMetadata?.contentType || "audio/mpeg" },
      vad_filter: true, // skip parts with no voice: fewer made-up lines on instrumentals
    });
  } catch (e) {
    const msg = String(e?.message || e);
    if (/4006|neuron|daily|allocation|quota/i.test(msg)) return new Response("AI quota used up for today", { status: 429 });
    return new Response("AI failed: " + msg.slice(0, 200), { status: 502 });
  }

  const segs = (out?.segments || [])
    .map((s) => ({ t: s.start, text: s.text?.trim() }))
    .filter((s) => s.text && Number.isFinite(s.t));
  // On music with no voice Whisper makes up a word or two ("You"): under 15 words = no singing.
  const words = segs.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  const lrc = words < 15 ? "" : segs.map((s) => `[${stamp(s.t)}]${s.text}`).join("\n");

  // Read library.json again: Whisper takes a while and the app may have saved meanwhile.
  const fresh = await (await getFile(env, "library.json"))?.json();
  const track = fresh?.tracks?.find((t) => t.id === id);
  if (!track) return new Response("No such song", { status: 404 });
  if (!lrc) {
    // Mark it so the Mac script doesn't spend quota on it every day (the app's key can still try).
    track.aiNoSinging = true;
    await putFile(env, "library.json", JSON.stringify(fresh));
    return new Response("No singing found", { status: 422 });
  }
  const key = `lyrics/${id}.lrc`;
  await putFile(env, key, lrc, "text/plain; charset=utf-8");
  track.lyricsKey = `${key}?v=${Date.now()}`;
  track.lyricsSource = "ai";
  delete track.lyricsRemoved;
  delete track.aiNoSinging;
  await putFile(env, "library.json", JSON.stringify(fresh));
  return Response.json({ lyricsKey: track.lyricsKey, lyricsSource: "ai" });
}

// 83.456 → "01:23.45"
function stamp(sec) {
  const m = Math.floor(sec / 60), s = sec - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}
