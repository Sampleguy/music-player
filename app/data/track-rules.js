// Song rules shared by the app import (B-33), the Mac import script and the Worker. One copy only.
export const TYPES = { mp3: "audio/mpeg", m4a: "audio/mp4" };

// Stored title: drops "(Video Oficial)", "(Audio Oficial)", "[Official Lyrics]", "(Prod. X)" and a trailing "lyrics".
// Applied when a song is added (app or Mac script); titles already in the library stay as they are.
export const tidyTitle = (t) =>
  t.replace(/\s*[([][^)\]]*\b(video|audio|lyrics?|letra|prod)\b[^)\]]*[)\]]/gi, "").replace(/\s*[-–]?\s*\blyrics?$/i, "").trim() || t;

// Tags → library fields. Missing tags get the same fallbacks everywhere.
export function trackFields(tags, fileName) {
  return {
    title: tidyTitle(tags.title || fileName.replace(/\.[^.]+$/, "")),
    artist: tags.artist || "Unknown artist",
    album: tags.album || "Unknown album",
    duration: Math.round((tags.duration || 0) * 10) / 10,
  };
}

// Library order: artist, album, title.
export const sortTracks = (tracks) =>
  tracks.sort((a, b) => (a.artist + a.album + a.title).localeCompare(b.artist + b.album + b.title));

// For the lyrics search only (stored titles stay as tagged).
// "Blanca Banca (feat. Chvloskr)" → "Blanca Banca"; "A, B & C" → "A". Drops feat./ft./with parts and extra brackets.
export const cleanTitle = (t) => t.replace(/\s*[([].*?[)\]]/g, "").replace(/\s+(feat\.?|ft\.?|with)\s.*$/i, "").trim();
export const mainArtist = (a) => a.split(/\s*(?:,|&|;|\/|\bx\b|\bfeat\.?|\bft\.?|\bwith\b)\s*/i)[0].trim();
