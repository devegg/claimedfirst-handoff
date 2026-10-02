import { describe, it, expect } from "vitest";
import { formatBoardDate, claimStatusLabel, BOARD_EMPTY_TEXT, BOARD_NOTE, boardRowState, boardVisibilityLabel } from "./boards";

describe("formatBoardDate", () => {
  it("uses the UTC calendar day", () => {
    expect(formatBoardDate("2026-03-05T23:59:59Z")).toBe("2026-03-05");
    expect(formatBoardDate("2026-03-05T00:00:00+00:00")).toBe("2026-03-05");
  });
  it("returns empty text for an invalid date instead of throwing", () => {
    expect(formatBoardDate("not a date")).toBe("");
    expect(formatBoardDate("")).toBe("");
  });
});

describe("claimStatusLabel", () => {
  it("labels only historical claims", () => {
    expect(claimStatusLabel("historical")).toBe("Historical");
    expect(claimStatusLabel("active")).toBeNull();
    expect(claimStatusLabel("weird")).toBeNull();
  });
});

describe("boardVisibilityLabel", () => {
  it("maps known levels and falls back to public wording", () => {
    expect(boardVisibilityLabel("artist")).toBe("Artist only");
    expect(boardVisibilityLabel("anonymous")).toBe("Anonymous");
    expect(boardVisibilityLabel("nope")).toBe("Show my name");
  });
});

describe("boardRowState", () => {
  it("shows provisional claims with the days left, at least 1", () => {
    expect(boardRowState({ status: "active", provisional: true, held_days: 3 })).toEqual({ kind: "provisional", text: "counts in 11 days" });
    expect(boardRowState({ status: "active", provisional: true, held_days: 13 })).toEqual({ kind: "provisional", text: "counts in 1 day" });
    expect(boardRowState({ status: "active", provisional: true, held_days: 20 }).text).toBe("counts in 1 day");
  });
  it("labels early drops with the days held", () => {
    expect(boardRowState({ status: "historical", dropped_early: true, dropped_after_days: 5 })).toEqual({ kind: "dropped_early", text: "dropped after 5 days" });
    expect(boardRowState({ status: "historical", dropped_early: true, dropped_after_days: 1 }).text).toBe("dropped after 1 day");
  });
  it("keeps normal historical and active claims as before", () => {
    expect(boardRowState({ status: "historical", dropped_early: false, dropped_after_days: 40 })).toEqual({ kind: "historical", text: "Historical" });
    expect(boardRowState({ status: "active", provisional: false })).toEqual({ kind: "active", text: null });
  });
});

describe("copy", () => {
  it("has no exclamation marks and no longer says claims wait 14 days to appear", () => {
    expect(BOARD_EMPTY_TEXT).toBe("No claims yet.");
    expect(BOARD_EMPTY_TEXT + BOARD_NOTE).not.toContain("!");
    expect(BOARD_NOTE).not.toMatch(/appears? here after/i);
  });
});
