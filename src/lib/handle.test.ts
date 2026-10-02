import { expect, test } from "vitest";
import { isValidHandle, isValidRefCode } from "./handle";

test("valid", () => {
  expect(isValidHandle("maya_1")).toBe(true);
  expect(isValidHandle("abc")).toBe(true);
  expect(isValidHandle("x".repeat(20))).toBe(true);
});
test("invalid", () => {
  for (const h of ["ab", "A_BC", "has space", "x".repeat(21), "admin", "claimedfirst", ""]) {
    expect(isValidHandle(h)).toBe(false);
  }
});
test("reserved words", () => {
  for (const h of ["admin", "claimedfirst", "support", "root", "api", "login", "onboarding", "artist", "scout", "about",
    "guide", "roster", "leaderboard", "submit", "invite", "terms", "privacy", "settings"]) {
    expect(isValidHandle(h)).toBe(false);
  }
});
test("ref code", () => {
  expect(isValidRefCode("abc123XY")).toBe(true);
  expect(isValidRefCode("x".repeat(16))).toBe(true);
  for (const c of ["", "x".repeat(17), "a-b", "a b", "a;b", "<s>"]) expect(isValidRefCode(c)).toBe(false);
});
