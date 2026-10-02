import { expect, test } from "vitest";
import { multiplierFor, claimPoints, claimTotalPoints, isAtRisk, seasonTotals, ACCOUNT_MIN_AGE_DAYS, BASE_POINT, AT_RISK_DAYS } from "./scoring";

test("band edges (fixes the original overlap at 200)", () => {
  const edges: [number, number][] = [[1,5],[10,5],[11,3],[50,3],[51,2],[200,2],[201,1],[5000,1]];
  for (const [n, m] of edges) expect(multiplierFor(n)).toBe(m);
});
test("rejects bad numbers", () => {
  for (const n of [0, -1, 1.5, NaN]) expect(() => multiplierFor(n)).toThrow(RangeError);
});
test("points = growth x multiplier, never negative", () => {
  expect(claimPoints(10, 40, 7)).toBe(150);
  expect(claimPoints(10, 10, 7)).toBe(0);
  expect(claimPoints(40, 10, 7)).toBe(0);
});
test("claimPoints rejects fractional, NaN and negative counts", () => {
  expect(() => claimPoints(1.5, 10, 7)).toThrow(RangeError);
  expect(() => claimPoints(1, 10.5, 7)).toThrow(RangeError);
  expect(() => claimPoints(NaN, 10, 7)).toThrow(RangeError);
  expect(() => claimPoints(1, NaN, 7)).toThrow(RangeError);
  expect(() => claimPoints(-1, 10, 7)).toThrow(RangeError);
  expect(() => claimPoints(1, 10, 1.5)).toThrow(RangeError);
  expect(() => claimPoints(1, 10, NaN)).toThrow(RangeError);
});

test("base point is added to growth points", () => {
  expect(claimTotalPoints(10, 10, 7)).toBe(1);
  expect(claimTotalPoints(10, 40, 7)).toBe(151);
});
test("at risk: active and under 14 days old", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  expect(isAtRisk(new Date("2026-10-07T00:00:00Z"), null, now)).toBe(true);
  expect(isAtRisk(new Date("2026-10-06T00:00:00Z"), null, now)).toBe(false);
  expect(isAtRisk(new Date("2026-10-19T00:00:00Z"), new Date("2026-10-20T00:00:00Z"), now)).toBe(false);
});
test("season totals skip dropped claims and split out the at-risk part", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  const t = seasonTotals([
    { points: 6, claimedAt: new Date("2026-10-01T00:00:00Z"), droppedAt: null },
    { points: 1, claimedAt: new Date("2026-10-18T00:00:00Z"), droppedAt: null },
    { points: 9, claimedAt: new Date("2026-10-02T00:00:00Z"), droppedAt: new Date("2026-10-10T00:00:00Z") },
  ], now);
  expect(t).toEqual({ points: 7, atRisk: 1 });
});
test("shared constants match the database", () => {
  expect([ACCOUNT_MIN_AGE_DAYS, BASE_POINT, AT_RISK_DAYS]).toEqual([3, 1, 14]);
});
