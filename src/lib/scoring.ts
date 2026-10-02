export function multiplierFor(n: number): 1 | 2 | 3 | 5 {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("claim number must be a positive integer");
  if (n <= 10) return 5;
  if (n <= 50) return 3;
  if (n <= 200) return 2;
  return 1;
}

export function claimPoints(baseQualified: number, nowQualified: number, claimNumber: number): number {
  for (const v of [baseQualified, nowQualified]) {
    if (!Number.isInteger(v) || v < 0) throw new RangeError("qualified counts must be non-negative integers");
  }
  return Math.max(0, nowQualified - baseQualified) * multiplierFor(claimNumber);
}

/** Mirrors migrations 0034 and 0037: the shared account-age rule, the base point and the early-drop window. */
export const ACCOUNT_MIN_AGE_DAYS = 3;
export const BASE_POINT = 1;
export const AT_RISK_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Growth points plus the 1 base point every counted claim earns. */
export function claimTotalPoints(baseQualified: number, nowQualified: number, claimNumber: number): number {
  return claimPoints(baseQualified, nowQualified, claimNumber) + BASE_POINT;
}

/** A claim is at risk while it is still active and younger than 14 days: dropping it early would lose its points. */
export function isAtRisk(claimedAt: Date, droppedAt: Date | null, now: Date): boolean {
  return droppedAt === null && now.getTime() - claimedAt.getTime() < AT_RISK_DAYS * DAY_MS;
}

/** Season totals for a scout: dropped claims earn nothing; at risk is the part from claims under 14 days old. */
export function seasonTotals(
  claims: { points: number; claimedAt: Date; droppedAt: Date | null }[],
  now: Date,
): { points: number; atRisk: number } {
  let points = 0;
  let atRisk = 0;
  for (const c of claims) {
    if (c.droppedAt !== null) continue;
    points += c.points;
    if (isAtRisk(c.claimedAt, c.droppedAt, now)) atRisk += c.points;
  }
  return { points, atRisk };
}

/** Whole days (rounded up) until growth points start for an account made at createdAt; 0 once it is old enough or the date is unknown. */
export function growthDaysLeft(createdAt: string | null | undefined, now: Date = new Date()): number {
  const t = createdAt ? Date.parse(createdAt) : NaN;
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.ceil((t + ACCOUNT_MIN_AGE_DAYS * DAY_MS - now.getTime()) / DAY_MS));
}
