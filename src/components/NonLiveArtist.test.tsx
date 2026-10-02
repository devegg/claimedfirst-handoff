import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
import NonLiveArtist from "./NonLiveArtist";

const base = { name: "Ember Vale", slug: "ember-vale", verified: false, support_points: 1, needed: 3 };

test("pending: name, source link with safe rel and host, progress, Add my support with prefill, disabled claim with reason", () => {
  const html = renderToStaticMarkup(<NonLiveArtist row={{ ...base, status: "pending", source_url: "https://suno.com/@embervale" }} />);
  expect(html).toContain("Ember Vale");
  expect(html).toContain('href="https://suno.com/@embervale"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="nofollow ugc noopener noreferrer"');
  expect(html).toContain(">suno.com</a>");
  expect(html).toContain("1 of 3 scouts");
  expect(html).toContain("Add my support");
  expect(html).toContain('href="/submit?name=Ember+Vale&amp;url=https%3A%2F%2Fsuno.com%2F%40embervale"');
  expect(html).toMatch(/<button[^>]*disabled[^>]*>Claim<\/button>/);
  expect(html).toContain("This page needs 3 scouts before claims open.");
});

test("pending: a non-https source is not rendered as a link", () => {
  const html = renderToStaticMarkup(<NonLiveArtist row={{ ...base, status: "pending", source_url: "javascript:alert(1)" }} />);
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("Source:");
});

test("pending: progress never shows more than the 3 needed", () => {
  const html = renderToStaticMarkup(<NonLiveArtist row={{ ...base, status: "pending", source_url: null, support_points: 4 }} />);
  expect(html).toContain("3 of 3 scouts");
});

test("disputed says under review and offers no claim", () => {
  const html = renderToStaticMarkup(<NonLiveArtist row={{ ...base, status: "disputed", source_url: null, support_points: null, needed: null }} />);
  expect(html).toContain("This page is under review. New claims are paused.");
  expect(html).not.toContain("Claim<");
});

test("delisted says the artist removed it and shows nothing else", () => {
  const html = renderToStaticMarkup(<NonLiveArtist row={{ name: "Ember Vale", slug: "ember-vale", status: "delisted", source_url: null, verified: null, support_points: null, needed: null }} />);
  expect(html).toContain("The artist removed this page.");
  expect(html).not.toContain("Add my support");
});
