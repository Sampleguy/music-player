// Pixel icons (8×8 bitmaps, approved in B-20, copied from design/sample.js). Color = currentColor.
const PIXEL = {
  play: ['X.......', 'XXX.....', 'XXXXX...', 'XXXXXXX.', 'XXXXXXX.', 'XXXXX...', 'XXX.....', 'X.......'],
  pause: ['.XX..XX.', '.XX..XX.', '.XX..XX.', '.XX..XX.', '.XX..XX.', '.XX..XX.', '.XX..XX.', '.XX..XX.'],
  prev: ['X.....XX', 'X...XXXX', 'X.XXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'X.XXXXXX', 'X...XXXX', 'X.....XX'],
  next: ['XX.....X', 'XXXX...X', 'XXXXXX.X', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXX.X', 'XXXX...X', 'XX.....X'],
  shuffle: ['......X.', 'XX...XXX', '..X.X.X.', '...X....', '...X....', '..X.X.X.', 'XX...XXX', '......X.'],
  repeat: ['..XXXXX.', '.X....XX', 'X....XXX', 'X.......', '.......X', 'XXX....X', 'XX....X.', '.XXXXX..'],
  queue: ['X.XXXXXX', '........', 'X.XXXXXX', '........', 'X.XXXXXX', '........', 'X.XXX...', '........'],
  more: ['........', '........', '........', 'XX.XX.XX', 'XX.XX.XX', '........', '........', '........'],
  close: ['X......X', '.X....X.', '..X..X..', '...XX...', '...XX...', '..X..X..', '.X....X.', 'X......X'],
  // New in B-19, same 8×8 style:
  note: ['...XXXXX', '...X...X', '...X...X', '...X...X', '.XXX.XXX', 'XXXXXXXX', 'XXXXXXXX', '.XX..XX.'],
  clock: ['..XXXX..', '.X....X.', 'X..X...X', 'X..X...X', 'X..XXX.X', 'X......X', '.X....X.', '..XXXX..'],
  mic: ['..XXXX..', '.XXXXXX.', '.XXXXXX.', '.XXXXXX.', '..XXXX..', '...XX...', '...XX...', '.XXXXXX.'], // lyrics (B-18)
  // B-21, copied from design/sample.js PIXEL:
  search: ['.XXXX...', 'X....X..', 'X....X..', 'X....X..', 'X....X..', '.XXXX...', '.....XX.', '......XX'],
  lyrics: ['XXXXX...', '.....XX.', 'XXXXX.XX', '.....X..', 'XXX..X..', '...XXX..', '...XXX..', '........'],
  import: ['...XX...', '..XXXX..', '.XXXXXX.', '...XX...', '...XX...', 'X..XX..X', 'X......X', 'XXXXXXXX'], // B-33
  palette: ['..XXXX..', '.X....X.', 'X.X..X.X', 'X......X', 'X.X...X.', 'X....X..', '.X..X...', '..XX....'],
  grid: ['XXX..XXX', 'XXX..XXX', 'XXX..XXX', '........', '........', 'XXX..XXX', 'XXX..XXX', 'XXX..XXX'], // B-48 Grid / List key
  list: ['XX.XXXXX', 'XX.XXXXX', '........', 'XX.XXXXX', 'XX.XXXXX', '........', 'XX.XXXXX', 'XX.XXXXX'],
};

// Solid icons (B-25, Classic): smooth filled shapes on a 24×24 grid. Color = currentColor.
const L = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const PREV = '<rect x="4" y="5" width="3" height="14" rx="1"/><path d="M19 6.2v11.6a1 1 0 0 1-1.55.83L9 12.83a1 1 0 0 1 0-1.66l8.45-5.8A1 1 0 0 1 19 6.2z"/>';
const SOLID = {
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/>',
  pause: '<rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/>',
  prev: PREV,
  next: `<g transform="matrix(-1 0 0 1 24 0)">${PREV}</g>`,
  shuffle: `<path ${L} stroke-width="2.4" d="M3 7h3.5c4 0 7 10 11 10H19M3 17h3.5c1.6 0 3-1.6 4.2-3.6M13.3 9.6C14.5 8 15.8 7 17.5 7H19"/><path d="M18 3.5 22 7l-4 3.5zM18 13.5l4 3.5-4 3.5z"/>`,
  repeat: `<path ${L} stroke-width="2.4" d="M4 13v-3a3 3 0 0 1 3-3h11M20 11v3a3 3 0 0 1-3 3H6"/><path d="M17 3.5 21 7l-4 3.5zM7 13.5 3 17l4 3.5z"/>`,
  queue: '<rect x="3" y="5" width="14" height="2.6" rx="1.3"/><rect x="3" y="10.7" width="14" height="2.6" rx="1.3"/><rect x="3" y="16.4" width="8" height="2.6" rx="1.3"/><path d="M15 14.5v6l5-3z"/>',
  more: '<circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/>',
  close: `<path ${L} stroke-width="2.6" d="M6 6l12 12M18 6 6 18"/>`,
  note: '<ellipse cx="6.5" cy="17.5" rx="3.5" ry="2.8"/><ellipse cx="16.5" cy="15.5" rx="3.5" ry="2.8"/><path d="M8.5 17.5V6L20 3v12.5h-2V7.6l-7.5 2v7.9z"/>',
  clock: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 5h2v5.6l3.7 2.2-1 1.7-4.7-2.8z"/>',
  mic: `<rect x="8.5" y="2" width="7" height="12" rx="3.5"/><path ${L} stroke-width="2" d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>`,
  search: `<circle ${L} stroke-width="2.6" cx="10.5" cy="10.5" r="6"/><path ${L} stroke-width="3" d="M15 15l5.5 5.5"/>`,
  lyrics: '<path fill-rule="evenodd" d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm2 5h5v2H8zm0 4h8v2H8zm0 4h8v2H8z"/>',
  import: `<path d="M12 2.5 18.5 9H14v6h-4V9H5.5z"/><path ${L} stroke-width="2.6" d="M4 14.5V20h16v-5.5"/>`,
  grid: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  list: '<rect x="3" y="4" width="4" height="4" rx="1"/><rect x="9" y="4.5" width="12" height="3" rx="1.5"/><rect x="3" y="10" width="4" height="4" rx="1"/><rect x="9" y="10.5" width="12" height="3" rx="1.5"/><rect x="3" y="16" width="4" height="4" rx="1"/><rect x="9" y="16.5" width="12" height="3" rx="1.5"/>',
  palette: '<path fill-rule="evenodd" d="M12 2a10 10 0 0 0 0 20c1.4 0 2.2-1 2.2-2.1 0-.6-.3-1-.6-1.5s-.6-.9-.6-1.5c0-1.2 1-2 2.2-2H18a4 4 0 0 0 4-4C22 6 17.5 2 12 2zM6.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>',
};

// Each icon holds both sets; the look's CSS shows one (.px pixel, .so solid), so a theme switch swaps them at once.
const cache = {};
export function icon(name) {
  if (!cache[name]) {
    let d = '';
    PIXEL[name].forEach((row, y) => [...row].forEach((c, x) => { if (c === 'X') d += `M${x} ${y}h1v1h-1z`; }));
    cache[name] = `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path class="px" transform="scale(3)" d="${d}"/><g class="so">${SOLID[name]}</g></svg>`;
  }
  return cache[name];
}

// Swirl motif (B-20 sample, Retro theme): a plain spiral line, drawn in code.
let swirlSvg;
export function swirl() {
  if (!swirlSvg) {
    let d = "";
    for (let i = 0; i <= 140; i++) {
      const t = (i / 140) * 2.6 * 2 * Math.PI, r = 0.6 + t * 0.62;
      d += (i ? "L" : "M") + (12 + r * Math.cos(t)).toFixed(2) + " " + (12 + r * Math.sin(t)).toFixed(2);
    }
    swirlSvg = `<svg class="swirl" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  }
  return swirlSvg;
}
