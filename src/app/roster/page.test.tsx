import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({}) }));
let referral: unknown[] = [];
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    rpc: async () => ({ data: referral }),
    from: () => {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "order", "range", "in"]) b[m] = () => b;
      b.maybeSingle = async () => ({ data: { slots_unlocked: 5, handle: "test_1", referral_code: "x" } });
      b.then = (r: (v: unknown) => unknown) => r({ data: [], count: 2 });
      return b;
    },
  }),
}));
import RosterPage from "./page";

const row = (o: Record<string, unknown>) => ({ handle: null, joined_on: null, status: null, days_left: null, has_claim: null, qualified_count: 1, next_friends: 2, next_slots: 10, ...o });

test("explains that each active artist uses one slot and shows no markers", async () => {
  const html = renderToStaticMarkup(await RosterPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("2 of 5 slots in use");
  expect(html).toContain("Each active artist uses one slot.");
  expect(html).not.toContain("data-marker");
});

test("friends and slots states the next unlock, the ladder, each friend and the invite link", async () => {
  referral = [
    row({ handle: "pal_one", joined_on: "2026-09-20", status: "counted", has_claim: true }),
    row({ handle: "pal_two", joined_on: "2026-10-01", status: "pending", days_left: 2, has_claim: true }),
    row({ handle: "pal_three", joined_on: "2026-09-01", status: "pending", days_left: 0, has_claim: false }),
  ];
  const html = renderToStaticMarkup(await RosterPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("Next step: 2 friends who joined and made a claim open 10 slots.");
  expect(html.match(/Next step/g)).toHaveLength(1);
  expect(html).toContain("Slots update overnight.");
  expect(html).toContain("2 friends, 10 slots; 5 friends, 20 slots; 10 friends, 30 slots; 20 friends, 50 slots");
  expect(html).toContain("Friends counted so far: 1.");
  expect(html).toContain("pal_one</strong>, joined 2026-09-20: counted");
  expect(html).toContain("pending, 2 days left");
  expect(html).toContain("pending, no claim yet");
  expect(html).toContain("A friend counts once their account is 3 days old and they have made a claim.");
  expect(html).toContain("/?ref=x");
});

test("with no friends it says so and still shows the first step", async () => {
  referral = [row({ qualified_count: 0 })];
  const html = renderToStaticMarkup(await RosterPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("No friends have joined with your link yet.");
  expect(html).toContain("Next step: 2 friends who joined and made a claim open 10 slots.");
});

test("at the top of the ladder it says you have all 50 slots", async () => {
  referral = [row({ qualified_count: 20, next_friends: null, next_slots: null })];
  const html = renderToStaticMarkup(await RosterPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("You have all 50 slots.");
});

test("no visible roster copy uses the word unlock", async () => {
  referral = [row({ handle: "pal_one", joined_on: "2026-09-20", status: "pending", days_left: 2, has_claim: true })];
  const html = renderToStaticMarkup(await RosterPage({ searchParams: Promise.resolve({}) }));
  expect(html.replace(/<[^>]*>/g, " ")).not.toMatch(/unlock/i);
});
