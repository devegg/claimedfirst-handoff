import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { leagueName, parseLeagueParam } from "@/lib/leagues";
import HelpTip from "@/components/HelpTip";
import InfoTip from "@/components/InfoTip";
import { growthDaysLeft } from "@/lib/scoring";
import { POINTS_TIP, AT_RISK_TIP } from "@/lib/info-copy";

export const metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

type BoardRow = { rank: number; handle: string; points: number; league: number; at_risk_points?: number | null };
type Standing = { rank: number; points: number; league: number; at_risk_points?: number | null };

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { league: leagueParam } = await searchParams;

  const { data: countData } = await supabase.rpc("season_league_count", { p_season: null });
  const leagueCount = Math.max(1, Number(countData) || 1);

  const { data: auth } = await supabase.auth.getUser();
  let mine: Standing | null = null;
  let myHandle: string | null = null;
  let growthInDays = 0;
  if (auth.user) {
    const { data: me } = await supabase.from("profiles").select("created_at").eq("id", auth.user.id).maybeSingle();
    growthInDays = growthDaysLeft(me?.created_at);
    const { data: s } = await supabase.rpc("my_season_standing");
    mine = ((s ?? []) as Standing[])[0] ?? null;
  }
  // With several leagues, open on the viewer's own league; bad ?league values fall back to it (or 1).
  const league = leagueCount > 1 ? parseLeagueParam(leagueParam, leagueCount, mine?.league ?? 1) : 1;

  const { data } = await supabase.rpc("season_board", { p_season: null, p_league: league, p_limit: 100 });
  const rows = (data ?? []) as BoardRow[];

  if (auth.user) {
    if (mine) {
      const { data: p } = await supabase.from("public_profiles").select("handle").eq("id", auth.user.id).maybeSingle();
      myHandle = p?.handle ?? null;
    }
  }
  // If the handle lookup fails, show the standing row rather than hide it.
  // A score of 0 is not a standing: rank 1 with no points would read as earned.
  const viewerHasNoPoints = Boolean(auth.user) && (!mine || mine.points <= 0);
  const inTop = myHandle ? rows.some((r) => r.handle === myHandle) : false;

  return (
    <main className="narrow">
      <h1>Leaderboard <HelpTip id="season-board" /></h1>
      <p>This season&apos;s scouts, ranked by points. <HelpTip id="points" /></p>

      {leagueCount > 1 && (
        <nav aria-label="Leagues" className="league-nav">
          <HelpTip id="leagues" />
          {Array.from({ length: leagueCount }, (_, i) => {
            const n = i + 1;
            const name = leagueName(i, leagueCount);
            return n === league ? (
              <strong key={n} aria-current="page">{name}</strong>
            ) : (
              <Link key={n} href={`/leaderboard?league=${n}`}>{name}</Link>
            );
          })}
        </nav>
      )}

      {rows.length === 0 ? (
        viewerHasNoPoints ? null : <p>No points yet this season.</p>
      ) : (
        <>
          <div className="board-head" aria-hidden="false">
            <span className="grow" />
            <span className="col-num">Total points<InfoTip text={POINTS_TIP} label="About total points" guide="base-point" /></span>
            <span className="col-num">At risk<InfoTip text={AT_RISK_TIP} label="About at risk points" guide="at-risk" /></span>
          </div>
          <ol className="list panel board">
            {rows.map((r) => (
              <li key={r.handle} className="points-row">
                <span className="serif rank">{r.rank}</span>
                <Link href={`/scout/${r.handle}`} className="grow">{r.handle}</Link>
                <span className="num" aria-label={`${r.points} total points`}>{r.points}</span>
                <span className="num" aria-label={`${r.at_risk_points ?? 0} at risk`}>{r.at_risk_points ?? 0}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {viewerHasNoPoints && (
        <div aria-label="Your standing" className="notice">
          No points yet this season. Your standing appears once you have points.
        </div>
      )}
      {mine && mine.points > 0 && mine.league === league && !inTop && (
        <div aria-label="Your standing" className="notice">
          Your standing: rank {mine.rank}, {mine.points} total points, {mine.at_risk_points ?? 0} at risk
          <InfoTip text={AT_RISK_TIP} label="About at risk points" guide="at-risk" />
          {myHandle && <> (<Link href={`/scout/${myHandle}`}>{myHandle}</Link>)</>}
        </div>
      )}
      {auth.user && growthInDays > 0 && (
        <div className="notice">Growth points start in {growthInDays} {growthInDays === 1 ? "day" : "days"}. <InfoTip text={POINTS_TIP} label="About total points" guide="base-point" /></div>
      )}

      <section aria-labelledby="how-h" className="panel panel-spaced">
        <h2 id="how-h" className="flush-top">How points work <HelpTip id="points" /></h2>
        <p>Each claim earns points for every new qualified claimer on that artist since you claimed them (or since the season began), times a bonus for how early you were.</p>
        <p>A qualified claimer is a different scout who has claimed that artist and whose account is at least 3 days old.</p>
        <p>The bonus depends on your claim number, as listed here. A season is one month.</p>
        <ul>
          <li>Claims 1 to 10: 5x</li>
          <li>Claims 11 to 50: 3x</li>
          <li>Claims 51 to 200: 2x</li>
          <li>Claims 201 and up: 1x</li>
        </ul>
        <p>Every claim you hold also earns 1 point on its own, so you appear on the board right away. Growth points start when your account is 3 days old.</p>
        <p>At risk shows points from claims under 14 days old. Dropping any claim this season removes its points, so these are the ones most likely to go.</p>
        <p>Only claims you currently hold earn points.</p>
        <p>Seasons run monthly and then reset. Claim numbers and history never reset.</p>
        <p>Recognition only. No prizes.</p>
      </section>
    </main>
  );
}
