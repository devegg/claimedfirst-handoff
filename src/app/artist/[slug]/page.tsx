import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ArtistHeader from "@/components/ArtistHeader";
import ClaimButton from "@/components/ClaimButton";
import WatchButton from "@/components/WatchButton";
import ReportButton from "@/components/ReportButton";
import { isHttpsUrl, linkHost, withClaimedFirstTag } from "@/lib/safe-url";
import { viewerState, type OwnClaim } from "@/lib/viewer-state";
import FoundersBoard, { type FounderRow } from "@/components/FoundersBoard";
import NonLiveArtist, { type ArtistStatusRow } from "@/components/NonLiveArtist";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("artists").select("name").eq("slug", slug).maybeSingle();
  if (data?.name) return { title: data.name };
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return { title: "Artist" };
  const { data: st } = await supabase.rpc("public_artist_status", { p_slug: slug });
  const first = (Array.isArray(st) ? st[0] : st) as ArtistStatusRow | undefined;
  return { title: first?.name ?? "Artist" };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  // RLS only returns live artists; public_artist_status describes the others (pending, under review, removed).
  const { data: artist } = await supabase
    .from("artists")
    .select("id,name,slug,status,verified_at,next_claim_number,claims_frozen,donation_url,record_style")
    .eq("slug", slug)
    .maybeSingle();
  if (!artist) {
    if (!/^[a-z0-9-]{1,100}$/.test(slug)) notFound();
    const { data: st } = await supabase.rpc("public_artist_status", { p_slug: slug });
    const row = (Array.isArray(st) ? st[0] : st) as ArtistStatusRow | undefined;
    if (row) return <NonLiveArtist row={row} />;
    return (
      <main className="narrow">
        <h1>Not live yet</h1>
        <p>This Artist page doesn&apos;t exist or isn&apos;t live yet. A page goes live once 3 Scouts have submitted it.</p>
      </main>
    );
  }
  const { data: link } = await supabase
    .from("artist_links").select("url").eq("artist_id", artist.id).eq("is_primary", true).maybeSingle();
  // Own watchlist row only (RLS); null means not signed in or not watching.
  const { data: auth } = await supabase.auth.getUser();
  const { data: watch } = auth.user
    ? await supabase.from("watchlist").select("named_to_artist").eq("user_id", auth.user.id).eq("artist_id", artist.id).maybeSingle()
    : { data: null };
  const { data: songs } = await supabase
    .from("top_songs").select("position,title,url").eq("artist_id", artist.id).order("position");
  const { data: founders } = await supabase.rpc("artist_founders", { p_artist: artist.id });
  // Only the verified owner gets a row back; everyone else gets none, so existence is never revealed.
  const { data: ownedRows } = auth.user ? await supabase.rpc("my_owned_artist", { p_slug: slug }) : { data: null };
  const isOwner = Array.isArray(ownedRows) ? ownedRows.length > 0 : Boolean(ownedRows);
  // Own rows only (RLS). Used for presentation; the server still enforces every claim rule.
  let myClaims: OwnClaim[] = [];
  let slots: number | null = null;
  if (auth.user) {
    const { data: cl } = await supabase.from("claims").select("artist_id,claim_number,visibility,status,dropped_at").eq("user_id", auth.user.id);
    myClaims = (cl ?? []) as OwnClaim[];
    const { data: prof } = await supabase.from("profiles").select("slots_unlocked").eq("id", auth.user.id).maybeSingle();
    slots = typeof prof?.slots_unlocked === "number" ? prof.slots_unlocked : null;
  }
  const vs = viewerState({
    artistId: artist.id, signedIn: Boolean(auth.user), isOwner, claims: myClaims, slots,
    frozen: Boolean(artist.claims_frozen), disputed: artist.status === "disputed",
  });
  return (
    <main className="narrow">
      <ArtistHeader artist={artist} sourceUrl={link?.url ?? null} />
      {isOwner && (
        <p className="owner-bar">
          <Link className="btn" href={`/artist/${artist.slug}/manage`}>Manage this page</Link>{" "}
          <span>Add or edit your Top Songs, donation link and record style.</span>
        </p>
      )}
      <section className="claim-actions">
        {vs.kind === "holder" && (
          <div className="claim-held">
            <p role="status" className="claim-success">You are Claim #{vs.number}.</p>
            <p className="claim-note">Your choice: {vs.visibilityLabel}. <Link href="/roster">See it on your Roster</Link></p>
          </div>
        )}
        {vs.kind === "disputed" && <p role="note" className="state-note">This page is under review. New claims are paused.</p>}
        {vs.kind === "frozen" && <p role="note" className="state-note">New claims are frozen by the artist. Existing claim numbers stay in place.</p>}
        {vs.kind === "owner" && <p role="note" className="state-note">You run this page, so it has no Claim button for you.</p>}
        {vs.kind === "cooldown" && <p role="note" className="state-note">You can claim this artist again on {vs.until}.</p>}
        {vs.kind === "roster_full" && <p role="note" className="state-note">Your Roster is full. Drop a claim to make room, then come back.</p>}
        {vs.kind === "signed_out" && (
          <div>
            <Link href="/login" className="btn btn-primary">Sign in to claim</Link>
            <p className="claim-note">Claim as #{artist.next_claim_number} once you are signed in.</p>
          </div>
        )}
        {vs.kind === "can_claim" && <ClaimButton artistId={artist.id} artistName={artist.name} nextNumber={artist.next_claim_number} />}
      </section>
      {artist.status !== "disputed" && (
        <section className="claim-actions">
          <WatchButton artistId={artist.id} artistName={artist.name} initialNamed={watch ? watch.named_to_artist === true : null} />
        </section>
      )}
      {((songs && songs.length > 0) || isOwner) && (
        <section aria-labelledby="top-songs-h" className="panel">
          <h2 id="top-songs-h">Top Songs</h2>
          {isOwner && <p><Link href={`/artist/${artist.slug}/manage`}>{songs && songs.length > 0 ? "Edit your songs" : "Add your songs"}</Link></p>}
          <ol className="song-list">
            {(songs ?? []).map((s) => (
              <li key={s.position}>
                {isHttpsUrl(s.url)
                  ? <><a href={withClaimedFirstTag(s.url)} target="_blank" rel="noopener noreferrer">{s.title}</a><span className="link-host"> ({linkHost(s.url)})</span></>
                  : s.title}
              </li>
            ))}
          </ol>
        </section>
      )}
      {isHttpsUrl(artist.donation_url) && (
        <p>
          <a className="btn secondary" href={artist.donation_url} target="_blank" rel="noopener noreferrer">Support {artist.name}</a>{" "}
          <span className="link-host">({linkHost(artist.donation_url)})</span>
        </p>
      )}
      <FoundersBoard rows={(founders ?? []) as FounderRow[]} />
      {auth.user && (
        <section className="section-gap">
          <ReportButton artistId={artist.id} />
        </section>
      )}
    </main>
  );
}
