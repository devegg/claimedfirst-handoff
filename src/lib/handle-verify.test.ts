/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test } from "vitest";
import { handleVerify } from "./handle-verify";

const A1 = "11111111-1111-4111-8111-111111111111";
const okRpc = async () => ({ data: true, error: null });
const mkAdmin = (user: { id: string } | null) => ({ rpc: okRpc, auth: { getUser: async () => (user ? { data: { user }, error: null } : { data: { user: null }, error: { message: "bad" } }) } }) as any;
const req = (body: unknown, auth?: string) =>
  new Request("http://x/api/verify", { method: "POST", headers: auth ? { authorization: auth } : {}, body: JSON.stringify(body) });

test("401 without or with invalid token; verify not called", async () => {
  let called = false;
  const verify = (async () => { called = true; return { ok: true, reason: "found" }; }) as any;
  expect((await handleVerify(req({ artistId: A1, linkId: "l" }), { admin: mkAdmin({ id: "u" }), verify })).status).toBe(401);
  expect((await handleVerify(req({ artistId: A1, linkId: "l" }, "Bearer t"), { admin: mkAdmin(null), verify })).status).toBe(401);
  expect(called).toBe(false);
});
test("400 on bad body", async () => {
  const r = await handleVerify(req({ artistId: "a" }, "Bearer t"), { admin: mkAdmin({ id: "u" }), verify: (async () => ({ ok: true, reason: "found" })) as any });
  expect(r.status).toBe(400);
});
test("passes only ids and caller to verify and returns {ok, reason}", async () => {
  let got: any;
  const verify = (async (a: any) => { got = a; return { ok: false, reason: "not_found" }; }) as any;
  const r = await handleVerify(req({ artistId: A1, linkId: "l", url: "https://evil.example" }, "Bearer t"), { admin: mkAdmin({ id: "u1" }), verify });
  expect(await r.json()).toEqual({ ok: false, reason: "not_found" });
  expect(got).toMatchObject({ artistId: A1, linkId: "l", userId: "u1" });
  expect(got.url).toBeUndefined();
});
test("internal errors are hidden", async () => {
  const verify = (async () => { throw new Error("secret db detail"); }) as any;
  const r = await handleVerify(req({ artistId: A1, linkId: "l" }, "Bearer t"), { admin: mkAdmin({ id: "u" }), verify });
  expect(r.status).toBe(500);
  expect(await r.json()).toEqual({ ok: false, reason: "server_error" });
});

const mkAdminWithLinks = (rows: any[], err: any = null) => {
  const calls: any[] = [];
  const admin = {
    rpc: okRpc,
    auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    from: (t: string) => ({ select: (cols: string) => ({ eq: (c: string, v: string) => { calls.push([t, cols, c, v]); return Promise.resolve({ data: rows, error: err }); } }) }),
  } as any;
  return { admin, calls };
};
test("GET without token is 401", async () => {
  const r = await handleVerify(new Request("http://x/api/verify?artistId=a"), { admin: mkAdmin({ id: "u" }) });
  expect(r.status).toBe(401);
});
test("GET returns the authenticated caller's code only", async () => {
  let got: any;
  const getCode = (async (a: any) => { got = a; return "cf-ZZZZZZ"; }) as any;
  const r = await handleVerify(new Request(`http://x/api/verify?artistId=${A1}&userId=other`, { headers: { authorization: "Bearer t" } }), { admin: mkAdminWithLinks([]).admin, getCode });
  expect(await r.json()).toMatchObject({ code: "cf-ZZZZZZ" });
  expect(got).toMatchObject({ artistId: A1, userId: "u1" });
});
test("GET also returns only id, platform, url of this artist's links", async () => {
  const { admin, calls } = mkAdminWithLinks([{ id: "l1", platform: "spotify", url: "https://open.spotify.com/artist/x", artist_id: A1, canonical_key: "k" }]);
  const getCode = (async () => "cf-ZZZZZZ") as any;
  const r = await handleVerify(new Request(`http://x/api/verify?artistId=${A1}`, { headers: { authorization: "Bearer t" } }), { admin, getCode });
  expect(await r.json()).toEqual({ code: "cf-ZZZZZZ", issuedAt: null, expiresAt: null, links: [{ id: "l1", platform: "spotify", url: "https://open.spotify.com/artist/x" }] });
  expect(calls).toEqual([["artist_links", "id, platform, url", "artist_id", A1]]);
});
test("GET with a links query error is a hidden server_error", async () => {
  const { admin } = mkAdminWithLinks([], { message: "secret" });
  const r = await handleVerify(new Request(`http://x/api/verify?artistId=${A1}`, { headers: { authorization: "Bearer t" } }), { admin, getCode: (async () => "c") as any });
  expect(r.status).toBe(500);
  expect(await r.json()).toEqual({ ok: false, reason: "server_error" });
});
test("GET without artistId is 400", async () => {
  const r = await handleVerify(new Request("http://x/api/verify", { headers: { authorization: "Bearer t" } }), { admin: mkAdmin({ id: "u1" }) });
  expect(r.status).toBe(400);
});

const limitAdmin = (rpc: (name: string, args: any) => Promise<any>) => ({ ...mkAdmin({ id: "u1" }), rpc }) as any;
const getReq = () => new Request(`http://x/api/verify?artistId=${A1}`, { headers: { authorization: "Bearer t" } });

