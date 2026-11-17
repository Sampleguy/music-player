// B-20 design sample. Fake data only, no network, nothing from app/.
const $ = s => document.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

const songs = [
  { t: 'Station Light', a: 'Kites Over Osaka', k: '青', c: 'c1', d: 214 },
  { t: 'Paper Moon Radio', a: 'Mori', k: '月', c: 'c2', d: 187 },
  { t: 'Slow Rain, Fast Train', a: 'Tiny Orchestra', k: '雨', c: 'c3', d: 241 },
  { t: 'Wind Up', a: 'Summer Cassette', k: '風', c: 'c4', d: 198 },
  { t: 'Night Market', a: 'Kites Over Osaka', k: '夜', c: 'c2', d: 225 },
  { t: 'Hanabi', a: 'Summer Cassette', k: '花', c: 'c1', d: 263 },
];
const lyrics = [
  [0, 'Blue light on the station floor'], [12, 'Last train hums a song I know'],
  [24, 'Paper tickets, folded twice'], [36, 'Kept them all, I don’t know why'],
  [50, 'またね, the doors say, see you soon'], [62, 'Half a city, half a moon'],
  [76, 'Turn it up, the night is long'], [88, 'Every stop another song'],
  [102, 'Swirl of streetlights, round and round'], [116, 'Headphones on, the world turned down'],
  [130, 'Blue light on the station floor'], [144, 'Last train home, play it once more'],
];

