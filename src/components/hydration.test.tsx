// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act } from "react";
import { afterEach, expect, test, vi } from "vitest";
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    rpc: async (name: string) => ({ data: name === "my_season_standing" ? [{ rank: 120, points: 7, league: 1, at_risk_points: 2 }] : name === "season_board" ? [{ rank: 1, handle: "zed", points: 50, league: 1, at_risk_points: 3 }] : 1 }),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { handle: "maya", created_at: new Date().toISOString() } }) }) }) }),
  }),
}));
import LeaderboardPage from "@/app/leaderboard/page";
import FoundersBoard from "./FoundersBoard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });

// Server-render, then hydrate: invalid nesting (for example details inside p) shows up as a console error.
async function hydrateClean(el: React.ReactElement) {
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  const errors: string[] = [];
  const onErr = (e: ErrorEvent) => { errors.push(e.message); e.preventDefault(); };
  window.addEventListener("error", onErr);
  const box = document.createElement("div");
  box.innerHTML = renderToString(el);
  document.body.appendChild(box);
  await act(async () => { hydrateRoot(box, el); });
  window.removeEventListener("error", onErr);
  expect(errors).toEqual([]);
  expect(err.mock.calls.map((c) => String(c[0]))).toEqual([]);
}

test("the leaderboard, with its standing and growth notices and InfoTips, hydrates with no errors", async () => {
  await hydrateClean(await LeaderboardPage({ searchParams: Promise.resolve({}) }));
});

test("the Founders board with provisional rows hydrates with no errors", async () => {
  await hydrateClean(<FoundersBoard rows={[{ claim_number: 1, handle: "a_b", status: "active", claimed_at: "2026-10-01T00:00:00Z", provisional: true, held_days: 1 }]} />);
});
