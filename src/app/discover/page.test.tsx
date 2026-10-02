import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));

let signedIn = false;
let total = 0; let rows: unknown[] = []; let pending: unknown[] = [];
const calls: { order: [string, unknown][]; range?: [number, number]; or: string[]; inIds: string[][]; links: string[]; filters: string[] } = { order: [], or: [], inIds: [], links: [], filters: [] };
let linkRows: unknown[] = [];
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (t: string) => {
      const b: Record<string, unknown> = {};
      const head: Record<string, unknown> = {
        or: (f: string) => { calls.or.push(f); return head; },
        not: (c: string, op: string) => { calls.filters.push(`not ${c} ${op}`); return head; },
        is: (c: string) => { calls.filters.push(`is ${c}`); return head; },
        in: (_c: string, ids: string[]) => { calls.inIds.push(ids); return head; },
        then: (r: (v: unknown) => unknown) => r({ count: total }),
      };
      b.select = (_c: string, o?: { head?: boolean }) => (o?.head ? { eq: () => head } : b);
      b.or = (f: string) => { calls.or.push(f); return b; };
      b.not = (c: string, op: string) => { calls.filters.push(`not ${c} ${op}`); return b; };
      b.is = (c: string) => { calls.filters.push(`is ${c}`); return b; };
      b.in = (_c: string, ids: string[]) => { calls.inIds.push(ids); return b; };
      b.eq = (c: string, v: string) => { if (t === "artist_links") { calls.links.push(v); return Promise.resolve({ data: linkRows }); } void c; return b; };
      b.order = (c: string, o: unknown) => { calls.order.push([c, o]); return b; };
      b.range = async (a: number, z: number) => { calls.range = [a, z]; return { data: rows }; };
      return b;
    },
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: "u1" } : null } }) },
    rpc: async () => ({ data: pending }),
  }),
}));

import DiscoverPage from "./page";
const art = (n: number, v = false) => ({ id: `i${n}`, name: `Artist ${n}`, slug: `a-${n}`, verified_at: v ? "2026-01-01" : null, next_claim_number: n + 1, record_style: null });
const render = async (sp: Record<string, string> = {}) => renderToStaticMarkup(await DiscoverPage({ searchParams: Promise.resolve(sp) }));

beforeEach(() => { signedIn = false; total = 0; rows = []; pending = []; calls.order = []; calls.range = undefined; calls.or = []; calls.inIds = []; calls.links = []; calls.filters = []; linkRows = []; });

test("empty state links to submit", async () => {
  const html = await render();
  expect(html).toContain("No artists are live yet");
  expect(html).toContain('href="/submit"');
});

test("cards show label, counts and link to the artist page", async () => {
  total = 2; rows = [art(3, true), art(0)];
  const html = await render();
  expect(html).toContain('href="/artist/a-3"');
  expect(html).toContain("Verified");
  expect(html).toContain("Fan-created page");
  expect(html).toContain("Claimed by 3. Be #4.");
  expect(html).toContain("No claims yet. Be #1.");
});

test("pages by 10 and clamps an out-of-range page", async () => {
  total = 25; rows = [art(1)];
  let html = await render({ page: "2" });
  expect(calls.range).toEqual([10, 19]);
  expect(html).toContain("Page 2 of 3");
  expect(html).toContain('href="/discover?page=3"');
  html = await render({ page: "99" });
  expect(calls.range).toEqual([20, 29]);
});

test("most claimed sorts by claim number first and keeps sort in links", async () => {
  total = 25; rows = [art(1)];
  const html = await render({ sort: "claimed" });
  expect(calls.order[0][0]).toBe("next_claim_number");
  expect(html).toContain('href="/discover?sort=claimed&amp;page=2"');
  calls.order = [];
  await render();
  expect(calls.order[0][0]).toBe("created_at");
});

test("pending artists show scout progress", async () => {
  total = 1; rows = [art(1)]; pending = [{ id: "p1", name: "Maybe Band", slug: "maybe-band", scouts_submitted: 2, needed: 3 }];
  const html = await render();
  expect(html).toContain("Maybe Band");
  expect(html).toContain("2 of 3 scouts");
  expect(html).toContain('href="/artist/maybe-band"');
  expect(html).toContain("Add my support");
});

test("filter pills: default All is current, links keep q, sort and drop the default show", async () => {
  total = 1; rows = [art(1)];
  const html = await render({ q: "Ember", sort: "claimed" });
  expect(html).toMatch(/<span aria-current="true">All<\/span>/);
  expect(html).toContain('href="/discover?q=Ember&amp;show=verified&amp;sort=claimed"');
  expect(html).toContain('href="/discover?q=Ember&amp;show=needs&amp;sort=claimed"');
  expect(html).toContain('name="q"');
});

