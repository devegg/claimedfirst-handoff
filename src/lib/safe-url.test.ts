import { describe, expect, it } from "vitest";
import { isHttpsUrl, linkHost, withClaimedFirstTag } from "./safe-url";

describe("isHttpsUrl", () => {
  it("accepts https", () => expect(isHttpsUrl("https://suno.com/@x")).toBe(true));
  it("rejects javascript:, http:, data:, relative, empty, null", () => {
    for (const u of ["javascript:alert(1)", "http://x.example", "data:text/html,x", "//x.example", "", null, undefined, " https://x.example"])
      expect(isHttpsUrl(u)).toBe(false);
  });
  it("rejects mixed-case scheme (stored URLs are normalized lowercase)", () => {
    expect(isHttpsUrl("HTTPS://x.example")).toBe(false);
  });
});

describe("withClaimedFirstTag", () => {
  it("adds the campaign parameters to a plain link", () => {
    expect(withClaimedFirstTag("https://suno.com/@emberv")).toBe("https://suno.com/@emberv?utm_source=ClaimedFirst&utm_medium=referral");
  });
  it("keeps existing query strings and fragments", () => {
    expect(withClaimedFirstTag("https://suno.com/s/abc?x=1#top")).toBe("https://suno.com/s/abc?x=1&utm_source=ClaimedFirst&utm_medium=referral#top");
  });
  it("never overwrites an existing utm_source", () => {
    expect(withClaimedFirstTag("https://example.com/a?utm_source=other")).toBe("https://example.com/a?utm_source=other");
  });
  it("leaves non-https and invalid values alone", () => {
    expect(withClaimedFirstTag("http://example.com/a")).toBe("http://example.com/a");
    expect(withClaimedFirstTag("not a url")).toBe("not a url");
  });
});

describe("linkHost", () => {
  it("returns the lowercase host without www", () => {
    expect(linkHost("https://suno.com/@emberv")).toBe("suno.com");
    expect(linkHost("https://WWW.Example.COM/a?b=1")).toBe("example.com");
  });
  it("keeps other subdomains and drops ports", () => {
    expect(linkHost("https://music.example.com:8443/x")).toBe("music.example.com");
  });
  it("is not fooled by a lookalike in the path or userinfo", () => {
    expect(linkHost("https://evil.example/suno.com")).toBe("evil.example");
    expect(linkHost("https://suno.com@evil.example/")).toBe("evil.example");
  });
  it("returns null for invalid or empty values", () => {
    expect(linkHost("not a url")).toBeNull();
    expect(linkHost("")).toBeNull();
    expect(linkHost(null)).toBeNull();
    expect(linkHost(undefined)).toBeNull();
  });
});
