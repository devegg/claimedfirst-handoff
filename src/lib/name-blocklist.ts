/**
 * Words and short phrases that cannot appear in an artist name. Lowercase, plain letters only (the check
 * normalizes case, accents and common leetspeak first). Matched as WHOLE WORDS, never inside a longer word.
 * A phrase is several words separated by single spaces. To extend the list, add a line; nothing else changes.
 * Keep it short: it is a floor against obvious abuse, not a moderation system.
 */
export const BLOCKED_WORDS: readonly string[] = [
  // slurs
  "nigger", "nigga", "faggot", "fag", "kike", "spic", "chink", "gook", "wetback", "tranny", "retard", "coon",
  // strong profanity (Brian: not allowed in artist names; trim here if too strict)
  "fuck", "fucker", "fucking", "motherfucker", "shit", "shitty", "bullshit", "cunt", "asshole", "bitch", "dickhead",
  // threats
  "kys", "kill yourself", "kill them all", "i will kill you", "die in a fire", "rape you",
];