test("POST uses the per-user, per-artist limit of 5 an hour", async () => {
  const calls: any[] = [];
  const admin = limitAdmin(async (n, a) => { calls.push([n, a]); return { data: true, error: null }; });
  await handleVerify(req({ artistId: A1, linkId: "l" }, "Bearer t"), { admin, verify: (async () => ({ ok: false, reason: "not_found" })) as any });
  expect(calls).toEqual([
    ["rate_limit_hit", { p_key: "verify-all:u1", p_max: 20, p_window: "1 hour" }],
    ["rate_limit_hit", { p_key: `verify:u1:${A1}`, p_max: 5, p_window: "1 hour" }],
  ]);
});
test("POST over the limit is 429 rate_limited and the fetch does not run", async () => {
  let called = false;
  const verify = (async () => { called = true; return { ok: true, reason: "found" }; }) as any;
  const r = await handleVerify(req({ artistId: A1, linkId: "l" }, "Bearer t"), { admin: limitAdmin(async () => ({ data: false, error: null })), verify });
  expect(r.status).toBe(429);
  expect(await r.json()).toEqual({ ok: false, reason: "rate_limited" });
  expect(called).toBe(false);
});
test("POST fails closed with a generic 500 when the limiter errors", async () => {
  let called = false;
  const verify = (async () => { called = true; return { ok: true, reason: "found" }; }) as any;
  const r = await handleVerify(req({ artistId: A1, linkId: "l" }, "Bearer t"), { admin: limitAdmin(async () => ({ data: null, error: { message: "secret db detail" } })), verify });
  expect(r.status).toBe(500);
  expect(await r.text()).not.toMatch(/secret/);
  expect(called).toBe(false);
});
test("POST fails closed when the limiter throws", async () => {
  let called = false;
  const verify = (async () => { called = true; return { ok: true, reason: "found" }; }) as any;
  const r = await handleVerify(req({ artistId: A1, linkId: "l" }, "Bearer t"), { admin: limitAdmin(async () => { throw new Error("boom"); }), verify });
  expect(r.status).toBe(500);
  expect(called).toBe(false);
});
test("GET code requests are limited to 30 an hour per user and return 429 over it", async () => {
  const calls: any[] = [];
  let codeCalled = false;
  const getCode = (async () => { codeCalled = true; return "c"; }) as any;
  const r = await handleVerify(getReq(), { admin: limitAdmin(async (n, a) => { calls.push([n, a]); return { data: false, error: null }; }), getCode });
  expect(r.status).toBe(429);
  expect(await r.json()).toEqual({ ok: false, reason: "rate_limited" });
  expect(calls).toEqual([["rate_limit_hit", { p_key: "code:u1", p_max: 30, p_window: "1 hour" }]]);
  expect(codeCalled).toBe(false);
});
test("GET proceeds when the limiter itself errors (fails open)", async () => {
  const base = mkAdminWithLinks([]).admin;
  const admin = { ...base, rpc: async () => ({ data: null, error: { message: "down" } }) } as any;
  const r = await handleVerify(getReq(), { admin, getCode: (async () => "cf-ZZZZZZ") as any });
  expect(r.status).toBe(200);
  expect(await r.json()).toMatchObject({ code: "cf-ZZZZZZ" });
});

test("a non-UUID artistId is a 400 invalid_request before any limiter call or work", async () => {
  const calls: any[] = [];
  const admin = limitAdmin(async (n) => { calls.push(n); return { data: true, error: null }; });
  const post = await handleVerify(req({ artistId: "a:b;c", linkId: "l" }, "Bearer t"), { admin, verify: (async () => { throw new Error("no"); }) as any });
  expect(post.status).toBe(400);
  expect(await post.json()).toEqual({ ok: false, reason: "invalid_request" });
  const get = await handleVerify(new Request("http://x/api/verify?artistId=not-a-uuid", { headers: { authorization: "Bearer t" } }), { admin });
  expect(get.status).toBe(400);
  expect(calls).toEqual([]);
});
test("POST checks the per-user ceiling first (20 an hour), then the per-artist key", async () => {
  const calls: any[] = [];
  const admin = limitAdmin(async (n, a) => { calls.push([a.p_key, a.p_max]); return { data: true, error: null }; });
  await handleVerify(req({ artistId: A1, linkId: "l" }, "Bearer t"), { admin, verify: (async () => ({ ok: false, reason: "not_found" })) as any });
  expect(calls).toEqual([["verify-all:u1", 20], [`verify:u1:${A1}`, 5]]);
});
test("exceeding the per-user ceiling is a 429 and the per-artist key is not touched", async () => {
  const calls: string[] = [];
  let called = false;
  const admin = limitAdmin(async (n, a) => { calls.push(a.p_key); return { data: a.p_key !== "verify-all:u1", error: null }; });
  const r = await handleVerify(req({ artistId: A1, linkId: "l" }, "Bearer t"), { admin, verify: (async () => { called = true; return { ok: true, reason: "found" }; }) as any });
  expect(r.status).toBe(429);
  expect(await r.json()).toEqual({ ok: false, reason: "rate_limited" });
  expect(calls).toEqual(["verify-all:u1"]);
  expect(called).toBe(false);
});

test("GET returns when the code was issued and when it expires", async () => {
  const issuedAt = "2026-10-02T10:00:00.000Z";
  const expiresAt = "2026-10-03T10:00:00.000Z";
  const getCodeInfo = (async () => ({ code: "cf-ZZZZZZ", issuedAt, expiresAt })) as any;
  const r = await handleVerify(new Request(`http://x/api/verify?artistId=${A1}`, { headers: { authorization: "Bearer t" } }), { admin: mkAdminWithLinks([]).admin, getCodeInfo });
  expect(await r.json()).toEqual({ code: "cf-ZZZZZZ", issuedAt, expiresAt, links: [] });
});
