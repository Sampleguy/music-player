// Mac import + sync: music folder → R2 (audio/, covers/, lyrics/, library.json).
// Usage: npm run import -- <folder>
// Talks to R2 through the wrangler CLI (already logged in), so no keys or SDK.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, stat, mkdtemp, rm } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { parseFile, selectCover } from 'music-metadata';
import { run, r2, BUCKET, isMissing } from './r2.mjs';
import { findLyrics, fromLrcFile } from './lyrics.mjs';
import { lyricsAi } from './lyrics-ai.mjs';
import { TYPES, trackFields, sortTracks } from '../app/data/track-rules.js';

const MAX_BYTES = 9e9; // stop before the 10 GB free R2 limit
const PARALLEL = 4;
const SMALL = { size: 300, max: 40_000, suffix: '' };     // song lists
const BIG = { size: 1000, max: 250_000, suffix: '-big' }; // lock screen

async function findSongs(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await findSongs(p)));
    else if (TYPES[extname(e.name).slice(1).toLowerCase()]) out.push(p);
  }
  return out;
}

async function getLibrary() {
  try {
    const { stdout } = await r2('get', `${BUCKET}/library.json`, '--pipe');
    return JSON.parse(stdout);
  } catch (err) {
    if (isMissing(err)) return { version: 0, tracks: [] };
    throw err; // network or login problem: never treat as "empty library"
  }
}

// Square-crop and shrink the cover to a size×size JPEG under max bytes, upload it, return its key.
async function putCover(picture, dir, id, { size, max, suffix }) {
  const src = join(dir, `${id}-src`);
  const out = join(dir, `${id}${suffix}.jpg`);
  await writeFile(src, picture.data);
  const { stdout } = await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src]);
  const [w, h] = [...stdout.matchAll(/: (\d+)/g)].map((m) => +m[1]);
  const fit = w < h ? ['--resampleWidth', String(size)] : ['--resampleHeight', String(size)];
  for (const q of [80, 65, 50, 35, 20]) {
    await run('sips', [...fit, '-c', String(size), String(size), '-s', 'format', 'jpeg',
      '-s', 'formatOptions', String(q), src, '--out', out]);
    if ((await stat(out)).size <= max) break; // 20% quality is always far under max in practice
  }
  const key = `covers/${id}${suffix}.jpg`;
  await r2('put', `${BUCKET}/${key}`, '--file', out, '--ct', 'image/jpeg');
  return key;
}

// Upload LRC text, return its key.
async function putLyrics(text, dir, id) {
  const file = join(dir, `${id}.lrc`);
  await writeFile(file, text);
  const key = `lyrics/${id}.lrc`;
  await r2('put', `${BUCKET}/${key}`, '--file', file, '--ct', 'text/plain; charset=utf-8');
  return key;
}

// Sets t.lyricsKey: key if found, null if searched everywhere and none found.
// A song already searched (null) only checks for a new .lrc file next to it,
// unless the run has --lyrics-again (then it gets the full search once more).
// On an error (e.g. no internet) lyricsKey stays unset, so the next run tries again.
async function addLyrics(t, path, dir) {
  const searched = t.lyricsKey === null && !process.argv.includes('--lyrics-again');
  const text = searched ? await fromLrcFile(path) : await findLyrics(path, (await parseFile(path)).common, t);
  if (text) t.lyricsKey = await putLyrics(text, dir, t.id);
  else if (!searched) t.lyricsKey = null;
}

async function readSong(path) {
  const data = await readFile(path);
  const id = createHash('sha1').update(data).digest('hex');
  return { id, path, size: data.length };
}

async function upload(song, dir) {
  const ext = extname(song.path).toLowerCase();
  const { common, format } = await parseFile(song.path);
  const audioKey = `audio/${song.id}${ext}`;
  await r2('put', `${BUCKET}/${audioKey}`, '--file', song.path, '--ct', TYPES[ext.slice(1)]);
  let coverKey = null, bigCoverKey = null;
  const pic = selectCover(common.picture);
  if (pic) {
    try {
      coverKey = await putCover(pic, dir, song.id, SMALL);
      bigCoverKey = await putCover(pic, dir, song.id, BIG);
    } catch (err) {
      console.warn(`  no cover for ${basename(song.path)}: ${err.message}`);
      coverKey = bigCoverKey = null;
    }
  }
  const track = {
    id: song.id,
    ...trackFields({ ...common, duration: format.duration }, basename(song.path)),
    audioKey,
    coverKey,
    bigCoverKey,
    addedAt: new Date().toISOString(),
  };
  try {
    await addLyrics(track, song.path, dir);
  } catch (err) {
    console.warn(`  no lyrics yet for ${basename(song.path)}: ${err.message.split('\n')[0]}`);
  }
  return track;
}

