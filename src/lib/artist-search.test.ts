import { expect, test } from "vitest";
import { escapeLike, foldText, orFilter, parseSearch } from "./artist-search";

test("empty, short and long input", () => {
  expect(parseSearch(undefined).kind).toBe("none");
  expect(parseSearch("   ").kind).toBe("none");
  expect(parseSearch("a").kind).toBe("short");
  const long = parseSearch("x".repeat(200));
  expect(long.kind === "text" && long.q.length).toBe(80);
});
test("text search keeps the typed form and an accent-stripped form", () => {
  const s = parseSearch("  Émber   Vale ");
  expect(s).toMatchObject({ kind: "text", q: "Émber Vale" });
  expect(s.kind === "text" && s.terms).toEqual(["Émber Vale", "ember vale"]);
  expect(foldText("Ghëtto")).toBe("ghetto");
});
test("% and _ are escaped, quotes and backslashes removed", () => {
  expect(escapeLike("50%_x")).toBe("50\\\\%\\\\_x");
  expect(escapeLike('a"b\\c')).toBe("abc");
  expect(orFilter(["a\\\\%"])).toBe('name.ilike."%a\\\\%%",slug.ilike."%a\\\\%%"');
});
test("a leading @ is dropped for handle searches", () => {
  const s = parseSearch("@ember_vale");
  expect(s.kind === "text" && s.terms[0]).toBe("ember\\\\_vale");
});
test("pasted profile links resolve to a canonical key", () => {
  expect(parseSearch("https://www.suno.com/@Ember/")).toMatchObject({ kind: "link", key: "suno:@ember" });
  expect(parseSearch("youtube.com/@EmberVale")).toMatchObject({ kind: "link", key: "youtube:@embervale" });
});
test("a name with a dot but no path is text", () => {
  expect(parseSearch("Dr. Dre").kind).toBe("text");
});
