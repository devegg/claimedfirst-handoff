import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
let user: { id: string } | null = null;
let standing: { rank: number; points: number; league: number }[] = [];
let createdAt: string | null = null;
let board: { rank: number; handle: string; points: number; league: number }[] = [];
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    rpc: async (name: string) => ({ data: name === "my_season_standing" ? standing : name === "season_board" ? board : 1 }),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { handle: "maya", created_at: createdAt } }) }) }) }),
  }),
}));
import LeaderboardPage from "./page";

test("defines qualified claimer, bonus and season where scoring is explained", async () => {
  const html = renderToStaticMarkup(await LeaderboardPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("A qualified claimer is a different scout who has claimed that artist and whose account is at least 3 days old.");
  expect(html).toContain("The bonus depends on your claim number");
  expect(html).toContain("A season is one month.");
  expect(html).not.toContain("!");
});

const render = async () => renderToStaticMarkup(await LeaderboardPage({ searchParams: Promise.resolve({}) }));
beforeEach(() => { createdAt = null; user = null; standing = []; board = []; });

test("a zero score shows no standing, only the plain note", async () => {
  user = { id: "u1" }; standing = [{ rank: 1, points: 0, league: 1 }];
  const html = await render();
  expect(html).toContain("No points yet this season. Your standing appears once you have points.");
  expect(html).not.toContain("Your standing: rank");
  expect(html).not.toContain("0 points");
});

test("a signed-in viewer with points outside the top keeps the standing line", async () => {
  user = { id: "u1" }; standing = [{ rank: 120, points: 7, league: 1 }];
  board = [{ rank: 1, handle: "zed", points: 50, league: 1 }];
  const html = await render();
  expect(html).toContain("Your standing: rank 120, 7 total points, 0 at risk");
  expect(html).not.toContain("Your standing appears once");
});

test("signed out visitors see no personal standing note", async () => {
  expect(await render()).not.toContain("Your standing");
});

test("the board shows Total points and At risk columns with InfoTips", async () => {
  board = [{ rank: 1, handle: "zed", points: 12, league: 1, at_risk_points: 4 } as never];
  const html = await render();
  expect(html).toContain("Total points");
  expect(html).toContain("At risk");
  expect(html).toContain('aria-label="12 total points"');
  expect(html).toContain('aria-label="4 at risk"');
  expect(html).toContain("Every claim earns 1 point, so you appear right away. Growth points start when your account is 3 days old.");
  expect(html).toContain("Points from claims under 14 days old. Dropping any claim this season removes its points, so these are the ones most likely to go.");
  expect(html).not.toMatch(/only points (that )?(are )?lost/i);
});

test("a brand-new account is told when growth points start", async () => {
  user = { id: "u1" }; createdAt = new Date(Date.now() - 3600_000).toISOString();
  standing = [{ rank: 1, points: 1, league: 1 }]; board = [{ rank: 1, handle: "maya", points: 1, league: 1 }];
  const html = await render();
  expect(html).toContain("Growth points start in 3 days.");
});

test("an older account sees no growth note", async () => {
  user = { id: "u1" }; createdAt = new Date(Date.now() - 10 * 86400_000).toISOString();
  expect(await render()).not.toContain("Growth points start in");
});
