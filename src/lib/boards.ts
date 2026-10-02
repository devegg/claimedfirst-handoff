import { isClaimVisibility, claimLevelLabel } from "./visibility";

export const BOARD_EMPTY_TEXT = "No claims yet.";
export const BOARD_NOTE = "Claims show here as soon as they are made. Newer ones are provisional.";

/** Provisional period and the new columns from migration 0036. Rows from an older database lack them. */
export type BoardClaimFlags = {
  status: string; held_days?: number | null; provisional?: boolean | null;
  dropped_after_days?: number | null; dropped_early?: boolean | null;
};
export type BoardRowState = { kind: "provisional" | "dropped_early" | "historical" | "active"; text: string | null };

export function boardRowState(r: BoardClaimFlags): BoardRowState {
  if (r.provisional) {
    const n = Math.max(1, 14 - Math.max(0, r.held_days ?? 0));
    return { kind: "provisional", text: `counts in ${n} ${n === 1 ? "day" : "days"}` };
  }
  if (r.dropped_early) {
    const n = Math.max(0, r.dropped_after_days ?? 0);
    return { kind: "dropped_early", text: `dropped after ${n} ${n === 1 ? "day" : "days"}` };
  }
  if (r.status === "historical") return { kind: "historical", text: "Historical" };
  return { kind: "active", text: null };
}

/** UTC calendar day as YYYY-MM-DD; empty string when the value is not a date. */
export function formatBoardDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function claimStatusLabel(status: string): string | null {
  return status === "historical" ? "Historical" : null;
}

export function boardVisibilityLabel(v: string): string {
  return claimLevelLabel(isClaimVisibility(v) ? v : "public");
}
