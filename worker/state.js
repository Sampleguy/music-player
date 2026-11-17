import { getFile, putFile } from "./storage.js";

// Saved app state: playlists and play counts. Last save wins.
const KEY = "state/playlists.json";
const PLAYS = "state/plays.json";
const MAX = 100_000; // bytes

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const readJson = async (env, key) => { const f = await getFile(env, key); return f ? f.json() : null; };

export async function getState(env) {
  const [lists, plays] = await Promise.all([readJson(env, KEY), readJson(env, PLAYS)]);
  return json({ playlists: lists?.playlists ?? [], plays: plays ?? {} });
}

// One play of a song (app sends it after 30 s): count + 1, last = now. { [trackId]: {count, last} }
export async function recordPlay(request, env) {
  let id;
  try { id = (await request.json())?.id; } catch { return json({ error: "Bad JSON" }, 400); }
  if (typeof id !== "string" || !/^[0-9a-f]{40}$/.test(id)) return json({ error: "Bad id" }, 400);
  const plays = (await readJson(env, PLAYS)) ?? {};
  plays[id] = { count: (plays[id]?.count ?? 0) + 1, last: Date.now() };
  await putFile(env, PLAYS, JSON.stringify(plays));
  return json(plays[id]);
}

const isText = (s, max) => typeof s === "string" && s.length > 0 && s.length <= max;
const valid = (p) => isText(p?.id, 64) && isText(p.name, 200) && Number.isFinite(p.updatedAt) &&
  Array.isArray(p.trackIds) && p.trackIds.every((t) => isText(t, 64));

export async function savePlaylists(request, env) {
  const text = await request.text();
  if (text.length > MAX) return json({ error: "Too big" }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: "Bad JSON" }, 400); }
  if (!Array.isArray(body?.playlists) || !body.playlists.every(valid)) return json({ error: "Bad playlists" }, 400);
  const playlists = body.playlists.map(({ id, name, trackIds, updatedAt }) => ({ id, name, trackIds, updatedAt }));
  await putFile(env, KEY, JSON.stringify({ playlists }));
  return json({ ok: true });
}
