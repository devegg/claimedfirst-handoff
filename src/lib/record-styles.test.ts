import { expect, test } from "vitest";
import { RECORD_STYLES, isRecordStyle, defaultStyleFor, resolveRecordStyle } from "./record-styles";

test("six known styles", () => {
  expect(RECORD_STYLES).toEqual(["classic", "ember", "tide", "paper", "night", "dusk"]);
  expect(isRecordStyle("ember")).toBe(true);
  expect(isRecordStyle("porn.jpg")).toBe(false);
});
test("default is deterministic and always valid", () => {
  expect(defaultStyleFor("ember-vale-3f2a")).toBe(defaultStyleFor("ember-vale-3f2a"));
  for (let i = 0; i < 500; i++) expect(isRecordStyle(defaultStyleFor(`artist-${i}`))).toBe(true);
});
test("defaults spread across all styles", () => {
  const seen = new Set(Array.from({ length: 300 }, (_, i) => defaultStyleFor(`slug-${i}`)));
  expect(seen.size).toBe(6);
});
test("empty slug still returns a valid style", () => {
  expect(isRecordStyle(defaultStyleFor(""))).toBe(true);
});
test("resolveRecordStyle uses the stored style when valid, else the slug default", () => {
  expect(resolveRecordStyle("tide", "x")).toBe("tide");
  for (const bad of [null, undefined, "custom.png", ""]) {
    expect(resolveRecordStyle(bad, "ember-vale")).toBe(defaultStyleFor("ember-vale"));
  }
});
