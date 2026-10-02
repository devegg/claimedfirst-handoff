import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

type Deps = { admin?: ReturnType<typeof createAdminClient>; secret?: string; now?: () => Date };

function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  const m = /^Bearer (.+)$/i.exec(header ?? "");
  if (!m) return false;
  const given = Buffer.from(m[1]);
  const want = Buffer.from(secret);
  // timingSafeEqual throws on different lengths, so check length first
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function handleCron(req: Request, deps: Deps = {}): Promise<Response> {
  const secret = "secret" in deps ? deps.secret : process.env.CRON_SECRET;
  if (!authorized(req.headers.get("authorization"), secret)) return Response.json({ ok: false }, { status: 401 });
  try {
    const admin = deps.admin ?? createAdminClient();
    const d = (deps.now ?? (() => new Date()))();
    // Date.UTC rolls month -1 over to December of the previous year.
    const starts = [new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()];
    // On the 1st, finish the season that just ended before scoring the new one (R26).
    if (d.getUTCDate() === 1) starts.unshift(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString());
    for (const p_start of starts) {
      const a = await admin.rpc("refresh_season_scores", { p_start });
      if (a.error) return Response.json({ ok: false }, { status: 500 });
    }
    const b = await admin.rpc("recompute_all_slots");
    if (b.error) return Response.json({ ok: false }, { status: 500 });
    const c = await admin.rpc("purge_rate_limits");
    if (c.error) return Response.json({ ok: false }, { status: 500 });
    const e = await admin.rpc("restore_expired_disputes");
    if (e.error) return Response.json({ ok: false }, { status: 500 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
