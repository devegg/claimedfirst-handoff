/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test } from "vitest";
import { verifyArtistPage, getVerificationCode, getVerificationCodeInfo } from "./verify-artist";

type Row = Record<string, any>;
// Mutable "now" for the fake database timestamps; tests move it to age a code.
const clock = { now: Date.now() };
type Call = { name: string; args: Row };
function fakeAdmin(tables: Record<string, Row[]>, opts: { rpcError?: boolean; calls?: Call[] } = {}) {
  const from = (name: string) => {
    const rows = (tables[name] ??= []);
    const filters: [string, unknown][] = [];
    let mode: "select" | "update" = "select";
    let patch: Row = {};
    let order: string | null = null;
    const match = () => rows.filter((r) => filters.every(([k, v]) => r[k] === v));
    const q: any = {
      select: () => q,
      eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
      order: (k: string) => { order = k; return q; },
      limit: () => q,
      update: (p: Row) => { mode = "update"; patch = p; return q; },
      insert: async (r: Row) => { rows.push({ ...r, checked_at: new Date(clock.now + rows.length).toISOString() }); return { error: null }; },
      maybeSingle: async () => ({ data: match()[0] ?? null, error: null }),
      then: (res: any, rej: any) => {
        let out: Row[];
        if (mode === "update") { match().forEach((r) => Object.assign(r, patch)); out = []; }
        else { out = match(); if (order) out = [...out].sort((a, b) => String(b[order!]).localeCompare(String(a[order!]))); }
        return Promise.resolve({ data: out, error: null }).then(res, rej);
      },
    };
    return q;
  };
  const rpc = async (name: string, args: Row) => {
    opts.calls?.push({ name, args });
    if (opts.rpcError) return { data: null, error: { message: "boom" } };
    // mirrors verify_artist_with_code: records the success, then all three effects together
    tables.verification_attempts.push({ artist_id: args.p_artist, user_id: args.p_user, code: args.p_code, url: args.p_url, result: "found", checked_at: new Date(clock.now + 999999).toISOString() });
    const a = tables.artists.find((r) => r.id === args.p_artist)!;
    a.verified_at = "now";
    if (["pending", "disputed", "live"].includes(a.status)) a.status = "live";
    const o = tables.artist_owners.find((r) => r.artist_id === args.p_artist);
    if (o) o.owner_id = args.p_user; else tables.artist_owners.push({ artist_id: args.p_artist, owner_id: args.p_user });
    return { data: null, error: null };
  };
  return { from, rpc } as any;
}

const setup = () => {
  clock.now = Date.now();
  const tables = {
    artists: [{ id: "a1", status: "pending", verified_at: null }, { id: "a2", status: "pending", verified_at: null }],
    artist_links: [
      { id: "l1", artist_id: "a1", url: "https://suno.com/@one" },
      { id: "l2", artist_id: "a2", url: "https://suno.com/@two" },
    ],
    verification_attempts: [] as Row[],
    artist_owners: [] as Row[],
  };
  return { tables, admin: fakeAdmin(tables) };
};
const pub = async () => [{ address: "93.184.216.34", family: 4 }];
const mk = (body: string, seen?: string[]) => (async (u: string) => { seen?.push(String(u)); return new Response(body); }) as unknown as typeof fetch;
const rand = () => 0;

test("link belonging to another artist is rejected and nothing fetched", async () => {
  const { admin, tables } = setup();
  const seen: string[] = [];
  const r = await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l2", fetchImpl: mk("x", seen), resolveHost: pub, rand });
  expect(r).toMatchObject({ ok: false, reason: "link_not_found" });
  expect(seen).toEqual([]);
  expect(tables.artists[0].verified_at).toBeNull();
});

test("not_found leaves verified_at null and records attempt", async () => {
  const { admin, tables } = setup();
  const r = await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk("nothing"), resolveHost: pub, rand });
  expect(r.reason).toBe("not_found");
  expect(tables.artists[0]).toMatchObject({ verified_at: null, status: "pending" });
  expect(tables.verification_attempts.some((a) => a.result === "not_found" && a.url === "https://suno.com/@one")).toBe(true);
});

test("found sets verified_at and live status", async () => {
  const { admin, tables } = setup();
  const code = "cf-AAAAAA"; // rand()=0 -> all first letters
  const r = await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk(`bio ${code}`), resolveHost: pub, rand });
  expect(r).toEqual({ ok: true, reason: "found" });
  expect(tables.artists[0].verified_at).toBeTruthy();
  expect(tables.artists[0].status).toBe("live");
  expect(tables.artists[1].verified_at).toBeNull();
  expect(tables.artists[0]).not.toHaveProperty("owner_id");
});

