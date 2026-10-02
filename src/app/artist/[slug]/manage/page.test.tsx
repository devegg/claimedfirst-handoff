/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";

let failing: string | null = null;
const mine = { id: "a1", name: "Test Band", slug: "test-band", status: "live", claims_frozen: false, donation_url: null };

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); }, redirect: () => { throw new Error("redirect"); } }));
vi.mock("next/link", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/TopSongsEditor", () => ({ default: () => "EDITOR" }));
vi.mock("@/components/VerifyPanel", () => ({ default: () => null }));
vi.mock("@/components/RecordStylePicker", () => ({ default: () => null }));
vi.mock("@/components/DonationEditor", () => ({ default: () => null }));
vi.mock("@/components/AudiencePanel", () => ({ default: () => null }));
vi.mock("@/components/RemovedBanner", () => ({ default: () => null }));
vi.mock("@/components/PageControls", () => ({ default: () => null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const res = (key: string, data: unknown) => (failing === key ? { data: null, error: { message: "boom" } } : { data, error: null });
    return {
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      rpc: async (name: string) => {
        if (name === "my_owned_artist") return res(name, [mine]);
        if (name === "artist_audience") return res(name, []);
        return res(name, [{ total: 0, named: 0 }]);
      },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            order: async () => res(table, [{ title: "Song", url: "https://example.test/s" }]),
            maybeSingle: async () => res(table, { record_style: null }),
          }),
        }),
      }),
    };
  },
}));

import ManagePage from "./page";

async function html() {
  return renderToStaticMarkup(await ManagePage({ params: Promise.resolve({ slug: "test-band" }) }));
}

beforeEach(() => { failing = null; });

test("with every query working the page shows the manage heading", async () => {
  const out = await html();
  expect(out).toContain("Manage Test Band");
  expect(out).toContain("EDITOR");
});
for (const key of ["top_songs", "artist_audience", "artist_watch_counts", "artists"]) {
  test(`a failing ${key} query shows the alert and never an editor`, async () => {
    failing = key;
    const out = await html();
    expect(out).toContain('role="alert"');
    expect(out).toContain("Something went wrong");
    expect(out).not.toContain("Manage Test Band");
    expect(out).not.toContain("EDITOR");
  });
}
