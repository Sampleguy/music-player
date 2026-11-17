// AI lyrics for every song that still has none (B-43): `npm run import -- --lyrics-ai`.
// Asks the live app (Worker → Whisper) one song at a time, so the AI key never leaves Cloudflare.
// Needs APP_PASSWORD in .env. APP_URL in .env is optional (e.g. http://localhost:8787 for a test).
// Stops cleanly when today's free AI quota is used up; the next run carries on.
// Don't use the app while it runs: both save library.json.
import { join } from 'node:path';
import { ROOT } from './r2.mjs';

export async function lyricsAi() {
  try { process.loadEnvFile(join(ROOT, '.env')); } catch { /* no .env: checked below */ }
  const url = process.env.APP_URL;
  if (!url || !process.env.APP_PASSWORD) throw new Error('Put APP_URL (your workers.dev address) and APP_PASSWORD in .env first.');

  const login = await fetch(url + '/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.APP_PASSWORD }),
  });
  if (!login.ok) throw new Error(`Login failed (${login.status}).`);
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const lib = await (await fetch(url + '/api/library', { headers: { cookie } })).json();
  // Searched with no hit (lyricsKey null), not removed by the owner, not already tried by AI.
  const todo = lib.tracks.filter((t) => t.lyricsKey === null && !t.lyricsRemoved && !t.aiNoSinging);
  console.log(`${todo.length} songs without lyrics`);

  let made = 0;
  for (const t of todo) {
    const res = await fetch(`${url}/api/lyrics-ai/${t.id}`, { method: 'POST', headers: { cookie } });
    const name = `${t.title} · ${t.artist}`;
    if (res.status === 429) {
      console.log('Free AI limit reached for today. Run again tomorrow (resets 00:00 UTC).');
      break;
    }
    if (res.ok) { made++; console.log('AI lyrics: ' + name); }
    else if (res.status === 422) console.log('No singing: ' + name);
    else console.log(`Failed (${res.status}): ${name}`);
  }
  console.log(`${made} songs got AI lyrics`);
}
