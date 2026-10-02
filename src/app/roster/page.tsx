import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pageWindow, PAGE_SIZE } from "@/lib/pagination";
import { RosterSlots } from "@/components/RosterSlots";
import DropButton from "@/components/DropButton";
import UnwatchButton from "@/components/UnwatchButton";
import ShareAction from "@/components/ShareAction";
import { highestMilestone, shareVisibility } from "@/lib/share";
import { resolveRecordStyle } from "@/lib/record-styles";
import PrivacyButton from "@/components/PrivacyButton";
import { claimVisibilityOrAnonymous, claimLevelLabel, watchLevelFromNamed, watchLevelLabel } from "@/lib/visibility";
import HelpTip from "@/components/HelpTip";
import FriendsAndSlots, { type ReferralRow } from "@/components/FriendsAndSlots";
import { SITE_URL } from "@/lib/share";
import { claimUnlockIso } from "@/lib/claim-errors";

type Params = Record<string, string | string[] | undefined>;
const KEYS = ["active", "historical", "watch"] as const;
type Key = (typeof KEYS)[number];

function rawPage(params: Params, key: Key): number {
  const v = params[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s === undefined || s.trim() === "" ? 1 : Number(s);
}

function hrefWith(params: Params, key: Key, page: number): string {
  const sp = new URLSearchParams();
  for (const k of KEYS) {
    if (k === key) sp.set(k, String(page));
    else {
      const v = params[k];
      const s = Array.isArray(v) ? v[0] : v;
      if (s !== undefined) sp.set(k, s);
    }
  }
  return `/roster?${sp.toString()}`;
}

/** Unlock time while a claim is still inside its 72 hour lock; null once it can be dropped. The server still enforces it. */
function lockedUntil(claimedAt: string | null): string | null {
  const iso = claimUnlockIso(claimedAt);
  return iso && Date.parse(iso) > Date.now() ? iso : null;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

function Pager({ params, k, w }: { params: Params; k: Key; w: ReturnType<typeof pageWindow> }) {
  return (
    <nav aria-label="Pages" className="pager">
      {w.hasPrev ? <Link href={hrefWith(params, k, w.page - 1)}>Previous</Link> : <span aria-disabled="true">Previous</span>}
      <span>Page {w.page} of {w.pageCount}</span>
      {w.hasNext ? <Link href={hrefWith(params, k, w.page + 1)}>Next</Link> : <span aria-disabled="true">Next</span>}
    </nav>
  );
}

export const metadata = { title: "Your roster" };

export default async function RosterPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("slots_unlocked,handle,referral_code").eq("id", user.id).maybeSingle();
  const unlocked = profile?.slots_unlocked ?? 5;
  const handle = profile?.handle ?? null;
  const referralCode = profile?.referral_code ?? null;

  const { data: refData } = await supabase.rpc("my_referral_progress");
  const referral = (Array.isArray(refData) ? refData : []) as ReferralRow[];
  const inviteLink = referralCode && /^[A-Za-z0-9]{1,16}$/.test(referralCode) ? `${SITE_URL}/?ref=${referralCode}` : null;

  const count = async (table: "claims" | "watchlist", status?: "active" | "historical") => {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (status) q = q.eq("status", status);
    const { count: c } = await q;
    return c ?? 0;
  };
  const [activeTotal, historicalTotal, watchTotal] = await Promise.all([
    count("claims", "active"), count("claims", "historical"), count("watchlist"),
  ]);
  const wa = pageWindow(rawPage(params, "active"), activeTotal);
  const wh = pageWindow(rawPage(params, "historical"), historicalTotal);
  const ww = pageWindow(rawPage(params, "watch"), watchTotal);

  const claimCols = "id,artist_id,claim_number,claimed_at,dropped_at,visibility";
  const [activeRes, histRes, watchRes] = await Promise.all([
    supabase.from("claims").select(claimCols).eq("status", "active")
      .order("claimed_at", { ascending: false }).order("id").range(wa.from, wa.from + PAGE_SIZE - 1),
    supabase.from("claims").select(claimCols).eq("status", "historical")
      .order("dropped_at", { ascending: false }).order("id").range(wh.from, wh.from + PAGE_SIZE - 1),
    supabase.from("watchlist").select("artist_id,created_at,named_to_artist")
      .order("created_at", { ascending: false }).order("artist_id").range(ww.from, ww.from + PAGE_SIZE - 1),
  ]);
  const active = activeRes.data ?? [];
  const historical = histRes.data ?? [];
  const watching = watchRes.data ?? [];

  // Artists that are no longer live are hidden by RLS, so they simply do not come back here.
  const ids = [...new Set([...active, ...historical].map((c) => c.artist_id).concat(watching.map((w) => w.artist_id)))];
  const { data: artistRows } = ids.length
    ? await supabase.from("artists").select("id,name,slug,next_claim_number,record_style").in("id", ids)
    : { data: [] };
  const artists = new Map((artistRows ?? []).map((a) => [a.id, a]));
  const nameOf = (id: string) => {
    const a = artists.get(id);
    return a ? <Link href={`/artist/${a.slug}`}>{a.name}</Link> : <span>Artist unavailable</span>;
  };

  const claimLevel = (v: unknown) => claimLevelLabel(claimVisibilityOrAnonymous(v));

  return (
    <main className="narrow">
      <h1>Your Roster <HelpTip id="roster" /></h1>
      <p className="row-actions"><Link href="/settings" className="btn secondary">Settings</Link>
      {handle && <Link href={`/scout/${handle}`} className="btn secondary">Your public page</Link>}</p>
      <div className="panel">
      <RosterSlots used={activeTotal} unlocked={unlocked} />
      <p>{activeTotal} of {unlocked} slots in use <HelpTip id="slot" /></p>
      <p className="dim">Each active artist uses one slot.</p>
      </div>
      <FriendsAndSlots rows={referral} inviteLink={inviteLink} />

      <section aria-labelledby="active-h">
        <h2 id="active-h">Active claims</h2>
        {active.length === 0 ? (
          <div className="empty-state">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/empty-record-sleeve.svg" width={160} height={120} alt="" />
            <p>No active claims.</p>
          </div>
        ) : (
          <ul className="list panel roster-list">
            {active.map((c) => (
              <li key={c.id}>
                {nameOf(c.artist_id)}, Claim #{c.claim_number}, claimed {fmt(c.claimed_at)}{" "}
                <small>Who sees your name: {claimLevel(c.visibility)}</small>{" "}
                <PrivacyButton kind="claim" claimId={c.id} artistName={artists.get(c.artist_id)?.name ?? "this Artist"} current={claimVisibilityOrAnonymous(c.visibility)} /><HelpTip id="privacy" />{" "}
                {(() => {
                  const a = artists.get(c.artist_id);
                  if (!a || !handle) return null;
                  const vis = shareVisibility(c.visibility);
                  const ms = highestMilestone((a.next_claim_number ?? 1) - 1);
                  const common = { artistName: a.name, slug: a.slug, claimNumber: c.claim_number, handle, visibility: vis, referralCode, date: fmt(c.claimed_at), style: resolveRecordStyle(a.record_style, a.slug) };
                  return (
                    <>
                      <ShareAction mode="claim" {...common} />{" "}
                      {ms && <ShareAction mode="milestone" milestone={ms} {...common} />}{" "}
                    </>
                  );
                })()}
                <DropButton claimId={c.id} artistName={artists.get(c.artist_id)?.name ?? "this Artist"} lockedUntil={lockedUntil(c.claimed_at)} />
              </li>
            ))}
          </ul>
        )}
        <Pager params={params} k="active" w={wa} />
      </section>

      <section aria-labelledby="hist-h">
        <h2 id="hist-h">Historical claims <HelpTip id="historical-claim" /></h2>
        {historical.length === 0 ? <p>No historical claims.</p> : (
          <ul className="list panel roster-list">
            {historical.map((c) => (
              <li key={c.id}>
                {nameOf(c.artist_id)}, Claim #{c.claim_number}, Historical claim, claimed {fmt(c.claimed_at)}, dropped {fmt(c.dropped_at)}, Who sees your name: {claimLevel(c.visibility)}
              </li>
            ))}
          </ul>
        )}
        <Pager params={params} k="historical" w={wh} />
      </section>

      <section aria-labelledby="watch-h">
        <h2 id="watch-h">Watchlist <HelpTip id="watchlist" /></h2>
        {watching.length === 0 ? <p>Nothing on your watchlist.</p> : (
          <ul className="list panel roster-list">
            {watching.map((w) => (
              <li key={w.artist_id}>
                {nameOf(w.artist_id)}{" "}
                <small>{watchLevelLabel(watchLevelFromNamed(w.named_to_artist))}</small>{" "}
                <PrivacyButton kind="watch" artistId={w.artist_id} artistName={artists.get(w.artist_id)?.name ?? "this Artist"} current={watchLevelFromNamed(w.named_to_artist)} /><HelpTip id="privacy" />{" "}
                <UnwatchButton artistId={w.artist_id} /></li>
            ))}
          </ul>
        )}
        <Pager params={params} k="watch" w={ww} />
      </section>
    </main>
  );
}
