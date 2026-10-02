import { claimLevelLabel, type ClaimVisibility } from "@/lib/visibility";

export const COOLDOWN_DAYS = 30;

export type OwnClaim = {
  artist_id: string; claim_number: number; visibility: string; status: string; dropped_at: string | null;
};

export type ViewerInput = {
  artistId: string;
  signedIn: boolean;
  isOwner: boolean;
  /** The viewer's own claim rows (RLS returns only theirs). */
  claims: OwnClaim[];
  /** Slots the viewer has unlocked; null when unknown. */
  slots: number | null;
  frozen: boolean;
  disputed: boolean;
  now?: Date;
};

export type ViewerState =
  | { kind: "holder"; number: number; visibilityLabel: string }
  | { kind: "disputed" }
  | { kind: "frozen" }
  | { kind: "owner" }
  | { kind: "cooldown"; until: string }
  | { kind: "roster_full" }
  | { kind: "signed_out" }
  | { kind: "can_claim" };

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Presentation only: the server still enforces every rule when a claim is made. */
export function viewerState(i: ViewerInput): ViewerState {
  const now = i.now ?? new Date();
  const mine = i.claims.filter((c) => c.artist_id === i.artistId);
  const active = mine.find((c) => c.status === "active");
  if (active) {
    return { kind: "holder", number: active.claim_number, visibilityLabel: claimLevelLabel(active.visibility as ClaimVisibility) };
  }
  if (i.disputed) return { kind: "disputed" };
  if (i.frozen) return { kind: "frozen" };
  if (i.isOwner) return { kind: "owner" };
  if (!i.signedIn) return { kind: "signed_out" };
  const latestDrop = mine
    .filter((c) => c.status === "historical" && c.dropped_at)
    .map((c) => new Date(c.dropped_at as string))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  if (latestDrop) {
    const until = new Date(latestDrop.getTime() + COOLDOWN_DAYS * 86400000);
    if (until.getTime() > now.getTime()) return { kind: "cooldown", until: formatDate(until) };
  }
  const activeCount = i.claims.filter((c) => c.status === "active").length;
  if (i.slots !== null && activeCount >= i.slots) return { kind: "roster_full" };
  return { kind: "can_claim" };
}
