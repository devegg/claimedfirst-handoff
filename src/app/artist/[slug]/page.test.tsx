/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";

let status = "live";
let owned = false;
let user: { id: string } | null = { id: "u1" };
let frozen = false;
let claimRows: unknown[] = [];
let missing = false;
let statusRow: Record<string, unknown> | null = null;
let slotsUnlocked: number | null = 5;
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); } }));
vi.mock("next/link", () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }));
vi.mock("@/components/ArtistHeader", () => ({ default: () => "HEADER" }));
vi.mock("@/components/ClaimButton", () => ({ default: () => "CLAIMBUTTON" }));
vi.mock("@/components/WatchButton", () => ({ default: () => "WATCHBUTTON" }));
vi.mock("@/components/ReportButton", () => ({ default: () => "REPORTBUTTON" }));
vi.mock("@/components/FoundersBoard", () => ({ default: () => null }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const chain: any = (data: unknown, tableRows: unknown[] = []) => {
      const o: any = { select: () => o, eq: () => o, order: () => o, maybeSingle: async () => ({ data, error: null }), then: (r: any) => r({ data: tableRows, error: null }) };
      return o;
    };
    return {
      auth: { getUser: async () => ({ data: { user } }) },
      rpc: async (fn: string) => ({ data: fn === "public_artist_status" ? (statusRow ? [statusRow] : []) : fn === "my_owned_artist" && owned ? [{ id: "a1" }] : [], error: null }),
      from: (t: string) => chain(t === "artists" && missing ? null : t === "artists" ? { id: "a1", name: "Test Band", slug: "test-band", status, verified_at: null, next_claim_number: 3, claims_frozen: frozen, donation_url: null, record_style: null } : t === "profiles" ? { slots_unlocked: slotsUnlocked } : null, t === "claims" ? claimRows : []),
    };
  },
}));
import ArtistPage from "./page";

const html = async () => renderToStaticMarkup(await ArtistPage({ params: Promise.resolve({ slug: "test-band" }) }));
beforeEach(() => { missing = false; statusRow = null; status = "live"; owned = false; user = { id: "u1" }; frozen = false; claimRows = []; slotsUnlocked = 5; });

test("a live page offers the claim button and no review notice", async () => {
  const out = await html();
  expect(out).toContain("CLAIMBUTTON");
  expect(out).not.toContain("under review");
});
test("a disputed page shows the review notice, no claim button, no watch button (watching needs a live page), and says nothing about who reported", async () => {
  status = "disputed";
  const out = await html();
  expect(out).toContain("This page is under review. New claims are paused.");
  expect(out).not.toContain("CLAIMBUTTON");
  expect(out).not.toContain("WATCHBUTTON");
  expect(out.toLowerCase()).not.toMatch(/reported by/);
});

test("the verified owner sees a Manage link and an Add your songs prompt", async () => {
  owned = true;
  const out = await html();
  expect(out).toContain("Manage this page");
  expect(out).toContain("Add your songs");
});
test("a visitor who is not the owner sees neither", async () => {
  const out = await html();
  expect(out).not.toContain("Manage this page");
  expect(out).not.toContain("Add your songs");
});

const mine = (o: Record<string, unknown> = {}) => ({ artist_id: "a1", claim_number: 9, visibility: "artist", status: "active", dropped_at: null, ...o });

test("signed out sees Sign in to claim, not the claim button", async () => {
  user = null;
  const out = await html();
  expect(out).toContain("Sign in to claim");
  expect(out).toContain('href="/login"');
  expect(out).not.toContain("CLAIMBUTTON");
});
test("a holder sees their real number, their choice and a Roster link, with no claim button", async () => {
  claimRows = [mine()];
  const out = await html();
  expect(out).toContain("You are Claim #9.");
  expect(out).toContain("Artist only");
  expect(out).toContain('href="/roster"');
  expect(out).not.toContain("CLAIMBUTTON");
});
test("an owner who does not hold a claim sees a note and no claim button", async () => {
  owned = true;
  const out = await html();
  expect(out).toContain("Manage this page");
  expect(out).toContain("no Claim button for you");
  expect(out).not.toContain("CLAIMBUTTON");
});
test("a recent drop shows when the viewer can claim again", async () => {
  const dropped = new Date(Date.now() - 5 * 86400000).toISOString();
  claimRows = [mine({ status: "historical", dropped_at: dropped })];
  const out = await html();
  expect(out).toMatch(/You can claim this artist again on [A-Z][a-z]+ \d{1,2}, \d{4}\./);
  expect(out).not.toContain("CLAIMBUTTON");
});
test("a full roster shows a note instead of the claim button", async () => {
  slotsUnlocked = 1;
  claimRows = [mine({ artist_id: "other" })];
  const out = await html();
  expect(out).toContain("Your Roster is full.");
  expect(out).not.toContain("CLAIMBUTTON");
});
test("frozen claims show the frozen note", async () => {
  frozen = true;
  const out = await html();
  expect(out).toContain("New claims are frozen by the artist.");
  expect(out).not.toContain("CLAIMBUTTON");
});

test("a page RLS hides but that is pending shows the pending view, not Not live yet", async () => {
  missing = true;
  statusRow = { name: "Test Band", slug: "test-band", status: "pending", source_url: "https://suno.com/@tb", verified: false, support_points: 2, needed: 3 };
  const out = await html();
  expect(out).toContain("2 of 3 scouts");
  expect(out).toContain("Add my support");
  expect(out).not.toContain("Not live yet");
});

test("an unknown address keeps the friendly not-found text", async () => {
  missing = true;
  const out = await html();
  expect(out).toContain("Not live yet");
});

test("a removed page says the artist removed it", async () => {
  missing = true;
  statusRow = { name: "Test Band", slug: "test-band", status: "delisted", source_url: null, verified: null, support_points: null, needed: null };
  expect(await html()).toContain("The artist removed this page.");
});
