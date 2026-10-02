import { describe, expect, it } from "vitest";
import { formatUnlockDate, claimErrorCode, claimErrorMessage, saveErrorMessage, submitErrorMessage, watchErrorCode, watchErrorMessage } from "./claim-errors";

describe("claim errors", () => {
  it("maps each known code, even inside a longer message", () => {
    for (const c of ["roster_full", "cooldown", "already_claimed", "artist_not_claimable", "not_authenticated"])
      expect(claimErrorCode(`P0001: ${c}`)).toBe(c);
  });
  it("falls back for unknown, empty, null", () => {
    expect(claimErrorCode("boom")).toBeNull();
    expect(claimErrorCode("")).toBeNull();
    expect(claimErrorCode(null)).toBeNull();
    expect(claimErrorMessage(undefined)).toMatch(/went wrong/);
  });
  it("maps the claim lock and names the unlock date", () => {
    expect(claimErrorCode("claim_locked")).toBe("claim_locked");
    expect(claimErrorMessage("claim_locked", "2026-10-05T07:13:25Z")).toBe("This claim is locked until 5 October 2026 so numbers stay meaningful.");
    expect(claimErrorMessage("claim_locked", "not a date")).toMatch(/locked so numbers stay meaningful/);
    expect(claimErrorMessage("claim_locked")).not.toContain("!");
    expect(formatUnlockDate(null)).toBeNull();
  });
  it("has no exclamation marks", () => {
    expect(claimErrorMessage("roster_full")).not.toContain("!");
  });
  it("maps submit errors", () => {
    expect(submitErrorMessage("invalid_name")).toMatch(/1-80/);
    expect(submitErrorMessage("invalid_artist_url")).toMatch(/link/);
    expect(submitErrorMessage("ERROR: rate_limited")).toBe("You are adding artists quickly. Please try again later.");
    expect(submitErrorMessage("P0001: name_not_allowed")).toBe("That name can't be used. Use the name the artist goes by.");
    expect(submitErrorMessage("zzz")).toMatch(/went wrong/);
  });
});

describe("watch and save errors", () => {
  it("maps watch codes", () => {
    expect(watchErrorMessage("P0001: watchlist_full")).toBe("Your watchlist is full (100 artists). Remove one to add another.");
    expect(watchErrorMessage("artist_not_claimable")).toBe("This page is not open for watching right now.");
    expect(watchErrorCode("not_authenticated")).toBe("not_authenticated");
    expect(watchErrorMessage("not_authenticated")).toMatch(/Sign in/);
  });
  it("falls back for unknown and null", () => {
    expect(watchErrorCode("boom")).toBeNull();
    expect(watchErrorCode(null)).toBeNull();
    expect(watchErrorMessage(undefined)).toMatch(/went wrong/);
  });
  it("maps save errors", () => {
    expect(saveErrorMessage("not_authenticated")).toMatch(/Sign in/);
    expect(saveErrorMessage("not_your_claim")).toMatch(/Could not save/);
    expect(saveErrorMessage(null)).toMatch(/Could not save/);
  });
  it("maps the claim lock and names the unlock date", () => {
    expect(claimErrorCode("claim_locked")).toBe("claim_locked");
    expect(claimErrorMessage("claim_locked", "2026-10-05T07:13:25Z")).toBe("This claim is locked until 5 October 2026 so numbers stay meaningful.");
    expect(claimErrorMessage("claim_locked", "not a date")).toMatch(/locked so numbers stay meaningful/);
    expect(claimErrorMessage("claim_locked")).not.toContain("!");
    expect(formatUnlockDate(null)).toBeNull();
  });
  it("has no exclamation marks", () => {
    for (const m of ["watchlist_full", "artist_not_claimable", "not_authenticated", "x"])
      expect(watchErrorMessage(m) + saveErrorMessage(m)).not.toContain("!");
  });
});

const sub = submitErrorMessage;
it("slug errors are friendly", () => {
  expect(sub("slug_taken")).toContain("different artist");
  expect(sub("invalid_slug")).toContain("2-30");
});
