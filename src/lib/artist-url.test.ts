import { expect, test } from "vitest";
import { canonicalArtistKey as k } from "./artist-url";

test("suno variants collapse to one key", () => {
  const a = k("https://www.Suno.com/@Embervale/?utm_source=x");
  expect(a.key).toBe("suno:@embervale");
  expect(k("http://suno.com/@embervale").key).toBe(a.key);
  expect(k("suno.com/@embervale/").key).toBe(a.key);
});
test("youtube channel id keeps case, handle does not", () => {
  expect(k("https://www.youtube.com/channel/UCabcDEF123456789ghiJKLm").key).toBe("youtube:channel/UCabcDEF123456789ghiJKLm");
  expect(k("https://youtube.com/@EmberVale").key).toBe("youtube:@embervale");
});
test("unknown sites key on host and path", () => {
  expect(k("https://Example.com/Band/").key).toBe("web:example.com/band");
});
test("rejects garbage", () => {
  expect(() => k("")).toThrow("invalid_artist_url");
  expect(() => k("not a url")).toThrow("invalid_artist_url");
});
test("youtube channel id with query parameter keeps case and strips query", () => {
  expect(k("https://youtube.com/channel/UCabcDEF123456789ghiJKLm?si=x").key).toBe("youtube:channel/UCabcDEF123456789ghiJKLm");
});
test("soundcloud with uppercase host and hash becomes lowercase with web platform", () => {
  expect(k("https://www.SoundCloud.com/Some-Artist/#top").key).toBe("web:soundcloud.com/some-artist");
});

import { slugFromKey, SLUG_RE } from "./artist-url";
test("slug comes from the handle", () => {
  expect(k("https://suno.com/@EmberV").slug).toBe("emberv");
  expect(k("https://youtube.com/@Ember_V").slug).toBe("ember_v");
  expect(k("https://www.youtube.com/channel/UCabcDEF123456789ghiJKLm").slug).toBe("ucabcdef123456789ghijklm");
  expect(k("https://Example.com/Band/").slug).toBe("example-com-band");
  expect(slugFromKey("suno:@a.b")).toBe("a-b");
  expect(slugFromKey("suno:@日本")).toBe("");
  expect(SLUG_RE.test("a")).toBe(false);
  expect(SLUG_RE.test("-ab")).toBe(false);
  expect(SLUG_RE.test("ab")).toBe(true);
});
