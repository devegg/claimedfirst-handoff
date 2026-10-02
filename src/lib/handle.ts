// Keep RESERVED in sync with supabase/migrations/0004_profile.sql (create_profile).
export const RESERVED_HANDLES = [
  "admin", "claimedfirst", "support", "root", "api", "login", "onboarding", "artist", "scout", "about",
  "guide", "roster", "leaderboard", "submit", "invite", "terms", "privacy", "settings",
] as const;
const RESERVED = new Set<string>(RESERVED_HANDLES);

export function isValidHandle(h: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(h) && !RESERVED.has(h);
}

export const REF_COOKIE = "ref";
export function isValidRefCode(c: string): boolean {
  return /^[A-Za-z0-9]{1,16}$/.test(c);
}
