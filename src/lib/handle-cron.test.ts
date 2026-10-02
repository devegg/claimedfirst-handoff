/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test } from "vitest";
import { handleCron } from "./handle-cron";

const req = (auth?: string) => new Request("http://x/api/cron/score", { headers: auth ? { authorization: auth } : {} });
const mkAdmin = (calls: any[], fail?: string) =>
  ({ rpc: async (name: string, args?: any) => { calls.push([name, args]); return name === fail ? { data: null, error: { message: "secret db detail" } } : { data: null, error: null }; } }) as any;
const now = () => new Date("2026-10-17T04:00:00Z");

test("401 with no header, wrong secret, or unset secret; no RPC runs", async () => {
  const calls: any[] = [];
  const admin = mkAdmin(calls);
  expect((await handleCron(req(), { admin, secret: "s3cret", now })).status).toBe(401);
  expect((await handleCron(req("Bearer nope"), { admin, secret: "s3cret", now })).status).toBe(401);
  expect((await handleCron(req("Bearer s3cret"), { admin, secret: undefined, now })).status).toBe(401);
  expect((await handleCron(req("Bearer "), { admin, secret: "", now })).status).toBe(401);
  expect((await handleCron(req("Basic s3cret"), { admin, secret: "s3cret", now })).status).toBe(401);
  expect((await handleCron(req("Token s3cret"), { admin, secret: "s3cret", now })).status).toBe(401);
  expect(calls).toEqual([]);
});
test("different lengths do not throw and are rejected", async () => {
  const admin = mkAdmin([]);
  for (const h of ["Bearer s", "Bearer s3cret-and-much-longer", "Bearer s3creé"]) {
    expect((await handleCron(req(h), { admin, secret: "s3cret", now })).status).toBe(401);
  }
});
test("right secret refreshes the current UTC month then recomputes slots", async () => {
  const calls: any[] = [];
  const r = await handleCron(req("Bearer s3cret"), { admin: mkAdmin(calls), secret: "s3cret", now });
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
  expect(calls).toEqual([["refresh_season_scores", { p_start: "2026-10-01T00:00:00.000Z" }], ["recompute_all_slots", undefined], ["purge_rate_limits", undefined], ["restore_expired_disputes", undefined]]);
});
test("month start uses UTC, not local time", async () => {
  const calls: any[] = [];
  await handleCron(req("Bearer s3cret"), { admin: mkAdmin(calls), secret: "s3cret", now: () => new Date("2026-11-01T00:30:00Z") });
  expect(calls[0][1]).toEqual({ p_start: "2026-10-01T00:00:00.000Z" });
  expect(calls[1][1]).toEqual({ p_start: "2026-11-01T00:00:00.000Z" });
});
test("RPC failure returns a generic 500 with no details and stops", async () => {
  for (const fail of ["refresh_season_scores", "recompute_all_slots", "purge_rate_limits", "restore_expired_disputes"]) {
    const calls: any[] = [];
    const r = await handleCron(req("Bearer s3cret"), { admin: mkAdmin(calls, fail), secret: "s3cret", now });
    expect(r.status).toBe(500);
    const text = await r.text();
    expect(text).not.toMatch(/secret db detail/);
    expect(JSON.parse(text)).toEqual({ ok: false });
    if (fail === "refresh_season_scores") expect(calls.length).toBe(1);
  }
});
test("a thrown error is hidden too", async () => {
  const admin = { rpc: async () => { throw new Error("secret db detail"); } } as any;
  const r = await handleCron(req("Bearer s3cret"), { admin, secret: "s3cret", now });
  expect(r.status).toBe(500);
  expect(await r.text()).not.toMatch(/secret db detail/);
});

test("Bearer scheme is case-insensitive but the token is still compared exactly", async () => {
  for (const h of ["bearer s3cret", "BEARER s3cret", "BeArEr s3cret"]) {
    const calls: any[] = [];
    expect((await handleCron(req(h), { admin: mkAdmin(calls), secret: "s3cret", now })).status).toBe(200);
  }
  const admin = mkAdmin([]);
  expect((await handleCron(req("bearer x"), { admin, secret: "s3cret", now })).status).toBe(401);
  expect((await handleCron(req("BEARER S3CRET"), { admin, secret: "s3cret", now })).status).toBe(401);
});
test("on the 1st the previous month is refreshed first, then the current month, then slots", async () => {
  const calls: any[] = [];
  await handleCron(req("Bearer s3cret"), { admin: mkAdmin(calls), secret: "s3cret", now: () => new Date("2026-11-01T04:00:00Z") });
  expect(calls).toEqual([
    ["refresh_season_scores", { p_start: "2026-10-01T00:00:00.000Z" }],
    ["refresh_season_scores", { p_start: "2026-11-01T00:00:00.000Z" }],
    ["recompute_all_slots", undefined],
    ["purge_rate_limits", undefined], ["restore_expired_disputes", undefined],
  ]);
});
test("on 1 January the previous month is December of the previous year", async () => {
  const calls: any[] = [];
  await handleCron(req("Bearer s3cret"), { admin: mkAdmin(calls), secret: "s3cret", now: () => new Date("2027-01-01T04:00:00Z") });
  expect(calls.map((c) => c[1]?.p_start)).toEqual(["2026-12-01T00:00:00.000Z", "2027-01-01T00:00:00.000Z", undefined, undefined, undefined]);
});
test("mid-month only the current month is refreshed", async () => {
  const calls: any[] = [];
  await handleCron(req("Bearer s3cret"), { admin: mkAdmin(calls), secret: "s3cret", now: () => new Date("2026-11-15T04:00:00Z") });
  expect(calls).toEqual([["refresh_season_scores", { p_start: "2026-11-01T00:00:00.000Z" }], ["recompute_all_slots", undefined], ["purge_rate_limits", undefined], ["restore_expired_disputes", undefined]]);
});
test("a failure on the 1st stops later calls", async () => {
  const calls: any[] = [];
  const admin = { rpc: async (n: string, a?: any) => { calls.push([n, a]); return { data: null, error: calls.length === 1 ? { message: "x" } : null }; } } as any;
  const r = await handleCron(req("Bearer s3cret"), { admin, secret: "s3cret", now: () => new Date("2026-11-01T04:00:00Z") });
  expect(r.status).toBe(500);
  expect(calls.length).toBe(1);
});
