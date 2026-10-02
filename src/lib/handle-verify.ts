import { createAdminClient } from "./supabase/admin";
import { rateLimitHit } from "./rate-limit";
import { getVerificationCode, getVerificationCodeInfo, verifyArtistPage, type CodeInfo } from "./verify-artist";

type Deps = { admin?: ReturnType<typeof createAdminClient>; verify?: typeof verifyArtistPage; getCode?: typeof getVerificationCode; getCodeInfo?: typeof getVerificationCodeInfo };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: { ok: boolean; reason: string } | { code: string; issuedAt: string | null; expiresAt: string | null; links: { id: string; platform: string; url: string }[] }, status = 200) => Response.json(body, { status });

export async function handleVerify(req: Request, deps: Deps = {}): Promise<Response> {
  try {
    const m = /^Bearer (.+)$/i.exec(req.headers.get("authorization") ?? "");
    if (!m) return json({ ok: false, reason: "unauthorized" }, 401);
    const admin = deps.admin ?? createAdminClient();
    const { data, error } = await admin.auth.getUser(m[1].trim());
    if (error || !data?.user) return json({ ok: false, reason: "unauthorized" }, 401);

    if (req.method === "GET") {
      const artistId = new URL(req.url).searchParams.get("artistId");
      if (!artistId) return json({ ok: false, reason: "bad_request" }, 400);
      if (!UUID.test(artistId)) return json({ ok: false, reason: "invalid_request" }, 400);
      // Fail open for GET: reading a code is harmless, and the POST limit is what protects the fetch.
      if ((await rateLimitHit(admin, `code:${data.user.id}`, 30)) === "limited") return json({ ok: false, reason: "rate_limited" }, 429);
      // Always the caller's own code; no user id is ever read from the request.
      const args = { admin, artistId, userId: data.user.id };
      let got: CodeInfo | null;
      if (deps.getCodeInfo) got = await deps.getCodeInfo(args);
      else if (deps.getCode) { const c = await deps.getCode(args); got = c ? { code: c, issuedAt: null, expiresAt: null } : null; }
      else got = await getVerificationCodeInfo(args);
      if (!got) return json({ ok: false, reason: "server_error" }, 500);
      // Only this artist's listed pages, and only these three fields (the owner picks one to check).
      const { data: links, error: linksErr } = await admin
        .from("artist_links").select("id, platform, url").eq("artist_id", artistId);
      if (linksErr) return json({ ok: false, reason: "server_error" }, 500);
      return json({
        code: got.code,
        // when the code was issued and when it stops working, so the screen can show the exact time
        issuedAt: got.issuedAt,
        expiresAt: got.expiresAt,
        links: (links ?? []).map((l) => ({ id: l.id as string, platform: l.platform as string, url: l.url as string })),
      });
    }

    let body: unknown;
    try { body = await req.json(); } catch { return json({ ok: false, reason: "bad_request" }, 400); }
    const { artistId, linkId } = (body ?? {}) as Record<string, unknown>;
    if (typeof artistId !== "string" || typeof linkId !== "string") return json({ ok: false, reason: "bad_request" }, 400);

    if (!UUID.test(artistId)) return json({ ok: false, reason: "invalid_request" }, 400);
    // Fail closed for POST: if the limiter cannot answer, do not make the outbound fetch.
    // A per-user ceiling across all artists, then the per-artist key.
    const all = await rateLimitHit(admin, `verify-all:${data.user.id}`, 20);
    if (all === "limited") return json({ ok: false, reason: "rate_limited" }, 429);
    if (all === "error") return json({ ok: false, reason: "server_error" }, 500);
    const limit = await rateLimitHit(admin, `verify:${data.user.id}:${artistId}`, 5);
    if (limit === "limited") return json({ ok: false, reason: "rate_limited" }, 429);
    if (limit === "error") return json({ ok: false, reason: "server_error" }, 500);

    const r = await (deps.verify ?? verifyArtistPage)({ admin, artistId, linkId, userId: data.user.id });
    return json({ ok: r.ok, reason: r.reason }, r.reason === "server_error" ? 500 : 200);
  } catch {
    return json({ ok: false, reason: "server_error" }, 500);
  }
}

