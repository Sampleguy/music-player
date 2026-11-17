// Small tag reader for the app import (B-33), no package: MP3 (ID3v2.2–2.4, ID3v1 fallback) and M4A (iTunes atoms).
// readTags(bytes, ext) → { title, artist, album, duration (s), picture: Blob | null }. Missing tags stay empty.

const latin1 = new TextDecoder("latin1");
const u32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const synchsafe = (b, i) => (b[i] << 21) | (b[i + 1] << 14) | (b[i + 2] << 7) | b[i + 3];
const unsync = (b) => b.filter((x, i) => !(x === 0 && b[i - 1] === 0xff)); // FF 00 → FF

export const readTags = (bytes, ext) => (ext === "m4a" ? readM4a(bytes) : readMp3(bytes));

// ---------- MP3 ----------

// ID3 text: first byte = encoding (0 latin1, 1 UTF-16 + BOM, 2 UTF-16BE, 3 UTF-8). Several values (v2.4) → "A, B".
function text(enc, b) {
  const be = enc === 2 || (enc === 1 && b[0] === 0xfe && b[1] === 0xff); // UTF-16 BOM FE FF = big-endian
  const name = be ? "utf-16be" : ["latin1", "utf-16le", "", "utf-8"][enc] || "latin1";
  return new TextDecoder(name).decode(b).split("\0").filter(Boolean).join(", ").trim();
}

// End of a null-terminated string in encoding `enc` (2-byte null for UTF-16), from i.
function skipString(b, i, enc) {
  const wide = enc === 1 || enc === 2;
  while (i < b.length && !(b[i] === 0 && (!wide || b[i + 1] === 0))) i += wide ? 2 : 1;
  return i + (wide ? 2 : 1);
}

function picture(b, v2) {
  const enc = b[0];
  let i, mime;
  if (v2) { mime = latin1.decode(b.subarray(1, 4)).toLowerCase() === "png" ? "image/png" : "image/jpeg"; i = 4; }
  else { i = skipString(b, 1, 0); mime = latin1.decode(b.subarray(1, i - 1)) || "image/jpeg"; }
  const type = b[i];
  i = skipString(b, i + 1, enc);
  return { type, blob: new Blob([b.subarray(i)], { type: mime.includes("/") ? mime : "image/" + mime }) };
}

function id3v2(b) {
  const tags = {};
  if (latin1.decode(b.subarray(0, 3)) !== "ID3") return { tags, end: 0 };
  const ver = b[3], flags = b[5];
  const end = 10 + synchsafe(b, 6) + (flags & 0x10 ? 10 : 0);
  let body = b.subarray(10, 10 + synchsafe(b, 6));
  if (flags & 0x80 && ver < 4) body = unsync(body);
  let i = 0;
  if (flags & 0x40) i = ver === 4 ? synchsafe(body, 0) : 4 + u32(body, 0); // extended header
  const v2 = ver === 2, head = v2 ? 6 : 10;
  const pics = [];
  while (i + head <= body.length && body[i] !== 0) {
    const id = latin1.decode(body.subarray(i, v2 ? i + 3 : i + 4));
    const size = v2 ? (body[i + 3] << 16) | (body[i + 4] << 8) | body[i + 5] : ver === 4 ? synchsafe(body, i + 4) : u32(body, i + 4);
    const fflags = v2 ? 0 : body[i + 9];
    let data = body.subarray(i + head, i + head + size);
    i += head + size;
    if (ver === 4 && fflags & 0x02) data = unsync(data);
    if (ver === 4 && fflags & 0x01) data = data.subarray(4); // data length indicator
    if (fflags & 0x0c) continue; // compressed or encrypted: skip
    const key = { TIT2: "title", TT2: "title", TPE1: "artist", TP1: "artist", TALB: "album", TAL: "album" }[id];
    if (key && data.length) tags[key] = text(data[0], data.subarray(1));
    if ((id === "APIC" || id === "PIC") && data.length) pics.push(picture(data, v2));
  }
  tags.picture = (pics.find((p) => p.type === 3) || pics[0])?.blob || null; // 3 = front cover
  return { tags, end };
}

