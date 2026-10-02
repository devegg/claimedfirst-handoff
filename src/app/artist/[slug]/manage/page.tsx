import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VerifyPanel from "@/components/VerifyPanel";
import TopSongsEditor from "@/components/TopSongsEditor";
import RecordStylePicker from "@/components/RecordStylePicker";
import DonationEditor from "@/components/DonationEditor";
import AudiencePanel, { type AudienceRow } from "@/components/AudiencePanel";
import RemovedBanner from "@/components/RemovedBanner";
import PageControls from "@/components/PageControls";

export default async function ManagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // The owner can always read their own artist row (even delisted), through a database function.
  const { data: owned, error: ownedError } = await supabase.rpc("my_owned_artist", { p_slug: slug });
  if (ownedError) {
    return (
      <main className="narrow">
        <p role="alert">Something went wrong loading this page. Reload to try again.</p>
      </main>
    );
  }
  const mine = Array.isArray(owned) ? owned[0] : owned;
  if (mine) {
    if (mine.status === "delisted") {
      return (
        <main className="narrow">
          <h1>Manage {mine.name}</h1>
          <RemovedBanner artistId={mine.id} artistName={mine.name} claimsFrozen={mine.claims_frozen} />
        </main>
      );
    }
    if (mine.status !== "live") {
      return (
        <main className="narrow">
          <h1>Manage {mine.name}</h1>
          <p>This page is not live right now, so there is nothing to manage yet.</p>
        </main>
      );
    }
    const [audienceRes, countsRes, songsRes, styleRes] = await Promise.all([
      supabase.rpc("artist_audience", { p_artist: mine.id }),
      supabase.rpc("artist_watch_counts", { p_artist: mine.id }),
      supabase.from("top_songs").select("title,url").eq("artist_id", mine.id).order("position"),
      supabase.from("artists").select("record_style").eq("id", mine.id).maybeSingle(),
    ]);
    // A failed read must never look like an empty list: saving an empty editor would erase the owner's songs.
    if (audienceRes.error || countsRes.error || songsRes.error || styleRes.error) {
      return (
        <main className="narrow">
          <p role="alert">Something went wrong loading this page. Reload to try again.</p>
        </main>
      );
    }
    const { data: audience } = audienceRes, { data: counts } = countsRes, { data: songs } = songsRes, { data: styleRow } = styleRes;
    const c = Array.isArray(counts) ? counts[0] : counts;
    return (
      <main className="narrow">
        <p><Link href={`/artist/${mine.slug}`}>Back to {mine.name}</Link></p>
        <h1>Manage {mine.name}</h1>
        <TopSongsEditor artistId={mine.id} initial={songs ?? []} />
        <RecordStylePicker artistId={mine.id} slug={mine.slug} stored={styleRow?.record_style ?? null} />
        <DonationEditor artistId={mine.id} initial={mine.donation_url ?? null} />
        <AudiencePanel rows={(audience ?? []) as AudienceRow[]} counts={{ total: c?.total ?? 0, named: c?.named ?? 0 }} />
        <PageControls artistId={mine.id} artistName={mine.name} claimsFrozen={mine.claims_frozen} delisted={false} />
      </main>
    );
  }

  // Not the owner: the public lookup (RLS shows live pages only) and the verify section.
  const { data: artist } = await supabase
    .from("artists")
    .select("id,name,slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!artist) {
    if (!/^[a-z0-9-]{1,100}$/.test(slug)) notFound();
    return (
      <main className="narrow">
        <h1>Not live yet</h1>
        <p>This Artist page isn&apos;t live right now, so there is nothing to manage yet.</p>
        <p><Link href="/">Back to home</Link></p>
      </main>
    );
  }
  return (
    <main className="narrow">
      <p><Link href={`/artist/${artist.slug}`}>Back to {artist.name}</Link></p>
      <h1>Manage {artist.name}</h1>
      <VerifyPanel artistId={artist.id} artistName={artist.name} />
    </main>
  );
}
