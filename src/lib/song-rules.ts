// Client-side mirror of the database rules (is_public_https_url, set_top_songs, set_donation_url).
// The database stays the authority; these checks only give fast, per-field feedback.

export const MAX_SONGS = 10;
export const MAX_SONG_URL = 500;
export const MAX_DONATION_URL = 300;
export const MAX_TITLE = 100;
export const MAX_REPORT_REASON = 500;

export type FieldError = "url_required" | "url_too_long" | "url_invalid" | "title_required" | "title_too_long";

const URL_RE = /^https:\/\/([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?(:[0-9]{1,5})?([/?#][^ \t\n\r\f\v\x00-\x1f\x7f]*)?$/i;

function checkUrl(url: string, max: number): FieldError | null {
  if (url === "") return "url_required";
  if (url.length > max) return "url_too_long";
  if (!URL_RE.test(url)) return "url_invalid";
  const host = /^https:\/\/([^/?#:]*)/.exec(url)?.[1] ?? "";
  if (/^[0-9.]+$/.test(host) || host.toLowerCase() === "localhost") return "url_invalid";
  return null;
}

export function validateSongUrl(url: string): FieldError | null {
  return checkUrl(url, MAX_SONG_URL);
}

/** A blank value clears the donation link, so it is valid. */
export function validateDonationUrl(url: string): FieldError | null {
  if (url.trim() === "") return null;
  return checkUrl(url, MAX_DONATION_URL);
}

export function validateSongTitle(title: string): FieldError | null {
  const t = title.trim();
  if (t.length === 0) return "title_required";
  if (t.length > MAX_TITLE) return "title_too_long";
  return null;
}

export const FIELD_MESSAGES: Record<FieldError, string> = {
  url_required: "Add a link.",
  url_too_long: "That link is too long.",
  url_invalid: "Use a full https:// link to a public website.",
  title_required: "Add a song title.",
  title_too_long: "Keep the title to 100 characters.",
};

export type SongRow = { title: string; url: string };
export type RowResult = { empty: boolean; titleError: FieldError | null; urlError: FieldError | null };
export type SongsResult = {
  rows: RowResult[];
  songs: SongRow[];
  validCount: number;
  errorCount: number;
  tooMany: boolean;
  ok: boolean;
  summary: string;
};

/** Empty rows (blank title and link) are ignored. */
export function validateSongs(input: SongRow[]): SongsResult {
  const rows: RowResult[] = input.map((r) => {
    const empty = r.title.trim() === "" && r.url.trim() === "";
    if (empty) return { empty, titleError: null, urlError: null };
    return { empty, titleError: validateSongTitle(r.title), urlError: validateSongUrl(r.url.trim()) };
  });
  const filled = rows.filter((r) => !r.empty);
  const bad = filled.filter((r) => r.titleError || r.urlError).length;
  const validCount = filled.length - bad;
  const tooMany = filled.length > MAX_SONGS;
  const songs = input
    .filter((_, i) => !rows[i].empty)
    .map((r) => ({ title: r.title.trim(), url: r.url.trim() }));
  let summary: string;
  if (tooMany || filled.length === 0) summary = `Add up to ${MAX_SONGS} songs`;
  else if (bad > 0) summary = `${bad} ${bad === 1 ? "song needs" : "songs need"} a fix`;
  else summary = `${validCount} ${validCount === 1 ? "song" : "songs"} ready`;
  return { rows, songs, validCount, errorCount: bad, tooMany, ok: !tooMany && bad === 0, summary };
}

const TOOLS_MESSAGES: [string, string][] = [
  ["invalid_song_url", "One of the song links is not valid. Use a full https:// link to a public website."],
  ["invalid_song", "Each song needs a title (up to 100 characters) and a link."],
  ["invalid_songs", "Those songs could not be read. Reload the page and try again."],
  ["too_many_songs", "You can list up to 10 songs."],
  ["invalid_donation_url", "That support link is not valid. Use a full https:// link to a public website."],
  ["invalid_style", "That record style is not one of the available styles."],
  ["invalid_reason", "Write a reason of 1 to 500 characters."],
  ["artist_not_found", "This page could not be found."],
  ["not_owner", "Only the verified owner of this page can do that."],
  ["not_authenticated", "Sign in to do that."],
  ["report_limit_reached", "You have reached the limit of 5 reports in a day. Please try again tomorrow."],
  ["account_too_new", "Reports open when your account is 3 days old."],
  ["rate_limited", "You are reporting quickly. Please try again later."],
];

/** Maps a database error message to plain copy. */
export function artistToolsErrorMessage(message: string | null | undefined): string {
  if (message) for (const [code, text] of TOOLS_MESSAGES) if (message.includes(code)) return text;
  return "Something went wrong. Try again.";
}
