import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
import ArtistHeader from "./ArtistHeader";

const base = { name: "Heart Echoes", slug: "heart", next_claim_number: 1, record_style: null };

test("an unverified page invites the artist to verify it", () => {
  const html = renderToStaticMarkup(<ArtistHeader artist={{ ...base, verified_at: null }} sourceUrl={null} />);
  expect(html).toContain("Are you this artist?");
  expect(html).toContain('href="/artist/heart/manage"');
});

test("a verified page does not show the prompt", () => {
  const html = renderToStaticMarkup(<ArtistHeader artist={{ ...base, verified_at: "2026-10-01T00:00:00Z" }} sourceUrl={null} />);
  expect(html).not.toContain("Are you this artist?");
});

test("the source link shows its destination host beside the link text", () => {
  const html = renderToStaticMarkup(<ArtistHeader artist={{ ...base, verified_at: null }} sourceUrl="https://www.Suno.com/@heart" />);
  expect(html).toContain("Source link</a>");
  expect(html).toContain("(suno.com)");
});
