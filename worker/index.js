import { isLoggedIn, login } from "./auth.js";
import { getFile } from "./storage.js";
import { serveFile } from "./files.js";
import { getState, savePlaylists, recordPlay } from "./state.js";
import { saveLyrics, removeLyrics } from "./lyrics.js";
import { saveArtistCover } from "./covers.js";
import { putSong, addSong } from "./import.js";
import { searchLrclib, fromLrclib, TIMED } from "./lrclib.js";
import { makeAiLyrics } from "./ai-lyrics.js";

// Runs only for /api/*, /audio/*, /covers/*, /lyrics/* (see run_worker_first in wrangler.toml).
// App files in app/ are served by Cloudflare static assets.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/login" && request.method === "POST") return login(request, env);
    if (!(await isLoggedIn(request, env))) return new Response("Not logged in", { status: 401 });

    if (pathname === "/api/library" && request.method === "GET") {
      const file = await getFile(env, "library.json");
      if (!file) return new Response("No library yet", { status: 404 });
      return new Response(file.body, { headers: { "Content-Type": "application/json" } });
    }

    if (pathname === "/api/state" && request.method === "GET") return getState(env);
    if (pathname === "/api/playlists" && request.method === "PUT") return savePlaylists(request, env);
    if (pathname === "/api/play" && request.method === "POST") return recordPlay(request, env);
    if (pathname === "/api/lyrics-search" && request.method === "GET") {
      const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 200);
      if (!q) return new Response("Empty search", { status: 400 });
      try { return Response.json(await searchLrclib(q)); } catch { return new Response("Search failed", { status: 502 }); }
    }
    if (pathname === "/api/lyrics-lookup" && request.method === "GET") { // import check step (B-44): badge only, saves nothing
      const p = new URL(request.url).searchParams, str = (k) => (p.get(k) || "").trim().slice(0, 300);
      const track = { title: str("title"), artist: str("artist"), album: str("album"), duration: +p.get("duration") || 0 };
      if (!track.title) return new Response("No title", { status: 400 });
      try {
        const text = await fromLrclib(track);
        return Response.json({ kind: !text ? "none" : TIMED.test(text) ? "synced" : "plain" });
      } catch { return new Response("Lookup failed", { status: 502 }); }
    }
    if (pathname.startsWith("/api/lyrics/") && request.method === "PUT") return saveLyrics(request, env, pathname.slice(12));
    if (pathname.startsWith("/api/lyrics-ai/") && request.method === "POST") return makeAiLyrics(env, pathname.slice(15));
    if (pathname.startsWith("/api/lyrics/") && request.method === "DELETE") return removeLyrics(env, pathname.slice(12));

    if (pathname === "/api/artist-cover" && request.method === "POST") return saveArtistCover(request, env);
    if (pathname.startsWith("/api/import/") && request.method === "PUT") return putSong(request, env, pathname.slice(12));
    if (pathname.startsWith("/api/import/") && request.method === "POST") return addSong(request, env, pathname.slice(12));

    if (/^\/(audio|covers|lyrics)\//.test(pathname) && request.method === "GET") return serveFile(request, env, pathname);

    return new Response("Not found", { status: 404 });
  },
};
