import { expect, test } from "vitest";
import { GUIDE, GUIDE_IDS } from "./guide";
import { findNumberLeak } from "./guide-guard";

const REQUIRED = ["claim", "claim-number", "roster", "slot", "historical-claim", "watchlist", "privacy", "fan-created-page", "verified-artist", "founders-board", "historical-100", "season-board", "points", "hold-14", "wait-30", "leagues", "anonymous-scout"];

test("every term the app uses has an entry", () => {
  for (const id of REQUIRED) expect(GUIDE_IDS).toContain(id);
});
test("entries are short, plain and complete", () => {
  for (const id of GUIDE_IDS) {
    const e = GUIDE[id];
    expect(e.title.length).toBeGreaterThan(0);
    expect(e.short.length).toBeGreaterThan(0);
    expect(e.short.length).toBeLessThanOrEqual(160);
    expect(e.body.length).toBeGreaterThan(e.short.length);
    expect(`${e.short}${e.body}`).not.toContain("!");
  }
});
test("the guide states the public ladder, the lock, provisional claims, base and at-risk points, and pending pages", () => {
  expect(GUIDE["referral-ladder"].body).toContain("20 friends open 50 slots");
  expect(GUIDE["claim-lock"].short).toContain("3 days");
  expect(GUIDE["hold-14"].title).toBe("Provisional claim");
  expect(GUIDE["base-point"].short).toContain("1 point");
  expect(GUIDE["at-risk"].short).toContain("under 14 days");
  expect(GUIDE["pending-page"].body).toContain("A verified artist counts as 2");
  for (const id of GUIDE_IDS) expect(GUIDE[id].body).not.toMatch(/appears? after it has been held for 14 days/);
});
test("apart from the one ladder sentence, the guide never spells out friend counts or slot levels", () => {
  for (const id of GUIDE_IDS) expect(findNumberLeak(`${GUIDE[id].short} ${GUIDE[id].body}`), id).toBeNull();
});
test("anonymous scout entry says what it means", () => {
  expect(GUIDE["anonymous-scout"].short).toBe("Someone who chose not to show their name to the artist or on the boards. They still count and still score.");
});

test("no guide entry or claim message uses the word unlock", async () => {
  const { CLAIM_MESSAGES } = await import("./claim-errors");
  for (const id of GUIDE_IDS) expect(`${GUIDE[id].title} ${GUIDE[id].short} ${GUIDE[id].body}`, id).not.toMatch(/unlock/i);
  expect(Object.values(CLAIM_MESSAGES).join(" ")).not.toMatch(/unlock/i);
});
