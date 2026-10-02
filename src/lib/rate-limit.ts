import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitResult = "ok" | "limited" | "error";

/** One hit against a fixed one-hour window. Never throws; "error" means the limiter itself failed. */
export async function rateLimitHit(admin: SupabaseClient, key: string, max: number): Promise<RateLimitResult> {
  try {
    const { data, error } = await admin.rpc("rate_limit_hit", { p_key: key, p_max: max, p_window: "1 hour" });
    if (error || typeof data !== "boolean") return "error";
    return data ? "ok" : "limited";
  } catch {
    return "error";
  }
}
