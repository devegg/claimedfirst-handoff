import type { SupabaseClient } from "@supabase/supabase-js";
import { checkPage, newCode, type ResolveHost, type VerifyResult } from "./verify";

export type VerifyOutcome = {
  ok: boolean;
  reason: VerifyResult["reason"] | "link_not_found" | "server_error" | "code_expired" | "code_used";
};

/** A code works for 24 hours from the moment it was first issued, and once. Mirrors verify_artist_with_code (0032). */
export const CODE_TTL_MS = 24 * 60 * 60 * 1000;

type CodeState = { code: string; expired: boolean; used: boolean; issued: number | null };

/** The newest code for (artist, user) and whether it can still be used. null: none yet. "error": database error. */
async function currentCodeState(admin: SupabaseClient, artistId: string, userId: string, now = Date.now()): Promise<CodeState | null | "error"> {
  const { data, error } = await admin
    .from("verification_attempts").select("code, checked_at, result").eq("artist_id", artistId).eq("user_id", userId)
    .order("checked_at", { ascending: false }).limit(200);
  if (error) return "error";
  const latest = data?.[0];
  if (!latest?.code) return null;
  const same = (data ?? []).filter((r) => r.code === latest.code);
  const times = same.map((r) => Date.parse(String(r.checked_at))).filter((t) => !Number.isNaN(t));
  const issued = times.length ? Math.min(...times) : null;
  return {
    code: latest.code as string,
    expired: issued !== null && now - issued >= CODE_TTL_MS,
    used: same.some((r) => r.result === "found"),
    issued,
  };
}

export async function verifyArtistPage(args: {
  admin: SupabaseClient;
  artistId: string;
  userId: string; // authenticated caller; codes are per (artist, user)
  linkId: string;
  fetchImpl?: typeof fetch;
  resolveHost?: ResolveHost;
  rand?: (max: number) => number;
}): Promise<VerifyOutcome> {
  const { admin, artistId, userId, linkId, fetchImpl, resolveHost, rand } = args;

  // Only a listed link of THIS artist; the URL always comes from the stored row.
  const { data: link, error: linkErr } = await admin
    .from("artist_links").select("id, url").eq("id", linkId).eq("artist_id", artistId).maybeSingle();
  if (linkErr) return { ok: false, reason: "server_error" };
  if (!link) return { ok: false, reason: "link_not_found" };

  // An old or already-used code is refused before any page is fetched. The next read of the code makes a new one.
  const state = await currentCodeState(admin, artistId, userId);
  if (state === "error") return { ok: false, reason: "server_error" };
  if (state?.used) return { ok: false, reason: "code_used" };
  if (state?.expired) return { ok: false, reason: "code_expired" };

  const got = await getVerificationCode({ admin, artistId, userId, rand });
  if (!got) return { ok: false, reason: "server_error" };
  const code = got;

  const result = await checkPage(link.url, code, { fetchImpl, resolveHost });
  if (result.reason === "found") {
    // One transaction in the database: re-checks age and single use, records the success, then sets
    // verified_at, owner (latest verifier wins) and status together.
    const { error } = await admin.rpc("verify_artist_with_code", { p_artist: artistId, p_user: userId, p_code: code, p_url: link.url });
    if (error) {
      if (error.message?.includes("code_used")) return { ok: false, reason: "code_used" };
      if (error.message?.includes("code_expired")) return { ok: false, reason: "code_expired" };
      return { ok: false, reason: "server_error" };
    }
  } else {
    const { error: insErr } = await admin
      .from("verification_attempts").insert({ artist_id: artistId, user_id: userId, code, url: link.url, result: result.reason });
    if (insErr) return { ok: false, reason: "server_error" };
  }
  return { ok: result.ok, reason: result.reason };
}

/** A code with the moment it was issued and the moment it stops working (ISO 8601), so the screen can show the exact time. */
export type CodeInfo = { code: string; issuedAt: string | null; expiresAt: string | null };

// issuedMs is the earliest stored row for the code: the same row verify_artist_with_code (0032) measures 24 hours from.
// When it is unknown the times are null; they are never replaced by the current time.
const info = (code: string, issuedMs: number | null): CodeInfo => ({
  code,
  issuedAt: issuedMs === null ? null : new Date(issuedMs).toISOString(),
  expiresAt: issuedMs === null ? null : new Date(issuedMs + CODE_TTL_MS).toISOString(),
});

// R14: one code per (artist, user), created on first use and stable afterwards, until it is 24 hours old
// or has verified the artist. Then the next call makes a fresh one. Returns null on a database error.
export async function getVerificationCodeInfo(args: {
  admin: SupabaseClient;
  artistId: string;
  userId: string;
  rand?: (max: number) => number;
}): Promise<CodeInfo | null> {
  const { admin, artistId, userId, rand } = args;
  const state = await currentCodeState(admin, artistId, userId);
  if (state === "error") return null;
  if (state && !state.expired && !state.used) return info(state.code, state.issued);
  const code = newCode(rand);
  const issued = Date.now();
  // checked_at is set explicitly so the stored issue time is exactly the one returned
  const { error: insErr } = await admin
    .from("verification_attempts").insert({ artist_id: artistId, user_id: userId, code, result: null, checked_at: new Date(issued).toISOString() });
  return insErr ? null : info(code, issued);
}

export async function getVerificationCode(args: {
  admin: SupabaseClient;
  artistId: string;
  userId: string;
  rand?: (max: number) => number;
}): Promise<string | null> {
  return (await getVerificationCodeInfo(args))?.code ?? null;
}
