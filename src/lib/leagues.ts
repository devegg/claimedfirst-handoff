const NAMES = ["Opening", "Rising", "Seasoned", "Veteran", "Summit"];

export function leagueFor(slots: number, boundaries: number[]): number {
  if (!Number.isInteger(slots) || slots < 0) throw new RangeError("slots must be a non-negative integer");
  return 1 + [...boundaries].sort((a, b) => a - b).filter((b) => slots > b).length;
}

export function leagueName(index: number, total: number): string | null {
  if (total <= 1) return null;
  const pos = total === 2 ? [0, 4] : Array.from({ length: total }, (_, i) => Math.round((i * (NAMES.length - 1)) / (total - 1)));
  return `${NAMES[pos[index]]} League`;
}

// Reads the ?league=N query param (1-based). Anything that is not a whole number in 1..count
// gives the fallback, and itself falls back to 1 when out of range.
export function parseLeagueParam(value: string | string[] | undefined, count: number, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw !== undefined && /^\d+$/.test(raw)) {
    const n = Number(raw);
    if (n >= 1 && n <= count) return n;
  }
  return Number.isInteger(fallback) && fallback >= 1 && fallback <= count ? fallback : 1;
}
