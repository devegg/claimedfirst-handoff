import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pageWindow, PAGE_SIZE } from "@/lib/pagination";
import { parseSearch, orFilter } from "@/lib/artist-search";
import ArtistCard from "@/components/ArtistCard";
import ReportButton from "@/components/ReportButton";

export const metadata = { title: "Discover" };

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const SHOWS = ["all", "verified", "fan", "needs"] as const;
type Show = (typeof SHOWS)[number];
const SHOW_LABEL: Record<Show, string> = { all: "All", verified: "Verified", fan: "Fan-created", needs: "Needs scouts" };

function href(sort: string, page: number, term?: string, show: Show = "all") {
  const sp = new URLSearchParams();
  if (term) sp.set("q", term);
  if (show !== "all") sp.set("show", show);
  if (sort === "claimed") sp.set("sort", "claimed");
  if (page > 1) sp.set("page", String(page));
  const q = sp.toString();
  return q ? `/discover?${q}` : "/discover";
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const showParam = first(params.show);
  const show: Show = (SHOWS as readonly string[]).includes(showParam ?? "") ? (showParam as Show) : "all";
  const sort = first(params.sort) === "claimed" ? "claimed" : "new";
  const rawPage = first(params.page);
  const wanted = rawPage === undefined || rawPage.trim() === "" ? 1 : Number(rawPage);
  const search = parseSearch(params.q);
  const searching = search.kind === "text" || search.kind === "link";
  const term = searching ? search.q : "";
  const supabase = await createClient();

  // A pasted public link resolves to an existing live artist through its canonical key (live artists' links are public).
  let linkIds: string[] = [];
  if (search.kind === "link") {
    const { data: l } = await supabase.from("artist_links").select("artist_id").eq("canonical_key", search.key);
    linkIds = ((l ?? []) as { artist_id: string }[]).map((r) => r.artist_id);
  }
  // Both queries filter the same way; a link with no match uses an impossible id so nothing is returned.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const narrow = (qb: any) => {
    if (show === "verified") qb = qb.not("verified_at", "is", null);
    if (show === "fan") qb = qb.is("verified_at", null);
    if (search.kind === "text") return qb.or(orFilter(search.terms));
    if (search.kind === "link") return qb.in("id", linkIds.length ? linkIds : ["00000000-0000-0000-0000-000000000000"]);
    return qb;
  };

  // RLS exposes live artists to everyone; count first so the page can be clamped.
  const needsOnly = show === "needs";
  const { count } = needsOnly ? { count: 0 } : await narrow(supabase.from("artists").select("id", { count: "exact", head: true }).eq("status", "live"));
  const w = pageWindow(wanted, count ?? 0);
  let q = supabase.from("artists").select("id,name,slug,verified_at,next_claim_number,record_style").eq("status", "live");
  q = narrow(q);
  q = sort === "claimed" ? q.order("next_claim_number", { ascending: false }) : q;
  const { data: artists } = needsOnly ? { data: [] } : await q
    .order("created_at", { ascending: false }).order("id")
    .range(w.from, w.from + PAGE_SIZE - 1);
  // Only signed-in scouts get the Report control; anonymous visitors do not see it.
  const { data: auth } = await supabase.auth.getUser();
  const signedIn = !!auth?.user;
  const wantPending = show === "all" ? !searching : show === "needs";
  const { data: pending } = wantPending ? await supabase.rpc("pending_artists_public", { p_limit: needsOnly ? 50 : 20 }) : { data: [] };

  const list = artists ?? [];
  let pend = (pending ?? []) as { id: string; name: string; slug: string; scouts_submitted: number; needed?: number }[];
  if (needsOnly && searching) pend = pend.filter((p) => (p.name + " " + p.slug).toLowerCase().includes(term.toLowerCase()));
  const pills = (
    <nav aria-label="Filter" className="pills">
      {SHOWS.map((k) => k === show
        ? <span key={k} aria-current="true">{SHOW_LABEL[k]}</span>
        : <Link key={k} href={href(sort, 1, term, k)}>{SHOW_LABEL[k]}</Link>)}
    </nav>
  );
  const pendingCards = (
    <ul className="cards list-reset">
      {pend.map((p) => {
        const needed = p.needed ?? 3;
        const have = Math.min(p.scouts_submitted, needed);
        const slug = encodeURIComponent(p.slug);
        return (
          <li key={p.id} className="panel artist-card">
            <div className="artist-card-body">
              <h3><Link href={`/artist/${slug}`} title={p.name}>{p.name}</Link></h3>
              <p><span className="badge">Needs scouts</span></p>
              <p className="scout-progress">{have} of {needed} scouts</p>
              <p>
                <Link href={`/artist/${slug}`} className="btn secondary">Add my support</Link>
                {signedIn && <> <ReportButton artistId={p.id} artistName={p.name} compact /></>}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
  const emptyLive = list.length === 0 && !needsOnly;
  return (
    <main>
      <div className="page-head">
        <p className="eyebrow">Listening room</p>
        <h1>Discover</h1>
        <p className="lede">Find an artist early and keep your number.</p>
      </div>
      <form action="/discover" method="get" role="search" id="search" className="panel search-form">
        <label htmlFor="q">Find an artist</label>
        <p className="card-note">Search by name, Suno or YouTube handle, or paste a link to the artist&apos;s public page.</p>
        <div className="search-row">
          <input id="q" name="q" type="search" maxLength={200} defaultValue={search.kind === "none" ? "" : search.q} autoComplete="off" />
          {sort === "claimed" && <input type="hidden" name="sort" value="claimed" />}
          {show !== "all" && <input type="hidden" name="show" value={show} />}
          <button type="submit" className="btn-primary">Search</button>
        </div>
        {search.kind === "short" && <p role="status">Type at least 2 characters to search.</p>}
      </form>
      {pills}
      {needsOnly ? (
        <section aria-labelledby="pending-h">
          <h2 id="pending-h">Needs scouts</h2>
          <p>An artist goes live once 3 scouts have added it. A verified artist counts as 2.</p>
          {pend.length === 0 ? (
            <div className="panel" role="status">
              <p>{searching ? `No page that needs scouts matches ${term}.` : "No pages need scouts right now."}</p>
              <p><Link href="/submit" className="btn">Add an artist</Link></p>
            </div>
          ) : pendingCards}
          {pend.length > 0 && <p><Link href="/submit" className="btn secondary">Add an artist</Link></p>}
        </section>
      ) : searching && emptyLive ? (
        <div className="panel" role="status">
          <p>No artist found for {term}.</p>
          <p><Link href={`/submit?name=${encodeURIComponent(term.slice(0, 80))}`} className="btn">Add an artist</Link></p>
        </div>
      ) : emptyLive ? (
        <div className="panel">
          <p>{show === "all" ? "No artists are live yet. Be the first to put one on the map." : `No ${SHOW_LABEL[show].toLowerCase()} pages are live yet.`}</p>
          <p><Link href="/submit" className="btn">Add an artist</Link></p>
        </div>
      ) : (
        <section aria-labelledby="live-h">
          <h2 id="live-h">{searching ? `Results for ${term}` : show === "verified" ? "Verified artists" : show === "fan" ? "Fan-created pages" : "Live artists"}</h2>
          <nav aria-label="Sort" className="pager">
            {sort === "new" ? <span aria-current="true">Newest</span> : <Link href={href("new", 1, term, show)}>Newest</Link>}
            {sort === "claimed" ? <span aria-current="true">Most claimed</span> : <Link href={href("claimed", 1, term, show)}>Most claimed</Link>}
          </nav>
          <ul className="cards list-reset">
            {list.map((a) => <ArtistCard key={a.id} artist={a} />)}
          </ul>
          <nav aria-label="Pages" className="pager">
            {w.hasPrev ? <Link href={href(sort, w.page - 1, term, show)}>Previous</Link> : <span aria-disabled="true">Previous</span>}
            <span>Page {w.page} of {w.pageCount}</span>
            {w.hasNext ? <Link href={href(sort, w.page + 1, term, show)}>Next</Link> : <span aria-disabled="true">Next</span>}
          </nav>
        </section>
      )}
      {show === "all" && pend.length > 0 && (
        <section aria-labelledby="pending-h" className="panel-spaced">
          <h2 id="pending-h">Needs scouts</h2>
          <p>An artist goes live once 3 scouts have added it. A verified artist counts as 2.</p>
          {pendingCards}
          <p>
            <Link href={href(sort, 1, term, "needs")} className="btn secondary">See all that need scouts</Link>{" "}
            <Link href="/submit" className="btn secondary">Add an artist</Link>
          </p>
        </section>
      )}
    </main>
  );
}