// Icons. Line/solid: [path, fills-when-solid]. Pixel: 8x8 bitmaps.
const LINE = {
  play: [['M8 5.5v13l10.5-6.5z', 1]],
  pause: [['M7 5h3v14H7zM14 5h3v14h-3z', 1]],
  prev: [['M6 5v14', 0], ['M18 6l-9 6 9 6z', 1]],
  next: [['M18 5v14', 0], ['M6 6l9 6-9 6z', 1]],
  shuffle: [['M3 7h3c5 0 7 10 12 10h3M3 17h3c2 0 3.2-1.5 4.3-3.3M13.7 10.3C14.8 8.5 16 7 18 7h3M18.5 4.5 21 7l-2.5 2.5M18.5 14.5 21 17l-2.5 2.5', 0]],
  repeat: [['M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3', 0]],
  lyrics: [['M4 6h9M4 11h9M4 16h6', 0], ['M17 17V5l3 1.5', 0], ['M17 17a2 2 0 1 1-2-2 2 2 0 0 1 2 2z', 1]],
  queue: [['M4 6h12M4 11h12M4 16h7', 0], ['M15 14v6l5-3z', 1]],
  more: [['M3.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM17.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z', 1]],
  close: [['M6 6l12 12M18 6 6 18', 0]],
  search: [['M16 11a5 5 0 1 1-10 0a5 5 0 1 1 10 0z', 0], ['M20 20l-5.2-5.2', 0]],
};
const PIXEL = {
  play: ['X.......', 'XXX.....', 'XXXXX...', 'XXXXXXX.', 'XXXXXXX.', 'XXXXX...', 'XXX.....', 'X.......'],
  pause: ['.XX..XX.', '.XX..XX.', '.XX..XX.', '.XX..XX.', '.XX..XX.', '.XX..XX.', '.XX..XX.', '.XX..XX.'],
  prev: ['X.....XX', 'X...XXXX', 'X.XXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'X.XXXXXX', 'X...XXXX', 'X.....XX'],
  next: ['XX.....X', 'XXXX...X', 'XXXXXX.X', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXX.X', 'XXXX...X', 'XX.....X'],
  shuffle: ['......X.', 'XX...XXX', '..X.X.X.', '...X....', '...X....', '..X.X.X.', 'XX...XXX', '......X.'],
  repeat: ['..XXXXX.', '.X....XX', 'X....XXX', 'X.......', '.......X', 'XXX....X', 'XX....X.', '.XXXXX..'],
  lyrics: ['XXXXX...', '.....XX.', 'XXXXX.XX', '.....X..', 'XXX..X..', '...XXX..', '...XXX..', '........'],
  queue: ['X.XXXXXX', '........', 'X.XXXXXX', '........', 'X.XXXXXX', '........', 'X.XXX...', '........'],
  more: ['........', '........', '........', 'XX.XX.XX', 'XX.XX.XX', '........', '........', '........'],
  close: ['X......X', '.X....X.', '..X..X..', '...XX...', '...XX...', '..X..X..', '.X....X.', 'X......X'],
  search: ['.XXXX...', 'X....X..', 'X....X..', 'X....X..', 'X....X..', '.XXXX...', '.....XX.', '......XX'],
};
const STYLES = [['line', 'Line', '線'], ['solid', 'Solid', 'ベタ'], ['pixel', 'Pixel', 'ドット']];
let iconStyle = STYLES.some(s => s[0] === store.get('sample-icons')) ? store.get('sample-icons') : 'line';

function icon(name, style = iconStyle) {
  if (style === 'pixel') {
    let d = '';
    PIXEL[name].forEach((row, y) => [...row].forEach((c, x) => { if (c === 'X') d += `M${x} ${y}h1v1h-1z`; }));
    return `<svg class="ic px" viewBox="0 0 8 8" aria-hidden="true"><path d="${d}"/></svg>`;
  }
  const paths = LINE[name].map(([d, f]) => `<path d="${d}"${f && style === 'solid' ? ' class="f"' : ''}/>`).join('');
  return `<svg class="ic ${style}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}
function drawIcons(root = document) { $$('[data-i]', root).forEach(el => { el.innerHTML = icon(el.dataset.i); }); }

// Swirl motif: a plain spiral, drawn in code.
function swirl() {
  let d = '';
  for (let i = 0; i <= 140; i++) {
    const t = i / 140 * 2.6 * 2 * Math.PI, r = 0.6 + t * 0.62;
    d += (i ? 'L' : 'M') + (12 + r * Math.cos(t)).toFixed(2) + ' ' + (12 + r * Math.sin(t)).toFixed(2);
  }
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
}
$$('[data-swirl]').forEach(el => { el.innerHTML = swirl(); });

// Player state (pretend: a timer, no audio)
let cur = 0, pos = 0, playing = false, timer = 0, lastLine = -1;
const np = $('#np'), seek = $('#seek'), ly = $('#ly');
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const isOn = act => $(`[data-act="${act}"]`).getAttribute('aria-pressed') === 'true';

function renderRows() {
  const q = $('#q').value.trim().toLowerCase();
  const html = songs.map((s, i) => (s.t + ' ' + s.a).toLowerCase().includes(q)
    ? `<li class="row${i === cur ? ' cur' : ''}" data-n="${i}" tabindex="0"><span class="cover" data-c="${s.c}">${s.k}</span>`
      + `<span class="info"><span class="title">${s.t}</span><span class="meta">${s.a}</span></span>`
      + `<span class="t">${fmt(s.d)}</span><button class="key sm" aria-label="More for ${s.t}"><span data-i="more"></span></button></li>`
    : '').join('');
  $('#rows').innerHTML = html || '<li class="empty">No songs match.</li>';
  drawIcons($('#rows'));
}

function show() {
  const s = songs[cur];
  for (const id of ['#m-cover', '#n-cover']) { $(id).dataset.c = s.c; $(id).textContent = s.k; }
  $('#m-title').textContent = $('#n-title').textContent = s.t;
  $('#m-artist').textContent = $('#n-artist').textContent = s.a;
  $('#n-dur').textContent = fmt(s.d);
  seek.max = s.d;
  $$('.row').forEach(r => r.classList.toggle('cur', +r.dataset.n === cur));
  tick(0);
}

function tick(step) {
  const s = songs[cur];
  pos += step;
  if (pos >= s.d) { pos = 0; if (!isOn('repeat')) return next(); }
  const pct = pos / s.d * 100 + '%';
  seek.value = pos; seek.style.setProperty('--p', pct);
  $('#m-fill').style.width = pct;
  $('#n-pos').textContent = fmt(pos);
  let line = 0;
  lyrics.forEach(([t], i) => { if (t <= pos) line = i; });
  const ps = $$('p', ly);
  ps.forEach((p, i) => p.classList.toggle('now', i === line));
  if (line !== lastLine) {
    lastLine = line;
    const p = ps[line];
    ly.scrollTo({ top: p.offsetTop - ly.clientHeight / 2 + p.offsetHeight / 2, behavior: reduce ? 'auto' : 'smooth' });
  }
}

function setPlaying(on) {
  playing = on;
  $$('[data-act="play"]').forEach(b => {
    b.setAttribute('aria-label', on ? 'Pause' : 'Play');
    const i = b.querySelector('[data-i]'); i.dataset.i = on ? 'pause' : 'play'; i.innerHTML = icon(i.dataset.i);
  });
  clearInterval(timer);
  if (on) timer = setInterval(() => tick(1), 1000);
}

function next() {
  if (isOn('shuffle')) { let n; do { n = Math.floor(Math.random() * songs.length); } while (n === cur); cur = n; }
  else cur = (cur + 1) % songs.length;
  pos = 0; show();
}
function pick(n) { cur = n; pos = 0; show(); setPlaying(true); }

// Level meter: dances while playing
const lvl = $('#lvl');
lvl.innerHTML = '<i></i>'.repeat(20);
setInterval(() => {
  const lit = playing ? (reduce ? 14 : 8 + Math.floor(Math.random() * 11)) : 3;
  $$('i', lvl).forEach((b, i) => b.classList.toggle('on', i < lit));
}, 160);

// Keys
document.addEventListener('touchstart', () => {}, { passive: true }); // lets :active press show on iPhone
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'play') setPlaying(!playing);
  else if (act === 'next') next();
  else if (act === 'prev') { if (pos > 3) pos = 0; else cur = (cur - 1 + songs.length) % songs.length, pos = 0; show(); }
  else if (act === 'shuffle' || act === 'repeat') b.setAttribute('aria-pressed', String(!isOn(act)));
  else if (act === 'lyrics') {
    const on = np.classList.toggle('lyr-on');
    $('#ly-key').setAttribute('aria-pressed', String(on));
    lastLine = -1; tick(0);
  }
});
seek.addEventListener('input', () => { pos = +seek.value; tick(0); });
$('#q').addEventListener('input', renderRows);
$('#rows').addEventListener('click', e => {
  if (e.target.closest('.key')) return;
  const r = e.target.closest('.row');
  if (r) pick(+r.dataset.n);
});
$('#rows').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList.contains('row')) pick(+e.target.dataset.n);
});

// Color versions
function setTheme(name) {
  $('#theme').href = 'themes/' + name + '.css';
  store.set('sample-theme', name);
  $$('[data-th]').forEach(b => b.classList.toggle('on', b.dataset.th === name));
}
$$('[data-th]').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.th)));
setTheme($('#theme').getAttribute('href').replace(/.*\/|\.css/g, ''));

// Icon style picker
$('#sets').innerHTML = STYLES.map(([id, name, jp]) => `<div class="shell set" data-set="${id}">`
  + `<div class="set-head"><b>${name}</b><span class="jp">${jp}</span></div>`
  + `<div class="set-keys">${Object.keys(LINE).map(n => `<span class="key${n === 'play' ? ' play' : ''}" title="${n}">${icon(n, id)}</span>`).join('')}</div>`
  + `<button class="key alt" data-style="${id}">Use this</button></div>`).join('');
function markSet() {
  $$('[data-set]').forEach(s => {
    const on = s.dataset.set === iconStyle;
    s.classList.toggle('on', on);
    s.querySelector('button').textContent = on ? 'In use' : 'Use this';
  });
}
$('#sets').addEventListener('click', e => {
  const b = e.target.closest('[data-style]');
  if (!b) return;
  iconStyle = b.dataset.style; store.set('sample-icons', iconStyle);
  drawIcons(); markSet();
});

// Start
ly.innerHTML = lyrics.map(([, l]) => `<p>${l}</p>`).join('');
renderRows(); drawIcons(); markSet(); show();
if (np.clientWidth >= 680) { np.classList.add('lyr-on'); $('#ly-key').setAttribute('aria-pressed', 'true'); }
