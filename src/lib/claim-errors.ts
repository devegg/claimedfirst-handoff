export const CLAIM_MESSAGES: Record<string, string> = {
  roster_full: "Your Roster is full. Drop a claim or bring friends to open more slots.",
  cooldown: "You dropped this Artist recently. You can claim them again after 30 days.",
  already_claimed: "You have already claimed this Artist.",
  artist_not_claimable: "This Artist can't be claimed right now.",
  not_authenticated: "Sign in to claim this Artist.",
  claim_locked: "This claim is locked so numbers stay meaningful.",
};

/** The claim lock lasts 72 hours (migration 0035); the database sends the unlock time as the error detail. */
export const CLAIM_LOCK_HOURS = 72;

/** "5 October 2026", in UTC so the same date shows everywhere. null when the text is not a date. */
export function formatUnlockDate(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "5 October 2026, 14:30 UTC". null when the text is not a date. */
export function formatUnlockDateTime(iso: string | undefined | null): string | null {
  const d = formatUnlockDate(iso);
  if (!d || !iso) return null;
  const hm = new Date(Date.parse(iso)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return `${d}, ${hm} UTC`;
}

/** "5 Oct 2026, 07:40 BST" in the viewer's own timezone, with its label. null when the text is not a date. */
export function formatLocalDateTime(iso: string | undefined | null): string | null {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
}

/** When a claim made at claimedAt can be dropped (claimed_at plus 72 hours, as in migration 0035); null if claimedAt is not a date. */
export function claimUnlockIso(claimedAt: string | null | undefined): string | null {
  const t = claimedAt ? Date.parse(claimedAt) : NaN;
  return Number.isNaN(t) ? null : new Date(t + CLAIM_LOCK_HOURS * 3600_000).toISOString();
}

/** Maps a database error message to a stable code, or null if unknown. */
export function claimErrorCode(message: string | undefined | null): string | null {
  if (!message) return null;
  return Object.keys(CLAIM_MESSAGES).find((k) => message.includes(k)) ?? null;
}

export function claimErrorMessage(message: string | undefined | null, details?: string | null): string {
  const code = claimErrorCode(message);
  if (code === "claim_locked") {
    const date = formatUnlockDate(details);
    return date ? `This claim is locked until ${date} so numbers stay meaningful.` : CLAIM_MESSAGES.claim_locked;
  }
  return code ? CLAIM_MESSAGES[code] : "Something went wrong. Try again.";
}

const SUBMIT_MESSAGES: Record<string, string> = {
  invalid_name: "Enter an Artist name of 1-80 characters with at least one letter or number.",
  invalid_artist_url: "That doesn't look like a valid link. Paste the Artist's page address.",
  name_not_allowed: "That name can't be used. Use the name the artist goes by.",
  not_authenticated: "Sign in to submit an Artist.",
  slug_taken: "That page address is already used by a different artist. Choose another address.",
  invalid_slug: "Page address must be 2-30 characters: letters, numbers, - or _, starting with a letter or number.",
  rate_limited: "You are adding artists quickly. Please try again later.",
};
export function submitErrorMessage(message: string | undefined | null): string {
  const k = Object.keys(SUBMIT_MESSAGES).find((x) => message?.includes(x));
  return k ? SUBMIT_MESSAGES[k] : "Something went wrong. Try again.";
}

const WATCH_MESSAGES: Record<string, string> = {
  watchlist_full: "Your watchlist is full (100 artists). Remove one to add another.",
  artist_not_claimable: "This page is not open for watching right now.",
  not_authenticated: "Sign in to watch this Artist.",
};

export function watchErrorCode(message: string | undefined | null): string | null {
  if (!message) return null;
  return Object.keys(WATCH_MESSAGES).find((k) => message.includes(k)) ?? null;
}

export function watchErrorMessage(message: string | undefined | null): string {
  const code = watchErrorCode(message);
  return code ? WATCH_MESSAGES[code] : "Something went wrong. Try again.";
}

/** For changing privacy choices and defaults. */
export function saveErrorMessage(message: string | undefined | null): string {
  return message?.includes("not_authenticated") ? "Sign in to change this." : "Could not save. Try again.";
}
