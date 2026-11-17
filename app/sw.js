// Service worker: lets the app open and play saved songs with no network.
// Songs are saved by app/data/cache.js. App files, song list, covers and lyrics are saved here.
const SONGS = "songs-v1";   // same name as in app/data/cache.js
const APP = "app-v1";       // page, code, icons, song list, playlists: newest copy seen
const COVERS = "covers-v1"; // covers + lyrics never change (key = file hash), so save once

// Take over the open page at once, so the first visit already uses the cache.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // normal network
  if (url.pathname.startsWith("/audio/")) e.respondWith(fromCache(e.request));
  else if (/^\/(covers|lyrics)\//.test(url.pathname)) e.respondWith(coverFirst(e.request));
  else e.respondWith(networkFirst(e.request));
});

// Internet first, so a deploy or a new import shows after a reload. No internet: last saved copy.
// Only good answers are saved: a "not logged in" (401) answer is never saved, and it also
// drops the old copy, so nothing opens offline without a login this device had.
async function networkFirst(request) {
  const key = request.mode === "navigate" ? "/" : request.url;
  const cache = await caches.open(APP);
  try {
    const res = await fetch(request);
    if (res.ok && res.status === 200) await cache.put(key, res.clone());
    else if (res.status === 401) await cache.delete(key);
    return res;
  } catch (e) {
    const saved = await cache.match(key);
    if (saved) return saved;
    throw e; // never opened online: let the page show its "no internet" message
  }
}

async function coverFirst(request) {
  const cache = await caches.open(COVERS);
  const saved = await cache.match(request.url);
  if (saved) return saved;
  const res = await fetch(request);
  if (res.ok && res.status === 200) await cache.put(request.url, res.clone());
  return res;
}

async function fromCache(request) {
  const saved = await caches.match(request.url, { cacheName: SONGS });
  if (!saved) return fetch(request); // not saved yet: go to the Worker as before
  const range = request.headers.get("Range");
  if (!range) return saved;

  // Safari asks for pieces ("bytes=0-1", "bytes=500-", "bytes=-100") and needs 206 back.
  const blob = await saved.blob();
  const size = blob.size;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start, end;
  if (m && m[1] !== "") [start, end] = [+m[1], m[2] !== "" ? Math.min(+m[2], size - 1) : size - 1];
  else if (m && m[2] !== "") [start, end] = [Math.max(size - +m[2], 0), size - 1];
  if (start == null || start > end || start >= size) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": saved.headers.get("Content-Type") || blob.type,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
    },
  });
}
