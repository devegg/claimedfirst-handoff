"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canonicalArtistKey } from "@/lib/artist-url";
import { submitErrorMessage } from "@/lib/claim-errors";
import { checkArtistName } from "@/lib/name-check";

export type SubmitState = { error?: string; pending?: { name: string } } | null;

export async function submitArtist(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: submitErrorMessage("not_authenticated") };

  const name = String(formData.get("name") ?? "");
  // Refused before anything is stored; the message never repeats the name or the rule that matched.
  if (!checkArtistName(name).ok) return { error: submitErrorMessage("name_not_allowed") };
  let canon;
  try { canon = canonicalArtistKey(String(formData.get("url") ?? "")); }
  catch (e) { return { error: submitErrorMessage(e instanceof Error ? e.message : "") }; }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("submit_artist", {
    p_user: user.id, p_name: name, p_platform: canon.platform, p_key: canon.key, p_url: canon.url,
    p_slug: String(formData.get("slug") ?? "").trim() || null,
  });
  if (error) return { error: submitErrorMessage(error.message) };
  const artist = data as { slug: string; status: string };
  if (artist.status === "live") redirect(`/artist/${artist.slug}`);
  // Echo the submitter's own typed name; never the stored name or a live count.
  return { pending: { name: name.trim() } };
}
