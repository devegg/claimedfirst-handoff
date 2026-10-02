import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canonicalArtistKey, SLUG_RE } from "@/lib/artist-url";

export type AddressState = "invalid_url" | "invalid_slug" | "available" | "taken" | "listed";
export type AddressCheck = {
  state: AddressState;
  /** The page that already holds the slug (taken) or this link (listed). */
  existing?: { name: string; slug: string };
  /** Up to 5 live artists whose name or address contains the typed text. */
  matches: { name: string; slug: string }[];
};

// Cheap and read-only: anyone may call it. Returns public fields only (name, slug).
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const slug = (p.get("slug") ?? "").trim().toLowerCase().slice(0, 40);
  const url = (p.get("url") ?? "").slice(0, 500);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const admin = createAdminClient();
  const { data: ok, error: limitErr } = await admin.rpc("rate_limit_hit", { p_key: `check:${ip}`, p_max: 60, p_window: "1 minute" });
  if (!limitErr && ok === false) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Cache-Control": "no-store" } });
  const supabase = await createClient();

  const search = slug.length >= 2 ? supabase.rpc("search_live_artists", { p_q: slug }) : Promise.resolve({ data: [] });
  let state: AddressState = "available";
  let existing: AddressCheck["existing"];

  let key: string | null = null;
  try { key = canonicalArtistKey(url).key; } catch { state = "invalid_url"; }
  if (key) {
    const { data: link } = await admin
      .from("artist_links").select("artists(name, slug, status)").eq("canonical_key", key).maybeSingle();
    const a = (link as { artists: { name: string; slug: string; status: string } | null } | null)?.artists;
    if (a && (a.status === "live" || a.status === "pending")) { state = "listed"; existing = { name: a.name, slug: a.slug }; }
    else if (a) state = "listed"; // disputed or delisted: still this link's page, nothing revealed
  }
  if (state === "available") {
    if (!SLUG_RE.test(slug)) state = "invalid_slug";
    else {
      const { data } = await supabase.rpc("artist_slug_status", { p_slug: slug });
      const row = (data as { taken: boolean; name: string | null; slug: string | null }[] | null)?.[0];
      if (row?.taken) { state = "taken"; if (row.name && row.slug) existing = { name: row.name, slug: row.slug }; }
    }
  }
  const { data: matches } = await search;
  const body: AddressCheck = { state, existing, matches: (matches as { name: string; slug: string }[] | null) ?? [] };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