// Length from the first MPEG frame: Xing/Info or VBRI frame count, else constant bitrate from the file size.
const RATES1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const RATES2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
function mp3Length(b, start, audioEnd) {
  for (let i = start; i < Math.min(b.length - 4, start + 65536); i++) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) continue;
    const ver = (b[i + 1] >> 3) & 3, layer = (b[i + 1] >> 1) & 3, br = b[i + 2] >> 4, sr = (b[i + 2] >> 2) & 3;
    if (ver === 1 || layer !== 1 || br === 0 || br === 15 || sr === 3) continue; // not an MPEG Layer III frame header
    const mpeg1 = ver === 3, mono = b[i + 3] >> 6 === 3;
    const rate = [44100, 48000, 32000][sr] / (mpeg1 ? 1 : ver === 2 ? 2 : 4);
    const perFrame = mpeg1 ? 1152 : 576;
    const x = i + 4 + (mpeg1 ? (mono ? 17 : 32) : mono ? 9 : 17);
    const tagAt = (j) => latin1.decode(b.subarray(j, j + 4));
    if (["Xing", "Info"].includes(tagAt(x)) && b[x + 7] & 1) return (u32(b, x + 8) * perFrame) / rate;
    if (tagAt(i + 36) === "VBRI") return (u32(b, i + 50) * perFrame) / rate;
    return ((audioEnd - i) * 8) / ((mpeg1 ? RATES1 : RATES2)[br] * 1000);
  }
  return 0;
}

function readMp3(b) {
  const { tags, end } = id3v2(b);
  const v1 = b.length > 128 && latin1.decode(b.subarray(b.length - 128, b.length - 125)) === "TAG";
  if (v1) {
    const field = (at, n) => latin1.decode(b.subarray(b.length - 128 + at, b.length - 128 + at + n)).replace(/\0.*$/s, "").trim();
    tags.title ||= field(3, 30);
    tags.artist ||= field(33, 30);
    tags.album ||= field(63, 30);
  }
  tags.duration = mp3Length(b, end, b.length - (v1 ? 128 : 0));
  tags.picture ??= null;
  return tags;
}

// ---------- M4A ----------

// Child atoms of b[from..to): [{ type, start (of content), end }].
function atoms(b, from, to) {
  const out = [];
  for (let i = from; i + 8 <= to; ) {
    let size = u32(b, i), head = 8;
    if (size === 1) { size = u32(b, i + 8) * 2 ** 32 + u32(b, i + 12); head = 16; }
    else if (size === 0) size = to - i;
    if (size < head) break;
    out.push({ type: latin1.decode(b.subarray(i + 4, i + 8)), start: i + head, end: Math.min(i + size, to) });
    i += size;
  }
  return out;
}
const child = (b, parent, type) => atoms(b, parent.start, parent.end).find((a) => a.type === type);

function readM4a(b) {
  const tags = { picture: null, duration: 0 };
  const moov = atoms(b, 0, b.length).find((a) => a.type === "moov");
  if (!moov) return tags;
  const mvhd = child(b, moov, "mvhd");
  if (mvhd) {
    const s = mvhd.start, v1 = b[s] === 1;
    const scale = u32(b, s + (v1 ? 20 : 12));
    const length = v1 ? u32(b, s + 24) * 2 ** 32 + u32(b, s + 28) : u32(b, s + 16);
    if (scale) tags.duration = length / scale;
  }
  const meta = moov && child(b, child(b, moov, "udta") || { start: 0, end: 0 }, "meta");
  if (!meta) return tags;
  // "meta" is a full atom (4 bytes version/flags) in iTunes files, but not in some QuickTime ones.
  const box = latin1.decode(b.subarray(meta.start + 4, meta.start + 8)) === "hdlr" ? meta : { ...meta, start: meta.start + 4 };
  const ilst = child(b, box, "ilst");
  if (!ilst) return tags;
  const keys = { "©nam": "title", "©ART": "artist", "©alb": "album" };
  for (const item of atoms(b, ilst.start, ilst.end)) {
    const data = child(b, item, "data");
    if (!data) continue;
    const kind = u32(b, data.start) & 0xffffff, value = b.subarray(data.start + 8, data.end); // skip type + locale
    if (keys[item.type]) tags[keys[item.type]] = new TextDecoder().decode(value).trim();
    if (item.type === "covr" && value.length) tags.picture = new Blob([value], { type: kind === 14 ? "image/png" : "image/jpeg" });
  }
  return tags;
}
