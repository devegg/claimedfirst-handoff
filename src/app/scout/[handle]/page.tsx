import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatBoardDate, boardRowState, boardVisibilityLabel, BOARD_EMPTY_TEXT, BOARD_NOTE, type BoardClaimFlags } from "@/lib/boards";
import { PROVISIONAL_TIP } from "@/lib/info-copy";
import InfoTip from "@/components/InfoTip";
import HelpTip from "@/components/HelpTip";

type Row = { artist_name: string; slug: string; claim_number: number; claimed_at: string; visibility: string } & BoardClaimFlags;

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  let clean = "";
  try { clean = decodeURIComponent(handle).toLowerCase(); } catch { return { title: "Scout" }; }
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) return { title: "Scout" };
  const supabase = await createClient();
  const { data } = await supabase.from("public_profiles").select("handle").eq("handle", clean).maybeSingle();
  return { title: data?.handle ?? "Scout" };
}

export default async function ScoutPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  let clean: string;
  try { clean = decodeURIComponent(handle).toLowerCase(); } catch { notFound(); }
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) notFound();
  const supabase = await createClient();
  const { data: scout } = await supabase
    .from("public_profiles").select("id,handle,founding_scout").eq("handle", clean).maybeSingle();
  if (!scout) notFound();
  const { data: auth } = await supabase.auth.getUser();
  const isOwner = auth.user?.id === scout.id;
  const { data } = await supabase.rpc("scout_historical", { p_user: scout.id });
  const rows = (data ?? []) as Row[];
  return (
    <main className="narrow">
      <div className="scout-head">
        <h1>{scout.handle}</h1>
        {scout.founding_scout && (
          <span className="original-scout">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/original-scout.svg" width={96} height={96} alt="Original Scout" />
          </span>
        )}
      </div>
      <section aria-labelledby="hist100-h" className="panel">
        <h2 id="hist100-h">Historical 100 <HelpTip id="historical-100" /></h2>
        {rows.length === 0 ? <p>{BOARD_EMPTY_TEXT}</p> : (
          <ol className="founders">
            {rows.map((r) => {
              const st = boardRowState(r);
              const cls = st.kind === "provisional" ? "board-row row-provisional" : st.kind === "dropped_early" ? "board-row row-dropped-early" : "board-row";
              return (
                <li key={`${r.slug}-${r.claim_number}`} className={cls}>
                  <Link href={`/artist/${r.slug}`}>{r.artist_name}</Link> <span className="board-num">#{r.claim_number}</span>
                  {st.kind === "historical" && <> <small className="badge">{st.text}</small></>}
                  {(st.kind === "provisional" || st.kind === "dropped_early") && <> <small className="board-meta">{st.kind === "provisional" ? "Provisional, " : ""}{st.text}</small></>}
                  {" "}<small className="board-meta">{formatBoardDate(r.claimed_at)}</small>
                  {isOwner && <> <small className="board-meta">Who sees your name: {boardVisibilityLabel(r.visibility)}</small></>}
                </li>
              );
            })}
          </ol>
        )}
        <div className="hold-note">{BOARD_NOTE}<InfoTip text={PROVISIONAL_TIP} label="What is a provisional claim?" guide="hold-14" /></div>
      </section>
    </main>
  );
}
