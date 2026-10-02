import type { createClient } from "@/lib/supabase/browser";
import { parseDefaults, type ClaimVisibility, type WatchLevel } from "@/lib/visibility";

type Browser = ReturnType<typeof createClient>;

/**
 * Reads the signed-in scout's own default levels. signedIn is false only when we positively know
 * nobody is signed in; any read failure falls back to public claims and anonymous watches.
 */
export async function loadOwnDefaults(
  supabase: Browser,
): Promise<{ signedIn: boolean; claim: ClaimVisibility; watch: WatchLevel }> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return { signedIn: false, ...parseDefaults(null) };
    const { data: row } = await supabase
      .from("profiles").select("default_claim_visibility,default_watch_named").eq("id", user.id).maybeSingle();
    return { signedIn: true, ...parseDefaults(row) };
  } catch {
    return { signedIn: true, ...parseDefaults(null) };
  }
}
