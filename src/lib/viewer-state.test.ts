import { expect, test } from "vitest";
import { viewerState, type OwnClaim } from "./viewer-state";

const now = new Date("2026-10-10T00:00:00Z");
const base = { artistId: "a1", signedIn: true, isOwner: false, claims: [] as OwnClaim[], slots: 5, frozen: false, disputed: false, now };
const claim = (o: Partial<OwnClaim>): OwnClaim => ({ artist_id: "a1", claim_number: 7, visibility: "public", status: "active", dropped_at: null, ...o });

test("signed out", () => expect(viewerState({ ...base, signedIn: false }).kind).toBe("signed_out"));
test("can claim", () => expect(viewerState(base).kind).toBe("can_claim"));
test("holder gets the real number and visibility label", () => {
  expect(viewerState({ ...base, claims: [claim({ claim_number: 12, visibility: "anonymous" })] }))
    .toEqual({ kind: "holder", number: 12, visibilityLabel: "Anonymous" });
});
test("holder wins over frozen, disputed and owner", () => {
  expect(viewerState({ ...base, frozen: true, disputed: true, isOwner: true, claims: [claim({})] }).kind).toBe("holder");
});
test("another artist's active claim does not make a holder", () => {
  expect(viewerState({ ...base, claims: [claim({ artist_id: "other" })] }).kind).toBe("can_claim");
});
test("owner without a claim", () => expect(viewerState({ ...base, isOwner: true }).kind).toBe("owner"));
test("disputed and frozen", () => {
  expect(viewerState({ ...base, disputed: true }).kind).toBe("disputed");
  expect(viewerState({ ...base, frozen: true }).kind).toBe("frozen");
});
test("recent drop shows the date the wait ends", () => {
  const s = viewerState({ ...base, claims: [claim({ status: "historical", dropped_at: "2026-10-01T12:00:00Z" })] });
  expect(s).toEqual({ kind: "cooldown", until: "October 31, 2026" });
});
test("an old drop no longer blocks", () => {
  expect(viewerState({ ...base, claims: [claim({ status: "historical", dropped_at: "2026-08-01T00:00:00Z" })] }).kind).toBe("can_claim");
});
test("roster full when active claims reach the slots", () => {
  const claims = [1, 2].map((n) => claim({ artist_id: `x${n}`, claim_number: n }));
  expect(viewerState({ ...base, slots: 2, claims }).kind).toBe("roster_full");
  expect(viewerState({ ...base, slots: 3, claims }).kind).toBe("can_claim");
  expect(viewerState({ ...base, slots: null, claims }).kind).toBe("can_claim");
});
