import { BLOCKED_WORDS } from "./name-blocklist";

export type NameCheck = { ok: true } | { ok: false; reason: "symbols_only" | "promotion" | "repeated" | "blocked" };

// Same structural rules are enforced in SQL by submit_artist (migration 0030). Keep the two in step.
const TLDS = "com|net|org|io|co|me|ly|gg|tv|xyz|app|link|site|shop|club|info|biz";
const URL_RE = new RegExp(`(https?://|www\\.|[a-z0-9-]+\\.(?:${TLDS})(?:[^a-z0-9]|$))`, "i");
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /\+?[0-9][0-9 ().-]{5,}[0-9]/;
const REPEAT_RE = /([\s\S])\1{7,}/iu;

const LEET: Record<string, string> = { "0": "o", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i", "+": "t", "|": "i" };

function fold(text: string, one: "i" | "l"): string {
  return text
    .normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[0345 7@$!+|]/g, (c) => LEET[c] ?? c)
    .replace(/1/g, one)
    .replace(/([\s\S])\1{2,}/gu, "$1$1"); // "niggggger" -> "nigger"-like; real words rarely repeat a letter 3 times
}

function words(text: string): string[] {
  return text.split(/[^\p{L}]+/u).filter(Boolean);
}

const collapse = (s: string) => s.replace(/([\s\S])\1+/gu, "$1");
// Compare with doubled letters collapsed on both sides, so "niger" and "nigger" both match.
const BLOCKED = BLOCKED_WORDS.map((w) => w.split(" ").map(collapse).join(" "));

// Short words that are safe to match inside joined text (no common innocent names contain them).
const JOINED_SHORT = new Set(["fuck"]);

function hitsBlocklist(name: string): boolean {
  for (const one of ["i", "l"] as const) {
    const ws = words(fold(name, one)).map(collapse);
    for (const entry of BLOCKED) {
      const parts = entry.split(" ");
      for (let i = 0; i + parts.length <= ws.length; i++) {
        // the last word may carry a plural s or z
        if (parts.every((p, k) => ws[i + k] === p || (k === parts.length - 1 && (ws[i + k] === p + "s" || ws[i + k] === p + "z")))) return true;
      }
    }
    // Spacing and punctuation evasion: letters only, joined, against single words of 5+ letters.
    const joined = collapse(fold(name, one).replace(/[^\p{L}]/gu, ""));
    if (BLOCKED.some((e) => (e.length >= 5 || JOINED_SHORT.has(e)) && !e.includes(" ") && joined.includes(e))) return true;
  }
  return false;
}

/** Checks an artist name at submit. The result never carries the offending word. */
export function checkArtistName(raw: string): NameCheck {
  const name = raw.trim();
  if (!/[\p{L}\p{N}]/u.test(name)) return { ok: false, reason: "symbols_only" };
  if (URL_RE.test(name) || EMAIL_RE.test(name) || (PHONE_RE.test(name) && name.replace(/\D/g, "").length >= 7)) {
    return { ok: false, reason: "promotion" };
  }
  if (REPEAT_RE.test(name)) return { ok: false, reason: "repeated" };
  if (hitsBlocklist(name)) return { ok: false, reason: "blocked" };
  return { ok: true };
}