async function pool(items, fn) {
  let i = 0;
  const worker = async () => { while (i < items.length) await fn(items[i++]); };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
}

function report(tracks) {
  console.log(`${tracks.filter((t) => t.lyricsKey).length} of ${tracks.length} songs have lyrics`);
}

async function main() {
  if (process.argv.includes('--lyrics-ai')) return lyricsAi();
  const folder = process.argv[2];
  if (!folder) throw new Error('Usage: npm run import -- <music folder> [--lyrics-again] | --lyrics-ai');
  const dir = await mkdtemp(join(tmpdir(), 'music-import-'));
  try {
    console.log('Reading folder…');
    const songs = new Map();
    await pool(await findSongs(folder), async (p) => {
      const s = await readSong(p);
      songs.set(s.id, s); // same file twice → kept once
    });
    const total = [...songs.values()].reduce((n, s) => n + s.size, 0);
    console.log(`${songs.size} songs, ${(total / 1e9).toFixed(2)} GB`);
    if (total > MAX_BYTES) throw new Error('Over 9 GB: R2 free tier is 10 GB. Nothing uploaded.');

    const lib = await getLibrary();
    const old = new Map(lib.tracks.map((t) => [t.id, t]));
    const added = [...songs.values()].filter((s) => !old.has(s.id));
    const removed = lib.tracks.filter((t) => !songs.has(t.id));
    const tracks = lib.tracks.filter((t) => songs.has(t.id));
    const noBig = tracks.filter((t) => t.coverKey && !t.bigCoverKey); // imported before big covers
    const noLyrics = tracks.filter((t) => !t.lyricsKey && !t.lyricsRemoved); // never searched, or no hit; removed in the app = never refilled
    console.log(`${added.length} new, ${removed.length} removed, ${noBig.length} need a big cover`);

    let lyricsChanged = false;
    await pool(noLyrics, async (t) => {
      const before = t.lyricsKey;
      try {
        await addLyrics(t, songs.get(t.id).path, dir);
        if (t.lyricsKey) console.log(`  lyrics ${t.title}`);
      } catch (err) {
        console.error(`  FAILED lyrics ${t.title}: ${err.message.split('\n')[0]}`);
      }
      if (t.lyricsKey !== before) lyricsChanged = true;
    });
    if (!added.length && !removed.length && !noBig.length && !lyricsChanged) return report(tracks);

    let done = 0, failed = 0;
    await pool(noBig, async (t) => {
      try {
        const { common } = await parseFile(songs.get(t.id).path);
        t.bigCoverKey = await putCover(selectCover(common.picture), dir, t.id, BIG);
        console.log(`  big cover [${++done}/${noBig.length}] ${t.title}`);
      } catch (err) {
        failed++;
        console.error(`  FAILED big cover ${t.title}: ${err.message.split('\n')[0]}`);
      }
    });
    done = 0;
    await pool(added, async (s) => {
      try {
        tracks.push(await upload(s, dir));
        console.log(`  [${++done}/${added.length}] ${basename(s.path)}`);
      } catch (err) {
        failed++;
        console.error(`  FAILED ${basename(s.path)}: ${err.message.split('\n')[0]}`);
      }
    });

    sortTracks(tracks);
    const libFile = join(dir, 'library.json');
    await writeFile(libFile, JSON.stringify({ version: (lib.version || 0) + 1, tracks }));
    await r2('put', `${BUCKET}/library.json`, '--file', libFile, '--ct', 'application/json');
    console.log(`library.json saved: ${tracks.length} songs`);
    report(tracks);

    // Delete only after library.json no longer points at these files.
    await pool(removed, async (t) => {
      // Keys may end in ?v=<time> (saved in the app). Artist covers are shared by many songs: never deleted here.
      const keys = [t.audioKey, t.coverKey, t.bigCoverKey, t.lyricsKey].filter(Boolean).map((k) => k.split('?')[0]);
      for (const key of keys.filter((k) => !k.startsWith('covers/artist-'))) await r2('delete', `${BUCKET}/${key}`);
      console.log(`  removed ${t.title}`);
    });
    if (failed) console.log(`${failed} failed. Run again to retry them.`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
