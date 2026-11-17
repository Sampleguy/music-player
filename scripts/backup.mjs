// Save / restore the small state files (not songs: the Mac music folder is their backup).
// Usage: npm run backup            → backups/<date-time>/
//        npm run restore           → newest folder in backups/ back to R2
//        npm run restore -- <folder>
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { r2, BUCKET, ROOT, isMissing } from './r2.mjs';

const KEYS = ['library.json', 'state/playlists.json', 'state/plays.json'];
const DIR = join(ROOT, 'backups');
const fileName = (key) => key.replace('/', '__'); // state/plays.json → state__plays.json

async function backup() {
  const out = join(DIR, new Date().toISOString().slice(0, 19).replace(/:/g, '-'));
  await mkdir(out, { recursive: true });
  await Promise.all(KEYS.map(async (key) => {
    try {
      const { stdout } = await r2('get', `${BUCKET}/${key}`, '--pipe');
      JSON.parse(stdout); // never keep a broken file as a backup
      await writeFile(join(out, fileName(key)), stdout);
      console.log(`saved ${key} (${stdout.length} bytes)`);
    } catch (err) {
      if (!isMissing(err)) throw err;
      console.log(`skipped ${key} (not in R2 yet)`);
    }
  }));
  console.log(`Backup in ${out}`);
}

async function restore(folder) {
  if (!folder) {
    const all = (await readdir(DIR).catch(() => [])).sort();
    if (!all.length) throw new Error('No backups found. Run npm run backup first.');
    folder = join(DIR, all.at(-1));
  }
  folder = resolve(folder);
  const files = await readdir(folder);
  for (const key of KEYS) {
    if (!files.includes(fileName(key))) { console.log(`skipped ${key} (not in backup)`); continue; }
    const path = join(folder, fileName(key));
    JSON.parse(await readFile(path, 'utf8')); // stop before uploading a broken file
    await r2('put', `${BUCKET}/${key}`, '--file', path, '--ct', 'application/json');
    console.log(`restored ${key}`);
  }
  console.log(`Restored from ${folder}`);
}

const [cmd, folder] = process.argv.slice(2);
(cmd === 'restore' ? restore(folder) : backup()).catch((err) => {
  console.error(err.stderr || err.message);
  process.exit(1);
});
