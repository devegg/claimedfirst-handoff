import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); }, useRouter: () => ({ refresh: () => {} }) }));
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({
      select: (_c: string, o?: { head?: boolean }) =>
        o?.head ? Promise.resolve({ count: 2, error: null }) : { eq: () => ({ maybeSingle: async () => ({ data: null }) }) },
    }),
  }),
}));
import SettingsPage from "./page";

test("settings ends with a Sign out form", async () => {
  const html = renderToStaticMarkup(await SettingsPage());
  expect(html).toMatch(/<form[^>]*>.*Sign out<\/button><\/form>/);
  expect(html.lastIndexOf("Sign out")).toBeGreaterThan(html.indexOf("Change existing claims and watches"));
});