test("Verified and Fan-created filter the live list, and the active pill is marked", async () => {
  total = 1; rows = [art(1, true)];
  let html = await render({ show: "verified" });
  expect(calls.filters).toContain("not verified_at is");
  expect(html).toMatch(/<span aria-current="true">Verified<\/span>/);
  expect(html).toContain('name="show" value="verified"');
  calls.filters = [];
  html = await render({ show: "fan" });
  expect(calls.filters).toContain("is verified_at");
  expect(html).toMatch(/<span aria-current="true">Fan-created<\/span>/);
  expect(html).not.toContain("Needs scouts</h2>");
});

test("Needs scouts lists only pending cards that link to their pending page", async () => {
  total = 5; rows = [art(1)];
  pending = [{ id: "p1", name: "Maybe Band", slug: "maybe-band", scouts_submitted: 1, needed: 3 }];
  const html = await render({ show: "needs" });
  expect(html).toMatch(/<span aria-current="true">Needs scouts<\/span>/);
  expect(html).toContain('href="/artist/maybe-band"');
  expect(html).toContain("1 of 3 scouts");
  expect(html).not.toContain("Artist 1");
  expect(html).not.toContain("Live artists");
});

test("Needs scouts with nothing pending says so", async () => {
  const html = await render({ show: "needs" });
  expect(html).toContain("No pages need scouts right now.");
});

test("a bad show value falls back to All", async () => {
  total = 1; rows = [art(1)];
  const html = await render({ show: "bogus" });
  expect(html).toMatch(/<span aria-current="true">All<\/span>/);
});

test("only unverified cards say fans can claim before the artist verifies", async () => {
  total = 2; rows = [art(3, true), art(0)];
  const html = await render();
  expect(html.match(/Fans can claim this page before the artist verifies it\./g)).toHaveLength(1);
});

test("signed-in scouts get a small Report control on pending cards, and only there", async () => {
  signedIn = true; total = 1; rows = [art(1)];
  pending = [{ id: "p1", name: "Pending Band", slug: "pending-band", scouts_submitted: 2, needed: 3 }];
  const html = await render();
  expect(html).toContain('aria-label="Report Pending Band"');
  expect(html.match(/>Report</g)).toHaveLength(1);
  expect(html).not.toContain("Report this page");
});

test("anonymous visitors do not see the Report control", async () => {
  signedIn = false; total = 1; rows = [art(1)];
  pending = [{ id: "p1", name: "Pending Band", slug: "pending-band", scouts_submitted: 2, needed: 3 }];
  const html = await render();
  expect(html).toContain("Pending Band");
  expect(html).not.toMatch(/Report/);
});


test("the search box is a GET form with id search, first on the page", async () => {
  total = 1; rows = [art(1)];
  const html = await render();
  expect(html).toMatch(/<form[^>]*action="\/discover"/);
  expect(html).toMatch(/<form[^>]*method="get"/);
  expect(html).toMatch(/<form[^>]*id="search"/);
  expect(html).toContain('name="q"');
  expect(html.indexOf('id="search"')).toBeLessThan(html.indexOf("Live artists"));
});

test("a name search filters on name and slug, shows Results for Q, and keeps q and sort in links", async () => {
  total = 25; rows = [art(1)];
  const html = await render({ q: "Ember 50%", sort: "claimed" });
  expect(calls.or[0]).toContain('name.ilike."%Ember 50\\\\%%"');
  expect(calls.or[0]).toContain('slug.ilike.');
  expect(html).toContain("Results for Ember 50%");
  expect(html).toContain('href="/discover?q=Ember+50%25&amp;sort=claimed&amp;page=2"');
  expect(html).toContain('name="sort" value="claimed"');
  expect(html).not.toContain("Needs scouts</h2>");
});

test("a pasted profile link resolves through its canonical key", async () => {
  linkRows = [{ artist_id: "i7" }]; total = 1; rows = [art(7)];
  const html = await render({ q: "https://suno.com/@Ember/" });
  expect(calls.links).toEqual(["suno:@ember"]);
  expect(calls.inIds[0]).toEqual(["i7"]);
  expect(html).toContain('href="/artist/a-7"');
});

test("no match shows the message and an Add an artist link that keeps the query", async () => {
  total = 0; rows = [];
  const html = await render({ q: "Ghost Band" });
  expect(html).toContain("No artist found for Ghost Band.");
  expect(html).toContain('href="/submit?name=Ghost%20Band"');
  expect(html).not.toContain("!");
});

test("a link that matches nothing shows no result, not the whole list", async () => {
  total = 0; rows = [];
  const html = await render({ q: "https://suno.com/@nobody" });
  expect(calls.inIds[0]).toEqual(["00000000-0000-0000-0000-000000000000"]);
  expect(html).toContain("No artist found for https://suno.com/@nobody.");
});

test("one character asks for two and still browses", async () => {
  total = 1; rows = [art(1)];
  const html = await render({ q: "a" });
  expect(html).toContain("Type at least 2 characters");
  expect(calls.or).toEqual([]);
  expect(html).toContain("Live artists");
});

test("anonymous visitors can search", async () => {
  signedIn = false; total = 1; rows = [art(2)];
  expect(await render({ q: "artist" })).toContain("Results for artist");
});
