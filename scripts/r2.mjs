// Shared by Mac scripts: reach R2 through the wrangler CLI (already logged in), so no keys or SDK.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const run = promisify(execFile);
export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const BUCKET = 'music-player-files';
const WRANGLER = join(ROOT, 'node_modules/.bin/wrangler');

export const r2 = (...args) =>
  run(WRANGLER, ['r2', 'object', ...args, '--remote'], { cwd: ROOT, maxBuffer: 1e8 });

export const isMissing = (err) => String(err.stderr).includes('does not exist');
