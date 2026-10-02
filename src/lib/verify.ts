// Residual risk (DNS rebinding): checkPage resolves the hostname and rejects non-public
// addresses, but fetch() resolves it again, so a hostile DNS server could answer differently
// the second time. A pinned-IP dispatcher (connect to the vetted address) is a planned hardening.
import { randomInt } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIPv4, isIPv6 } from "node:net";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export type VerifyResult = { ok: boolean; reason: "found" | "not_found" | "blocked" | "timeout" | "too_large" | "fetch_error" | "unsafe_url"; status?: number };
export type ResolveHost = (host: string) => Promise<{ address: string; family?: number }[]>;

export function newCode(rand: (max: number) => number = (m) => randomInt(m)) {
  return "cf-" + Array.from({ length: 6 }, () => ALPHABET[rand(ALPHABET.length)]).join("");
}

const defaultResolve: ResolveHost = (host) => lookup(host, { all: true });

function isSafeUrl(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== "443") return null;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return null;
  if (h.startsWith("[") || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return null; // no IP literals at all
  return u;
}

function isBadV4(o: number[]): boolean {
  const [a, b] = o;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (o[2] === 0 || o[2] === 2)) || // 192.0.0.0/24, 192.0.2.0/24
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15
    (a === 198 && b === 51 && o[2] === 100) ||
    (a === 203 && b === 0 && o[2] === 113) ||
    a >= 224 // multicast, 240.0.0.0/4 reserved, broadcast
  );
}

function parseV6(addr: string): number[] | null {
  let s = addr.toLowerCase().split("%")[0];
  const m = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (m) {
    const p = m[2].split(".").map(Number);
    s = m[1] + ((p[0] << 8) | p[1]).toString(16) + ":" + ((p[2] << 8) | p[3]).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : fill < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? fill : 0).fill("0"), ...tail].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

export function isPublicAddress(addr: string): boolean {
  if (isIPv4(addr)) return !isBadV4(addr.split(".").map(Number));
  if (isIPv6(addr)) {
    const g = parseV6(addr);
    if (!g) return false;
    if (g.every((x) => x === 0)) return false; // ::
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return false; // ::1
    if ((g[0] & 0xfe00) === 0xfc00) return false; // fc00::/7
    if ((g[0] & 0xffc0) === 0xfe80) return false; // fe80::/10
    if ((g[0] & 0xff00) === 0xff00) return false; // multicast
    if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) { // IPv4-mapped
      return !isBadV4([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255]);
    }
    const v4 = (hi: number, lo: number) => !isBadV4([hi >> 8, hi & 255, lo >> 8, lo & 255]);
    if (g[0] === 0x64 && g[1] === 0xff9b) { // NAT64
      if (g.slice(2, 6).every((x) => x === 0)) return v4(g[6], g[7]); // 64:ff9b::/96
      if (g[2] === 1) return false; // 64:ff9b:1::/48 local-use: deny
      return false;
    }
    if (g[0] === 0x2002) return v4(g[1], g[2]); // 6to4
    if (g[0] === 0x2001 && g[1] === 0) return false; // Teredo
    if (g[0] === 0x2001 && g[1] === 0xdb8) return false; // documentation
    if (g.slice(0, 6).every((x) => x === 0)) return false; // IPv4-compatible (deprecated)
    return true;
  }
  return false;
}

async function readLimited(res: Response, maxBytes: number): Promise<string | null> {
  if (!res.body) {
    const t = await res.text();
    return Buffer.byteLength(t) > maxBytes ? null : t;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let total = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel().catch(() => {}); return null; }
    text += dec.decode(value, { stream: true });
  }
  return text + dec.decode();
}

export async function checkPage(
  url: string,
  code: string,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number; maxBytes?: number; resolveHost?: ResolveHost } = {},
): Promise<VerifyResult> {
  const { fetchImpl = fetch, timeoutMs = 15000, maxBytes = 2_000_000, resolveHost = defaultResolve } = opts;
  const u = isSafeUrl(url);
  if (!u) return { ok: false, reason: "unsafe_url" };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let addrs: { address: string }[];
    try { addrs = await resolveHost(u.hostname); } catch { return { ok: false, reason: "fetch_error" }; }
    if (!addrs.length) return { ok: false, reason: "fetch_error" };
    if (!addrs.every((a) => isPublicAddress(a.address))) return { ok: false, reason: "unsafe_url" };

    const res = await fetchImpl(url, { signal: ctl.signal, redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; ClaimedFirstVerifier/1.0)", accept: "text/html,*/*" } });
    if (res.status >= 300) return { ok: false, reason: "blocked", status: res.status };
    const text = await readLimited(res, maxBytes);
    if (text === null) return { ok: false, reason: "too_large", status: res.status };
    return text.toLowerCase().includes(code.toLowerCase())
      ? { ok: true, reason: "found", status: res.status }
      : { ok: false, reason: "not_found", status: res.status };
  } catch {
    return { ok: false, reason: ctl.signal.aborted ? "timeout" : "fetch_error" };
  } finally { clearTimeout(timer); }
}
