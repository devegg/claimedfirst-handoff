import { expect, test } from "vitest";
import { pageWindow } from "./pagination";

test("middle and last page", () => {
  expect(pageWindow(1, 25)).toEqual({ page: 1, pageCount: 3, from: 0, to: 9, hasPrev: false, hasNext: true });
  expect(pageWindow(3, 25)).toEqual({ page: 3, pageCount: 3, from: 20, to: 24, hasPrev: true, hasNext: false });
});
test("exact multiple has no empty trailing page", () => {
  expect(pageWindow(2, 20).pageCount).toBe(2);
  expect(pageWindow(2, 20)).toMatchObject({ from: 10, to: 19 });
});
test("empty list is one empty page", () => {
  expect(pageWindow(1, 0)).toEqual({ page: 1, pageCount: 1, from: 0, to: -1, hasPrev: false, hasNext: false });
});
test("bad page numbers clamp instead of failing", () => {
  expect(pageWindow(99, 25).page).toBe(3);
  for (const bad of [0, -3, NaN]) expect(pageWindow(bad, 25).page).toBe(1);
  expect(pageWindow(Infinity, 25).page).toBe(3);
  expect(pageWindow(2.7, 25).page).toBe(2);
});
test("page size must be positive", () => {
  expect(() => pageWindow(1, 25, 0)).toThrow(RangeError);
});
