/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); } }));
vi.mock("next/link", () => ({ default: ({ children }: any) => children }));
let row: Record<string, unknown> = { handle: "test_1", claim_number: 3, artist_name: "Test Band", status: "active", claimed_on: "2026-10-01" };
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: async () => ({ data: [row], error: null }) }),
}));
import ClaimLinkPage, { generateMetadata } from "./page";

const params = { params: Promise.resolve({ artistSlug: "test-band", number: "3" }) };

test("claim pages are not indexed", async () => {
  const m = await generateMetadata(params);
  expect(m.robots).toEqual({ index: false, follow: false });
});

test("shows the claim date and Active from server state", async () => {
  const html = renderToStaticMarkup(await ClaimLinkPage(params));
  expect(html).toContain("Claimed Oct 1, 2026.");
  expect(html).toMatch(/data-testid="claim-status">Active</);
  expect(html).toContain("test_1 was #3 on Test Band.");
});

test("a dropped claim says Historical and keeps its number and date", async () => {
  row = { ...row, status: "historical" };
  const html = renderToStaticMarkup(await ClaimLinkPage(params));
  expect(html).toMatch(/data-testid="claim-status">Historical</);
  expect(html).not.toMatch(/>Active</);
  expect(html).toContain("Claimed Oct 1, 2026.");
  expect(html).toContain("#3");
});

test("without a readable date the page still shows the status and no broken date", async () => {
  row = { ...row, status: "active", claimed_on: null };
  const html = renderToStaticMarkup(await ClaimLinkPage(params));
  expect(html).not.toContain("Claimed ");
  expect(html).toMatch(/>Active</);
  expect(html).not.toContain("!");
});
