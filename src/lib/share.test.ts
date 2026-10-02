import { describe, expect, it } from "vitest";
import { claimShareText, formatClaimDate, milestoneHit, buildShareLink, formatCount, shareVisibility, siteHost } from "./share";

describe("claimShareText", () => {
  it("carries the number", () => {
    expect(claimShareText("maya", "Ember Vale", 7)).toEqual({
      title: "maya was #7 on Ember Vale",
      description: "Be #8. Claim Ember Vale before everyone else does.",
    });
  });
  it("works for a masked name", () => {
    expect(claimShareText("Anonymous scout", "Ember Vale", 7).title).toBe("Anonymous scout was #7 on Ember Vale");
  });
  it("uses no exclamation marks", () => {
    const t = claimShareText("maya", "Ember Vale", 7);
    expect(t.title + t.description).not.toContain("!");
  });
});

describe("milestoneHit", () => {
  it.each([
    [9, 10, 10], [99, 101, 100], [10, 11, null], [999, 1000, 1000], [0, 5, null],
    [10, 10, null], [50, 50, null], [101, 99, null], [5, 5, null], [9, 1000, 1000], [0, 150, 100], [9, 100, 100],
  ])("%i -> %i is %s", (b, a, want) => {
    expect(milestoneHit(b, a)).toBe(want);
  });
});

describe("buildShareLink", () => {
  it("encodes slug, number and ref", () => {
    expect(buildShareLink("https://claimedfirst.com", "ember-vale", 7, "abc123"))
      .toBe("https://claimedfirst.com/c/ember-vale/7?ref=abc123");
    expect(buildShareLink("https://x.test", "a b/c", 7, "ab12")).toBe("https://x.test/c/a%20b%2Fc/7?ref=ab12");
  });
  it("omits ref when there is none", () => {
    expect(buildShareLink("https://x.test", "s", 3, null)).toBe("https://x.test/c/s/3");
  });
  it("rejects non-integer or non-positive numbers", () => {
    expect(() => buildShareLink("https://x.test", "s", 1.5, "r")).toThrow();
    expect(() => buildShareLink("https://x.test", "s", NaN, "r")).toThrow();
    expect(() => buildShareLink("https://x.test", "s", 0, "r")).toThrow();
  });
});

it("formatCount groups thousands", () => {
  expect(formatCount(1000)).toBe("1,000");
});

describe("buildShareLink ref rule", () => {
  it.each(["", "a-b", "a b", "x".repeat(17), "a/b"])("drops invalid ref %j", (r) => {
    expect(buildShareLink("https://x.test", "s", 3, r)).toBe("https://x.test/c/s/3");
  });
  it("keeps a 16 char ref", () => {
    expect(buildShareLink("https://x.test", "s", 3, "A1b2C3d4E5f6G7h8")).toContain("?ref=A1b2C3d4E5f6G7h8");
  });
});

describe("shareVisibility", () => {
  it.each([["public", "public"], ["artist", "artist"], ["anonymous", "anonymous"],
    [null, "anonymous"], [undefined, "anonymous"], ["", "anonymous"], ["weird", "anonymous"]])("%j -> %s", (v, want) => {
    expect(shareVisibility(v)).toBe(want);
  });
});

it("siteHost falls back to claimedfirst.com", () => {
  expect(siteHost(undefined)).toBe("claimedfirst.com");
  expect(siteHost("https://example.test:8080/x")).toBe("example.test:8080");
  expect(siteHost("not a url")).toBe("claimedfirst.com");
});

describe("formatClaimDate", () => {
  it("formats a date and a timestamp in UTC", () => {
    expect(formatClaimDate("2026-10-01")).toBe("Oct 1, 2026");
    expect(formatClaimDate("2026-10-01T23:59:59Z")).toBe("Oct 1, 2026");
    expect(formatClaimDate("2026-12-31T00:00:00+00:00")).toBe("Dec 31, 2026");
  });
  it("is empty for missing or unreadable values", () => {
    expect(formatClaimDate("")).toBe("");
    expect(formatClaimDate(null)).toBe("");
    expect(formatClaimDate("soon")).toBe("");
  });
});
