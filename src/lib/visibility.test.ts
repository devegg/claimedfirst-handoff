import { describe, expect, it } from "vitest";
import { claimVisibilityOrAnonymous } from "./visibility";
import {
  CLAIM_OPTIONS, WATCH_OPTIONS, claimLevelLabel, parseDefaults, watchLevelLabel, watchLevelFromNamed,
} from "./visibility";

describe("visibility options", () => {
  it("has the exact claim labels and descriptions", () => {
    expect(CLAIM_OPTIONS.map((o) => [o.value, o.label, o.description])).toEqual([
      ["public", "Show my name", "The artist, the Founders board and your profile show your handle."],
      ["artist", "Artist only", 'The artist sees you are a fan. Everyone else sees "Anonymous scout."'],
      ["anonymous", "Anonymous", "Nobody sees your name, not even the artist."],
    ]);
  });
  it("has the exact watch labels", () => {
    expect(WATCH_OPTIONS.map((o) => [o.value, o.label])).toEqual([
      ["named", "Name visible to the artist"],
      ["anonymous", "Anonymous"],
    ]);
  });
  it("labels levels", () => {
    expect(claimLevelLabel("artist")).toBe("Artist only");
    expect(watchLevelLabel("named")).toBe("Name visible to the artist");
    expect(watchLevelFromNamed(true)).toBe("named");
    expect(watchLevelFromNamed(false)).toBe("anonymous");
    expect(watchLevelFromNamed(null)).toBe("anonymous");
  });
  it("parses defaults with safe fallbacks", () => {
    expect(parseDefaults({ default_claim_visibility: "anonymous", default_watch_named: true }))
      .toEqual({ claim: "anonymous", watch: "named" });
    expect(parseDefaults(null)).toEqual({ claim: "public", watch: "anonymous" });
    expect(parseDefaults({ default_claim_visibility: "weird", default_watch_named: null }))
      .toEqual({ claim: "public", watch: "anonymous" });
  });
});

describe("claimVisibilityOrAnonymous", () => {
  it("keeps known levels", () => {
    for (const v of ["public", "artist", "anonymous"]) expect(claimVisibilityOrAnonymous(v)).toBe(v);
  });
  it("never shows an unknown level as public", () => {
    for (const v of ["weird", null, undefined, 3]) expect(claimVisibilityOrAnonymous(v)).toBe("anonymous");
  });
});
