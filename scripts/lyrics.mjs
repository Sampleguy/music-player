// Finds lyrics for one song, in this order:
// 1. a .lrc file next to the song, 2. synced lyrics inside the file, 3. LRCLIB (lrclib.net, free, no key):
// timed lyrics, else plain lyrics (no time stamps). Returns the text, or null if none found. Only the import script uses this (Mac only); the LRCLIB part is shared with the Worker (worker/lrclib.js).
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { TimestampFormat } from 'music-metadata';
import { TIMED, fromLrclib } from '../worker/lrclib.js';

const pad = (n) => String(n).padStart(2, '0');
const stamp = (ms) => `[${pad(Math.floor(ms / 60000))}:${pad(Math.floor(ms / 1000) % 60)}.${pad(Math.floor(ms / 10) % 100)}]`;

export async function fromLrcFile(path) {
  try {
    const text = await readFile(path.slice(0, -extname(path).length) + '.lrc', 'utf8');
    return TIMED.test(text) ? text : null;
  } catch { return null; }
}

function fromTags(common) {
  for (const l of common.lyrics || []) {
    if (l.syncText?.length && l.timeStampFormat === TimestampFormat.milliseconds)
      return l.syncText.map((s) => stamp(s.timestamp) + s.text).join('\n');
    if (l.text && TIMED.test(l.text)) return l.text;
  }
  return null;
}

export async function findLyrics(path, common, track) {
  return (await fromLrcFile(path)) || fromTags(common) || fromLrclib(track);
}
