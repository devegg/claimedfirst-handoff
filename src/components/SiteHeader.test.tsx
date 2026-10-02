import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";

let user: { id: string } | null = null;
let owned: { name: string; slug: string }[] = [];
vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => <a href={href} className={className}>{children}</a> }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    rpc: async () => ({ data: owned }),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { handle: "maya" } }) }) }) }),
  }),
}));
import SiteHeader from "./SiteHeader";

beforeEach(() => { user = null; owned = []; });

test("main nav has the five links and a sign-in link when signed out", async () => {
  const html = renderToStaticMarkup(await SiteHeader());
  for (const h of ["/discover", "/submit", "/roster", "/leaderboard", "/guide", "/login"]) expect(html).toContain(`href="${h}"`);
  expect(html).not.toContain('href="/settings"');
});

test("signed in shows the handle linking to settings", async () => {
  user = { id: "u1" };
  const html = renderToStaticMarkup(await SiteHeader());
  expect(html).toContain('href="/settings"');
  expect(html).toContain("@maya");
  expect(html).not.toContain('href="/login"');
});

test("signed in menu lists Settings and Your roster", async () => {
  user = { id: "u1" };
  const html = renderToStaticMarkup(await SiteHeader());
  expect(html).toContain('href="/roster"');
  expect(html).not.toContain("/manage");
});

test("a verified owner sees their artist page and manage links in the menu", async () => {
  user = { id: "u1" };
  owned = [{ name: "Heart Echoes", slug: "heart" }];
  const html = renderToStaticMarkup(await SiteHeader());
  expect(html).toContain('href="/artist/heart"');
  expect(html).toContain('href="/artist/heart/manage"');
  expect(html).toContain("Heart Echoes");
});

test("the submit link reads Add an artist", async () => {
  const html = renderToStaticMarkup(await SiteHeader());
  expect(html).toContain(">Add an artist</a>");
  expect(html).not.toContain(">Submit</a>");
});

test("signed in menu has a Sign out form button, with the other labels", async () => {
  user = { id: "u1" };
  const html = renderToStaticMarkup(await SiteHeader());
  expect(html).toContain(">Your roster</a>");
  expect(html).toContain(">Settings</a>");
  expect(html).toMatch(/<form[^>]*>.*<button type="submit"[^>]*>Sign out<\/button>.*<\/form>/);
});

test("signed out has no Sign out", async () => {
  expect(renderToStaticMarkup(await SiteHeader())).not.toContain("Sign out");
});
