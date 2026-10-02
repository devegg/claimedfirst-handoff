import { describe, expect, it } from "vitest";
import {
  artistToolsErrorMessage, validateDonationUrl, validateSongTitle, validateSongUrl, validateSongs,
} from "./song-rules";

const long = (n: number) => "https://example.com/" + "a".repeat(n - "https://example.com/".length);

describe("validateSongUrl", () => {
  const accept = ["https://example.com/a?b=1#c", "https://sub.example.co.uk:8443/x", "https://xn--bcher-kva.example/", "https://example.com"];
  const reject = [
    "https://localhost./x", "https://localhost/x", "https://1.2.3.4/x", "https://a./", "https://exa mple.com",
    "https://example.com/a\tb", "https://example.com/a\nb", "https://-a.com", "https://a-.com", "http://x.com",
    "javascript:alert(1)", "data:text/html,x", "", "https://a", long(501),
  ];
  it.each(accept)("accepts %j", (u) => expect(validateSongUrl(u)).toBeNull());
  it.each(reject)("rejects %j", (u) => expect(validateSongUrl(u)).not.toBeNull());
  it("accepts exactly 500 chars and flags length distinctly", () => {
    expect(validateSongUrl(long(500))).toBeNull();
    expect(validateSongUrl(long(501))).toBe("url_too_long");
    expect(validateSongUrl("")).toBe("url_required");
    expect(validateSongUrl("http://x.com")).toBe("url_invalid");
  });
});

describe("validateDonationUrl", () => {
  it("accepts a good link and treats blank as clearing", () => {
    expect(validateDonationUrl("https://example.com/tip")).toBeNull();
    expect(validateDonationUrl("")).toBeNull();
    expect(validateDonationUrl("   ")).toBeNull();
  });
  it("rejects bad links and a 301 char link, accepts 300", () => {
    expect(validateDonationUrl("http://example.com")).toBe("url_invalid");
    expect(validateDonationUrl("https://localhost/x")).toBe("url_invalid");
    expect(validateDonationUrl(long(300))).toBeNull();
    expect(validateDonationUrl(long(301))).toBe("url_too_long");
  });
});

describe("validateSongTitle", () => {
  it("trims and enforces 1..100", () => {
    expect(validateSongTitle("   ")).toBe("title_required");
    expect(validateSongTitle("a")).toBeNull();
    expect(validateSongTitle("a".repeat(100))).toBeNull();
    expect(validateSongTitle("a".repeat(101))).toBe("title_too_long");
    expect(validateSongTitle(" " + "a".repeat(100) + " ")).toBeNull();
  });
});

describe("validateSongs", () => {
  const ok = (i: number) => ({ title: `Song ${i}`, url: `https://example.com/${i}` });
  it("ignores empty rows and builds the payload in order, trimmed", () => {
    const r = validateSongs([{ title: "", url: "" }, { title: "  A ", url: "https://example.com/a" }, { title: " ", url: " " }, ok(2)]);
    expect(r.ok).toBe(true);
    expect(r.validCount).toBe(2);
    expect(r.rows.map((x) => x.empty)).toEqual([true, false, true, false]);
    expect(r.songs).toEqual([{ title: "A", url: "https://example.com/a" }, { title: "Song 2", url: "https://example.com/2" }]);
  });
  it("reports per-row errors and blocks saving", () => {
    const r = validateSongs([{ title: "", url: "https://example.com/a" }, { title: "B", url: "http://x.com" }, ok(3)]);
    expect(r.ok).toBe(false);
    expect(r.rows[0]).toMatchObject({ titleError: "title_required", urlError: null });
    expect(r.rows[1]).toMatchObject({ titleError: null, urlError: "url_invalid" });
    expect(r.rows[2]).toMatchObject({ titleError: null, urlError: null });
    expect(r.validCount).toBe(1);
    expect(r.errorCount).toBe(2);
  });
  it("accepts 10 rows and rejects 11", () => {
    const ten = Array.from({ length: 10 }, (_, i) => ok(i));
    expect(validateSongs(ten).ok).toBe(true);
    const eleven = validateSongs([...ten, ok(10)]);
    expect(eleven.ok).toBe(false);
    expect(eleven.tooMany).toBe(true);
    expect(eleven.summary).toBe("Add up to 10 songs");
  });
  it("summarises", () => {
    expect(validateSongs([]).summary).toBe("Add up to 10 songs");
    expect(validateSongs([ok(1)]).summary).toBe("1 song ready");
    expect(validateSongs([ok(1), ok(2)]).summary).toBe("2 songs ready");
    expect(validateSongs([{ title: "", url: "x" }]).summary).toBe("1 song needs a fix");
  });
});

describe("artistToolsErrorMessage", () => {
  it("explains the report rate limit", () => {
    expect(artistToolsErrorMessage("account_too_new")).toBe("Reports open when your account is 3 days old.");
    expect(artistToolsErrorMessage("ERROR: rate_limited")).toBe("You are reporting quickly. Please try again later.");
  });
  it("explains the daily report limit in plain words", () => {
    const m = artistToolsErrorMessage("ERROR: report_limit_reached");
    expect(m).toBe("You have reached the limit of 5 reports in a day. Please try again tomorrow.");
    expect(m).not.toContain("!");
  });
  it("maps every code", () => {
    for (const code of ["not_owner", "too_many_songs", "invalid_songs", "invalid_song", "invalid_song_url", "invalid_donation_url", "invalid_reason", "artist_not_found", "not_authenticated"]) {
      const m = artistToolsErrorMessage(`ERROR: ${code}`);
      expect(m).not.toBe("Something went wrong. Try again.");
      expect(m).not.toContain("!");
    }
  });
  it("picks invalid_song_url over invalid_song", () => {
    expect(artistToolsErrorMessage("invalid_song_url")).toMatch(/link/i);
  });
  it("handles unknown and null", () => {
    expect(artistToolsErrorMessage("boom")).toBe("Something went wrong. Try again.");
    expect(artistToolsErrorMessage(null)).toBe("Something went wrong. Try again.");
    expect(artistToolsErrorMessage(undefined)).toBe("Something went wrong. Try again.");
  });
});
