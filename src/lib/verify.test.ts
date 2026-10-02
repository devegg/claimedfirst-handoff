import { expect, test } from "vitest";
import { newCode, checkPage } from "./verify";

const page = (body: string, status = 200) => (async () => new Response(body, { status })) as unknown as typeof fetch;
const pub = async () => [{ address: "93.184.216.34", family: 4 }];
const base = { resolveHost: pub };

test("code format", () => {
  for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^cf-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
});
test("found is case-insensitive", async () => {
  expect(await checkPage("https://suno.com/@x", "cf-ABC234", { ...base, fetchImpl: page("bio cf-abc234 here") })).toMatchObject({ ok: true, reason: "found" });
});
test("not found, blocked, error", async () => {
  expect((await checkPage("https://suno.com/@x", "cf-ABC234", { ...base, fetchImpl: page("nothing") })).reason).toBe("not_found");
  expect((await checkPage("https://suno.com/@x", "cf-ABC234", { ...base, fetchImpl: page("", 403) })).reason).toBe("blocked");
  const boom = (async () => { throw new Error("dns"); }) as unknown as typeof fetch;
  expect((await checkPage("https://suno.com/@x", "cf-ABC234", { ...base, fetchImpl: boom })).reason).toBe("fetch_error");
});
test("redirects are blocked", async () => {
  expect((await checkPage("https://suno.com/@x", "cf-ABC234", { ...base, fetchImpl: page("", 302) })).reason).toBe("blocked");
});
test("too large pages never grant the badge", async () => {
  const r = await checkPage("https://suno.com/@x", "cf-ABC234", { ...base, fetchImpl: page("x".repeat(50) + "cf-ABC234"), maxBytes: 20 });
  expect(r).toMatchObject({ ok: false, reason: "too_large" });
});
test("body is read through a stream and stops early", async () => {
  let pulls = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(c) { pulls++; c.enqueue(new TextEncoder().encode("x".repeat(10))); },
  });
  const f = (async () => new Response(body, { status: 200 })) as unknown as typeof fetch;
  const r = await checkPage("https://suno.com/@x", "cf-ABC234", { ...base, fetchImpl: f, maxBytes: 25 });
  expect(r.reason).toBe("too_large");
  expect(pulls).toBeLessThan(10);
});
test("timeout", async () => {
  const slow = ((_u: string, init?: RequestInit) => new Promise((_, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted"))))) as unknown as typeof fetch;
  expect((await checkPage("https://suno.com/@x", "cf-ABC234", { ...base, fetchImpl: slow, timeoutMs: 20 })).reason).toBe("timeout");
});
test("unsafe urls are refused without fetching", async () => {
  let called = false;
  const spy = (async () => { called = true; return new Response("cf-ABC234"); }) as unknown as typeof fetch;
  for (const u of [
    "http://suno.com/@x", "https://localhost/x", "https://127.0.0.1/x", "https://10.0.0.5/x", "https://192.168.1.1/x",
    "https://169.254.169.254/x", "https://[::1]/x", "https://thing.local/x",
    "https://user:pass@suno.com/@x", "https://user@suno.com/@x", "https://suno.com:8443/@x", "https://suno.com:80/@x", "not a url",
  ]) {
    expect((await checkPage(u, "cf-ABC234", { ...base, fetchImpl: spy })).reason).toBe("unsafe_url");
  }
  expect(called).toBe(false);
});
test("hostnames resolving to non-public addresses are refused", async () => {
  let called = false;
  const spy = (async () => { called = true; return new Response("cf-ABC234"); }) as unknown as typeof fetch;
  const bad = [
    "127.0.0.1", "127.5.5.5", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.9", "169.254.169.254",
    "100.64.0.1", "100.127.255.255", "0.0.0.0", "224.0.0.1", "240.0.0.1", "255.255.255.255",
    "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "febf::1", "ff02::1",
    "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe",
  ];
  for (const addr of bad) {
    const r = await checkPage("https://evil.example/x", "cf-ABC234", { fetchImpl: spy, resolveHost: async () => [{ address: addr, family: addr.includes(":") ? 6 : 4 }] });
    expect(r.reason, addr).toBe("unsafe_url");
  }
  // ANY bad address among several is enough
  const mixed = await checkPage("https://evil.example/x", "cf-ABC234", { fetchImpl: spy, resolveHost: async () => [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 }] });
  expect(mixed.reason).toBe("unsafe_url");
  expect(called).toBe(false);
});
test("public addresses (v4 and v6) are allowed", async () => {
  for (const addr of ["93.184.216.34", "172.32.0.1", "100.128.0.1", "2606:2800:220:1:248:1893:25c8:1946", "::ffff:5db8:d822"]) {
    const r = await checkPage("https://ok.example/x", "cf-ABC234", { fetchImpl: page("cf-ABC234"), resolveHost: async () => [{ address: addr, family: addr.includes(":") ? 6 : 4 }] });
    expect(r.reason, addr).toBe("found");
  }
});
test("unresolvable host is fetch_error and nothing is fetched", async () => {
  let called = false;
  const spy = (async () => { called = true; return new Response("x"); }) as unknown as typeof fetch;
  const nx = async () => { throw new Error("ENOTFOUND"); };
  expect((await checkPage("https://nope.example/x", "cf-ABC234", { fetchImpl: spy, resolveHost: nx })).reason).toBe("fetch_error");
  expect((await checkPage("https://nope.example/x", "cf-ABC234", { fetchImpl: spy, resolveHost: async () => [] })).reason).toBe("fetch_error");
  expect(called).toBe(false);
});

test("odd host forms never reach fetch", async () => {
  let called = false;
  const spy = (async () => { called = true; return new Response("cf-ABC234"); }) as unknown as typeof fetch;
  const loop = async () => [{ address: "127.0.0.1", family: 4 }];
  for (const u of ["https://2130706433/", "https://0x7f000001/", "https://127.1/", "https://localhost./"]) {
    const r = await checkPage(u, "cf-ABC234", { fetchImpl: spy, resolveHost: loop });
    expect(["unsafe_url", "fetch_error"], u).toContain(r.reason);
  }
  expect(called).toBe(false);
});
test("tunnelling and special IPv6/IPv4 ranges", async () => {
  const run = (addr: string) => checkPage("https://h.example/x", "cf-ABC234", { fetchImpl: page("cf-ABC234"), resolveHost: async () => [{ address: addr, family: addr.includes(":") ? 6 : 4 }] });
  for (const a of ["64:ff9b::a00:1", "64:ff9b::a9fe:a9fe", "2002:7f00:1::", "2002:a00:1::", "2001:0:4136:e378:8000:63bf:3fff:fdd2", "2001:db8::1", "::ffff:7f00:1", "64:ff9b:1::a00:1",
    "198.18.0.1", "198.19.255.255", "192.0.0.8", "192.0.2.1", "198.51.100.1", "203.0.113.1", "240.0.0.1"]) {
    expect((await run(a)).reason, a).toBe("unsafe_url");
  }
  for (const a of ["64:ff9b::808:808", "2606:4700:4700::1111", "2002:808:808::"]) expect((await run(a)).reason, a).toBe("found");
});
test("301 and 308 are blocked", async () => {
  for (const s of [301, 308]) expect((await checkPage("https://suno.com/@x", "cf-ABC234", { ...base, fetchImpl: page("", s) })).reason).toBe("blocked");
});
test("multibyte char split across chunks still finds the code", async () => {
  const bytes = new TextEncoder().encode("héllo \u{1F600} cf-ABC234");
  const cut = bytes.indexOf(0xf0) + 2;
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(bytes.slice(0, cut)); c.enqueue(bytes.slice(cut)); c.close(); } });
  const f = (async () => new Response(body)) as unknown as typeof fetch;
  expect((await checkPage("https://suno.com/@x", "cf-ABC234", { ...base, fetchImpl: f })).reason).toBe("found");
});
test("empty body is not_found", async () => {
  const f = (async () => new Response(null, { status: 200 })) as unknown as typeof fetch;
  expect((await checkPage("https://suno.com/@x", "cf-ABC234", { ...base, fetchImpl: f })).reason).toBe("not_found");
});
