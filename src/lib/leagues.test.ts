import { expect, test } from "vitest";
import { leagueFor, leagueName, parseLeagueParam } from "./leagues";

test("one boundary at 20: 20 or fewer vs more than 20", () => {
  expect(leagueFor(5, [20])).toBe(1);
  expect(leagueFor(20, [20])).toBe(1);
  expect(leagueFor(21, [20])).toBe(2);
  expect(leagueFor(50, [20])).toBe(2);
});
test("no boundaries means a single league", () => {
  expect(leagueFor(50, [])).toBe(1);
});
test("one league per slot level", () => {
  const b = [5, 10, 20, 30];
  expect([5, 6, 10, 11, 20, 21, 30, 31, 50].map((n) => leagueFor(n, b))).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 5]);
});
test("unsorted boundaries are handled and the input is not mutated", () => {
  const b = [30, 10];
  expect(leagueFor(15, b)).toBe(2);
  expect(b).toEqual([30, 10]);
});
test("bad slot counts are rejected", () => {
  for (const n of [-1, 1.5, NaN]) expect(() => leagueFor(n, [20])).toThrow(RangeError);
});
test("names are never numbers and never reveal slot levels", () => {
  expect(leagueName(0, 1)).toBeNull();
  for (let total = 2; total <= 5; total++) {
    const names = Array.from({ length: total }, (_, i) => leagueName(i, total) as string);
    expect(new Set(names).size).toBe(total);
    for (const n of names) expect(n).not.toMatch(/\d/);
  }
});

test("parseLeagueParam accepts a valid league", () => {
  expect(parseLeagueParam("2", 3, 1)).toBe(2);
  expect(parseLeagueParam("3", 3, 1)).toBe(3);
});
test("parseLeagueParam falls back for missing, NaN, zero, negative, too large and decimal values", () => {
  for (const v of [undefined, "", "abc", "NaN", "0", "-1", "4", "1.5", "2e0x"]) expect(parseLeagueParam(v, 3, 2)).toBe(2);
});
test("parseLeagueParam uses the first value of an array", () => {
  expect(parseLeagueParam(["3", "1"], 3, 1)).toBe(3);
  expect(parseLeagueParam(["9", "1"], 3, 2)).toBe(2);
  expect(parseLeagueParam([], 3, 2)).toBe(2);
});
test("parseLeagueParam clamps a bad fallback into range", () => {
  expect(parseLeagueParam(undefined, 3, 7)).toBe(1);
});
