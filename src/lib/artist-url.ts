export const SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,29}$/;

/** Default page address from a canonical key: platform prefix and leading @ dropped, sanitized, capped at 30. Mirrors submit_artist (migration 0028). Returns "" when nothing usable is left. */
export function slugFromKey(key: string): string {
  const rest = key.slice(key.indexOf(":") + 1).replace(/^channel\//, "").replace(/^@/, "").toLowerCase();
  const trim = (v: string) => v.replace(/^[-_]+|[-_]+$/g, "");
  return trim(trim(rest.replace(/[^a-z0-9_-]+/g, "-")).slice(0, 30));
}

export function canonicalArtistKey(raw: string) {
  const c = canonicalKeyOnly(raw);
  return { ...c, slug: slugFromKey(c.key) };
}

function canonicalKeyOnly(raw: string) {
  const input = raw.trim();
  if (!input) throw new Error("invalid_artist_url");
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`); }
  catch { throw new Error("invalid_artist_url"); }
  if (!u.hostname.includes(".")) throw new Error("invalid_artist_url");
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const path = u.pathname.replace(/\/+$/, "");
  const url = `https://${host}${path}`;
  if (host === "suno.com" && /^\/@[^/]+$/.test(path)) return { platform: "suno", key: `suno:${path.slice(1).toLowerCase()}`, url };
  if (host === "youtube.com") {
    if (/^\/channel\/[^/]+$/.test(path)) return { platform: "youtube", key: `youtube:${path.slice(1)}`, url };
    if (/^\/@[^/]+$/.test(path)) return { platform: "youtube", key: `youtube:${path.slice(1).toLowerCase()}`, url };
  }
  return { platform: "web", key: `web:${host}${path.toLowerCase()}`, url };
}