test("code is stable across calls", async () => {
  const { admin, tables } = setup();
  let n = 0;
  const r2 = (m: number) => (n++ % m);
  await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk("no"), resolveHost: pub, rand: r2 });
  await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk("no"), resolveHost: pub, rand: r2 });
  expect(new Set(tables.verification_attempts.map((a) => a.code)).size).toBe(1);
});

test("request-supplied URL is ignored; stored url is fetched", async () => {
  const { admin } = setup();
  const seen: string[] = [];
  await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", url: "https://evil.example/x", fetchImpl: mk("no", seen), resolveHost: pub, rand } as any);
  expect(seen).toEqual(["https://suno.com/@one"]);
});

const seqRand = () => { let n = 0; return (m: number) => (n++ * 7) % m; };

test("two users for one artist get different codes; stable per user", async () => {
  const { admin } = setup();
  const r = seqRand();
  const a1 = await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r });
  const b1 = await getVerificationCode({ admin, artistId: "a1", userId: "uB", rand: r });
  const a2 = await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r });
  const b2 = await getVerificationCode({ admin, artistId: "a1", userId: "uB", rand: r });
  expect(a1).not.toBe(b1);
  expect(a2).toBe(a1);
  expect(b2).toBe(b1);
});

test("user B cannot verify with user A's code; user A can", async () => {
  const { admin, tables } = setup();
  const r = seqRand();
  const codeA = await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r });
  const fetchImpl = mk(`my bio ${codeA}`);
  const rb = await verifyArtistPage({ admin, artistId: "a1", userId: "uB", linkId: "l1", fetchImpl, resolveHost: pub, rand: r });
  expect(rb.reason).toBe("not_found");
  expect(tables.artists[0].verified_at).toBeNull();
  const ra = await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl, resolveHost: pub, rand: r });
  expect(ra).toEqual({ ok: true, reason: "found" });
  expect(tables.artists[0].verified_at).toBeTruthy();
});

test("success calls the RPC once with the right args and nothing else writes", async () => {
  const calls: Call[] = [];
  const tables = setup().tables;
  const admin = fakeAdmin(tables, { calls });
  const r = await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk("bio cf-AAAAAA"), resolveHost: pub, rand });
  expect(r).toEqual({ ok: true, reason: "found" });
  expect(calls).toEqual([{ name: "verify_artist_with_code", args: { p_artist: "a1", p_user: "uA", p_code: "cf-AAAAAA", p_url: "https://suno.com/@one" } }]);
  expect(tables.artists[0]).toMatchObject({ verified_at: "now", status: "live" });
  expect(tables.artist_owners).toEqual([{ artist_id: "a1", owner_id: "uA" }]);
});

test("RPC error returns server_error and changes nothing", async () => {
  const tables = setup().tables;
  const admin = fakeAdmin(tables, { rpcError: true });
  const r = await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk("bio cf-AAAAAA"), resolveHost: pub, rand });
  expect(r).toEqual({ ok: false, reason: "server_error" });
  expect(tables.artist_owners).toEqual([]);
  expect(tables.artists[0]).toMatchObject({ verified_at: null, status: "pending" });
});

test("a failed check never calls the RPC", async () => {
  const calls: Call[] = [];
  const tables = setup().tables;
  const admin = fakeAdmin(tables, { calls });
  await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk("nothing"), resolveHost: pub, rand });
  expect(calls).toEqual([]);
  expect(tables.artist_owners).toEqual([]);
});

test("a second user who passes the check replaces the owner", async () => {
  const tables = setup().tables;
  const admin = fakeAdmin(tables);
  const r = seqRand();
  const codeA = await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r });
  const codeB = await getVerificationCode({ admin, artistId: "a1", userId: "uB", rand: r });
  await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk(codeA!), resolveHost: pub, rand: r });
  expect(tables.artist_owners[0].owner_id).toBe("uA");
  await verifyArtistPage({ admin, artistId: "a1", userId: "uB", linkId: "l1", fetchImpl: mk(codeB!), resolveHost: pub, rand: r });
  expect(tables.artist_owners).toHaveLength(1);
  expect(tables.artist_owners[0].owner_id).toBe("uB");
});

const HOUR = 3600 * 1000;

