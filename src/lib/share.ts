export const ANON_LABEL = "Anonymous scout";

export function claimShareText(handle: string, artist: string, claimNumber: number) {
  return {
    title: `${handle} was #${claimNumber} on ${artist}`,
    description: `Be #${claimNumber + 1}. Claim ${artist} before everyone else does.`,
  };
}

export const MILESTONES = [10, 100, 1000] as const;
export type Milestone = (typeof MILESTONES)[number];

/** The highest milestone crossed going from `before` to `after`, or null. */
export function milestoneHit(before: number, after: number): Milestone | null {
  for (const m of [1000, 100, 10] as const) if (before < m && after >= m) return m;
  return null;
}

/** The highest milestone a claimer count has reached, or null. */
export function highestMilestone(claimers: number): Milestone | null {
  return milestoneHit(0, claimers);
}

export const formatCount = (n: number) => n.toLocaleString("en-US");

/** Share link carrying the sharer's referral code. Throws on a non-integer or non-positive number. */
export function buildShareLink(origin: string, slug: string, claimNumber: number, ref: string | null): string {
  if (!Number.isInteger(claimNumber) || claimNumber < 1) throw new Error("invalid_claim_number");
  const base = `${origin.replace(/\/$/, "")}/c/${encodeURIComponent(slug)}/${claimNumber}`;
  return ref && /^[A-Za-z0-9]{1,16}$/.test(ref) ? `${base}?ref=${encodeURIComponent(ref)}` : base;
}

export type ShareVisibility = "public" | "artist" | "anonymous";

/** Unknown or missing visibility is treated as anonymous: the handle is only shown for an explicit "public". */
export function shareVisibility(v: unknown): ShareVisibility {
  return v === "public" || v === "artist" ? v : "anonymous";
}

export const DEFAULT_SITE_HOST = "claimedfirst.com";

/** Host (with port, if any) of the site URL, falling back to claimedfirst.com. */
export function siteHost(url: string | undefined): string {
  try { return url ? new URL(url).host || DEFAULT_SITE_HOST : DEFAULT_SITE_HOST; } catch { return DEFAULT_SITE_HOST; }
}
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${DEFAULT_SITE_HOST}`;

/** "Oct 1, 2026" from an ISO date or timestamp, in UTC (the same clock the app uses everywhere). Empty if unreadable. */
export function formatClaimDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
