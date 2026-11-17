// B-26 design sample: Glass + Terminal. Fake data only, no network. Icons are the app's own set.
import { icon } from './icons.js';

const $ = s => document.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};
const LOOKS = { glass: ['cream', 'ocean'], terminal: ['black', 'olive'] };
const root = document.documentElement;
const term = () => root.dataset.look === 'terminal';

const songs = [
  { t: 'Station Light', a: 'Kites Over Osaka', k: '青', c: 'c1', d: 214 },
  { t: 'Paper Moon Radio', a: 'Mori', k: '月', c: 'c2', d: 187 },
  { t: 'Slow Rain, Fast Train', a: 'Tiny Orchestra', k: '雨', c: 'c3', d: 241 },
  { t: 'Wind Up', a: 'Summer Cassette', k: '風', c: 'c4', d: 198 },
  { t: 'Night Market', a: 'Kites Over Osaka', k: '夜', c: 'c2', d: 225 },
  { t: 'Hanabi', a: 'Summer Cassette', k: '花', c: 'c1', d: 263 },
];
const chips = [['Morning', 3], ['Train ride', 2], ['Focus', 1], ['Rainy day', 2]];
const lyrics = [
  [0, 'Blue light on the station floor'], [12, 'Last train hums a song I know'],
  [24, 'Paper tickets, folded twice'], [36, 'Kept them all, I don’t know why'],
  [50, 'またね, the doors say, see you soon'], [62, 'Half a city, half a moon'],
  [76, 'Turn it up, the night is long'], [88, 'Every stop another song'],
  [102, 'Swirl of streetlights, round and round'], [116, 'Headphones on, the world turned down'],
  [130, 'Blue light on the station floor'], [144, 'Last train home, play it once more'],
];

const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const stamp = s => '[' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') + ']';
const bar = (f, n) => { const k = Math.round(f * n); return '[' + '='.repeat(k) + '-'.repeat(n - k) + ']'; };
function drawIcons(r = document) { $$('[data-i]', r).forEach(el => { el.innerHTML = icon(el.dataset.i); }); }

// Player state (pretend: a timer, no audio)
let cur = 0, pos = 0, playing = false, timer = 0, lastLine = -1, lastCover = '';
const np = $('#np'), seek = $('#seek'), ly = $('#ly');
const isOn = act => $(`[data-act="${act}"]`).getAttribute('aria-pressed') === 'true';

function renderRows() {
  const q = $('#q').value.trim().toLowerCase();
  const hits = songs.map((s, i) => [s, i]).filter(([s]) => (s.t + ' ' + s.a).toLowerCase().includes(q));
  $('#rows').innerHTML = hits.map(([s, i]) => `<li class="row${i === cur ? ' cur' : ''}" data-n="${i}" tabindex="0">`
    + `<span class="cover" data-c="${s.c}">${s.k}</span>`
    + `<span class="info"><span class="title">${s.t}</span><span class="meta">${s.a}</span></span>`
    + `<span class="t">${fmt(s.d)}</span>`
    + `<button class="btn sm" aria-label="More for ${s.t}"><span data-i="more"></span><span class="tx">...</span></button></li>`).join('')
    || '<li class="empty">No songs match.</li>';
  $('#count').textContent = hits.length + (hits.length === 1 ? ' song' : ' songs');
  drawIcons($('#rows'));
}

// Glass: the playing cover, huge and blurred, behind everything. New cover fades in over the old one.
function setBackdrop(c) {
  if (c === lastCover) return;
  lastCover = c;
  const art = document.createElement('span');
  art.className = 'art'; art.dataset.c = c;
  $('#bd').append(art);
  const prune = () => $$('.art', $('#bd')).slice(0, -1).forEach(a => a.remove());
  if (reduce) prune(); else art.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: 'ease' }).finished.then(prune);
}