test("a code older than 24 hours is refused before any fetch, and a new code is issued on the next read", async () => {
  const { admin, tables } = setup();
  const r = seqRand();
  const old = await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r });
  // age the code: its first row was made 25 hours ago, a later failed check 1 hour ago
  tables.verification_attempts[0].checked_at = new Date(Date.now() - 25 * HOUR).toISOString();
  tables.verification_attempts.push({ artist_id: "a1", user_id: "uA", code: old, result: "not_found", checked_at: new Date(Date.now() - HOUR).toISOString() });
  const seen: string[] = [];
  const res = await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk(`bio ${old}`, seen), resolveHost: pub, rand: r });
  expect(res).toEqual({ ok: false, reason: "code_expired" });
  expect(seen).toEqual([]);
  expect(tables.artists[0].verified_at).toBeNull();
  const fresh = await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r });
  expect(fresh).not.toBe(old);
  // the new code is stable and verifies
  expect(await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r })).toBe(fresh);
  const ok = await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk(`bio ${fresh}`), resolveHost: pub, rand: r });
  expect(ok).toEqual({ ok: true, reason: "found" });
});

test("a code just inside 24 hours still works", async () => {
  const { admin, tables } = setup();
  const r = seqRand();
  const code = await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r });
  tables.verification_attempts[0].checked_at = new Date(Date.now() - 23 * HOUR).toISOString();
  expect(await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk(code!), resolveHost: pub, rand: r }))
    .toEqual({ ok: true, reason: "found" });
});

test("a code that already verified cannot verify again; the next read is a new code", async () => {
  const { admin, tables } = setup();
  const r = seqRand();
  const code = await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r });
  await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk(code!), resolveHost: pub, rand: r });
  expect(tables.verification_attempts.filter((a) => a.code === code && a.result === "found")).toHaveLength(1);
  const seen: string[] = [];
  const again = await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk(code!, seen), resolveHost: pub, rand: r });
  expect(again).toEqual({ ok: false, reason: "code_used" });
  expect(seen).toEqual([]);
  expect(await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r })).not.toBe(code);
});

test("when the database refuses a stale or used code at the last step, the reason is passed on", async () => {
  for (const reason of ["code_expired", "code_used"]) {
    const tables = setup().tables;
    const base = fakeAdmin(tables);
    const admin = { from: base.from, rpc: async () => ({ data: null, error: { message: `P0001: ${reason}` } }) } as any;
    const r = await verifyArtistPage({ admin, artistId: "a1", userId: "uA", linkId: "l1", fetchImpl: mk("bio cf-AAAAAA"), resolveHost: pub, rand });
    expect(r).toEqual({ ok: false, reason });
    expect(tables.artists[0].verified_at).toBeNull();
  }
});

test("getVerificationCodeInfo gives the issue time and an expiry exactly 24 hours later, stable on the next read", async () => {
  const admin = fakeAdmin({ verification_attempts: [], artists: [] });
  const r = () => 0.5;
  const first = await getVerificationCodeInfo({ admin, artistId: "a1", userId: "uA", rand: r });
  expect(first).not.toBeNull();
  expect(Date.parse(first!.expiresAt!) - Date.parse(first!.issuedAt!)).toBe(24 * 60 * 60 * 1000);
  const again = await getVerificationCodeInfo({ admin, artistId: "a1", userId: "uA", rand: r });
  expect(again!.code).toBe(first!.code);
  expect(Math.abs(Date.parse(again!.issuedAt!) - clock.now)).toBeLessThan(5000);
});

test("expiry is measured from the code's earliest row (as the database does), not from later attempts", async () => {
  const { admin, tables } = setup();
  const r = seqRand();
  const code = await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r });
  const issued = Date.now() - 5 * HOUR;
  tables.verification_attempts[0].checked_at = new Date(issued).toISOString();
  tables.verification_attempts.push({ artist_id: "a1", user_id: "uA", code, result: "not_found", checked_at: new Date(Date.now() - HOUR).toISOString() });
  const info = await getVerificationCodeInfo({ admin, artistId: "a1", userId: "uA", rand: r });
  expect(info).toEqual({ code, issuedAt: new Date(issued).toISOString(), expiresAt: new Date(issued + 24 * HOUR).toISOString() });
});
test("an unreadable issue time gives null times, never the current time", async () => {
  const { admin, tables } = setup();
  const r = seqRand();
  await getVerificationCode({ admin, artistId: "a1", userId: "uA", rand: r });
  tables.verification_attempts[0].checked_at = "garbage";
  const info = await getVerificationCodeInfo({ admin, artistId: "a1", userId: "uA", rand: r });
  expect(info).toMatchObject({ issuedAt: null, expiresAt: null });
});
