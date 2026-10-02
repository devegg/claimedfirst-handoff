export type ClaimVisibility = "public" | "artist" | "anonymous";
export type WatchLevel = "named" | "anonymous";

export type SheetOption<V extends string> = { value: V; label: string; description?: string };

export const CLAIM_OPTIONS: SheetOption<ClaimVisibility>[] = [
  { value: "public", label: "Show my name", description: "The artist, the Founders board and your profile show your handle." },
  { value: "artist", label: "Artist only", description: 'The artist sees you are a fan. Everyone else sees "Anonymous scout."' },
  { value: "anonymous", label: "Anonymous", description: "Nobody sees your name, not even the artist." },
];

export const WATCH_OPTIONS: SheetOption<WatchLevel>[] = [
  { value: "named", label: "Name visible to the artist" },
  { value: "anonymous", label: "Anonymous" },
];

export function isClaimVisibility(v: unknown): v is ClaimVisibility {
  return v === "public" || v === "artist" || v === "anonymous";
}

/** An unknown stored level is shown and edited as the most private one, never as public. */
export function claimVisibilityOrAnonymous(v: unknown): ClaimVisibility {
  return isClaimVisibility(v) ? v : "anonymous";
}

export function claimLevelLabel(v: ClaimVisibility): string {
  return CLAIM_OPTIONS.find((o) => o.value === v)?.label ?? "Show my name";
}

export function watchLevelLabel(v: WatchLevel): string {
  return WATCH_OPTIONS.find((o) => o.value === v)?.label ?? "Anonymous";
}

export function watchLevelFromNamed(named: boolean | null | undefined): WatchLevel {
  return named ? "named" : "anonymous";
}

/** Reads the scout's own profile defaults; anything unreadable falls back to public claims and anonymous watches. */
export function parseDefaults(
  row: { default_claim_visibility?: unknown; default_watch_named?: unknown } | null | undefined,
): { claim: ClaimVisibility; watch: WatchLevel } {
  return {
    claim: isClaimVisibility(row?.default_claim_visibility) ? row.default_claim_visibility : "public",
    watch: watchLevelFromNamed(row?.default_watch_named === true),
  };
}