function show() {
  const s = songs[cur];
  for (const id of ['#m-cover', '#n-cover']) { $(id).dataset.c = s.c; $(id).textContent = s.k; }
  $('#m-title').textContent = $('#n-title').textContent = s.t;
  $('#m-artist').textContent = $('#n-artist').textContent = s.a;
  $('#n-dur').textContent = fmt(s.d);
  seek.max = s.d;
  $$('.row').forEach(r => r.classList.toggle('cur', +r.dataset.n === cur));
  setBackdrop(s.c);
  lastLine = -1;
  tick(0);
}

function tick(step) {
  const s = songs[cur];
  pos += step;
  if (pos >= s.d) { pos = 0; if (!isOn('repeat')) return next(); }
  const f = pos / s.d;
  seek.value = pos; seek.style.setProperty('--p', f * 100 + '%');
  $('#m-fill').style.width = f * 100 + '%';
  $('#m-ascii').textContent = bar(f, 10);
  $('#n-ascii').textContent = bar(f, 24);
  $('#n-pos').textContent = fmt(pos);
  let line = 0;
  lyrics.forEach(([t], i) => { if (t <= pos) line = i; });
  const ps = $$('p', ly);
  ps.forEach((p, i) => { p.classList.toggle('now', i === line); p.classList.toggle('later', i > line); });
  if (line !== lastLine) {
    lastLine = line;
    const p = ps[line];
    // Terminal: newest line at the bottom, like a log. Glass: current line in the middle.
    const top = term() ? ly.scrollHeight : p.offsetTop - ly.clientHeight / 2 + p.offsetHeight / 2;
    ly.scrollTo({ top, behavior: reduce || term() ? 'auto' : 'smooth' });
  }
}

function setPlaying(on) {
  playing = on;
  np.classList.toggle('playing', on);
  $$('[data-act="play"]').forEach(b => {
    b.setAttribute('aria-label', on ? 'Pause' : 'Play');
    const i = b.querySelector('[data-i]');
    i.dataset.i = on ? 'pause' : 'play'; i.innerHTML = icon(i.dataset.i);
    b.querySelector('.tx').textContent = on ? 'pause' : 'play';
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

// Keys
document.addEventListener('touchstart', () => {}, { passive: true }); // lets :active show on iPhone
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
  if (e.target.closest('.btn')) return;
  const r = e.target.closest('.row');
  if (r) pick(+r.dataset.n);
});
$('#rows').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList.contains('row')) pick(+e.target.dataset.n);
});
$('#chips').innerHTML = chips.map(([name, n]) => `<button class="chip" data-n="${n}">${name}</button>`).join('');
$('#chips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) pick(+c.dataset.n); });

// Look + color pickers (saved on this device)
function setLook(look, color) {
  if (!LOOKS[look].includes(color)) color = LOOKS[look][0];
  root.dataset.look = look;
  $('#look').href = 'looks-' + look + '.css';
  $('#color').href = 'colors/' + color + '.css';
  store.set('looks-look', look); store.set('looks-color', color);
  $$('[data-look]', $('.top')).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.look === look)));
  $('#colors').innerHTML = LOOKS[look].map(c => `<button class="seg" data-color="${c}" aria-pressed="${c === color}">`
    + c[0].toUpperCase() + c.slice(1) + '</button>').join('');
  lastLine = -1; requestAnimationFrame(() => tick(0));
}
$('.top').addEventListener('click', e => {
  const b = e.target.closest('.seg');
  if (!b) return;
  if (b.dataset.look) setLook(b.dataset.look);
  else setLook(root.dataset.look, b.dataset.color);
});

// Start
ly.innerHTML = lyrics.map(([t, l]) => `<p data-t="${stamp(t)}">${l}</p>`).join('');
renderRows(); drawIcons();
setLook(root.dataset.look, $('#color').getAttribute('href').replace(/.*\/|\.css/g, ''));
show();
if (matchMedia('(min-width: 900px)').matches) { np.classList.add('lyr-on'); $('#ly-key').setAttribute('aria-pressed', 'true'); }
