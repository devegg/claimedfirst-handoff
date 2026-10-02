-- 0037: 1 base point per active claim (decision 5) and the at-risk figure.
-- Points per claim = growth points (as 0014, using account_min_age via qualified_claimers_excluding) + 1.
-- A claim counts for the season when made before the season ended and not dropped before it ended (as 0014).
-- At risk = points of claims still active and younger than 14 days at the end of the counted window:
-- the points lost if they were dropped early. The base point has no account-age rule.
alter table season_claim_points add column at_risk boolean not null default false;
alter table season_scores add column at_risk_points int not null default 0;

create or replace function refresh_season_scores(p_start timestamptz) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_season date := date_trunc('month', p_start at time zone 'utc')::date;
  v_start timestamptz := v_season::timestamp at time zone 'utc';
  v_end timestamptz := least(now(), (v_season + interval '1 month')::timestamp at time zone 'utc');
begin
  perform pg_advisory_xact_lock(hashtext('refresh_season_scores'));

  insert into seasons(season, boundaries)
   select v_season, coalesce((select boundaries from league_rules
                               where active_from_scouts <= (select count(distinct user_id) from claims)
                               order by active_from_scouts desc limit 1), '{}')
   on conflict do nothing;
  insert into season_entrants(season, user_id, slots_at_start, league)
   select v_season, p.id, p.slots_unlocked,
          league_for(p.slots_unlocked, (select boundaries from seasons where season = v_season))
   from profiles p
   where exists (select 1 from claims c where c.user_id = p.id
                  and c.claimed_at < v_end and (c.dropped_at is null or c.dropped_at >= v_end))
   on conflict do nothing;

  delete from season_claim_points where season = v_season;
  insert into season_claim_points(season, user_id, claim_id, points, at_risk)
   select v_season, c.user_id, c.id,
          (greatest(0, qualified_claimers_excluding(c.artist_id, v_end, c.user_id)
                     - qualified_claimers_excluding(c.artist_id, greatest(c.claimed_at, v_start), c.user_id))
           * multiplier_for(c.claim_number) + 1)::int,
          c.dropped_at is null and c.claimed_at > v_end - interval '14 days'
   from claims c
   where c.claimed_at < v_end and (c.dropped_at is null or c.dropped_at >= v_end);
  insert into season_scores(season, user_id, points, at_risk_points, league)
   select v_season, e.user_id, coalesce(sum(k.points), 0)::int,
          coalesce(sum(k.points) filter (where k.at_risk), 0)::int, e.league
   from season_entrants e left join season_claim_points k on k.season = e.season and k.user_id = e.user_id
   where e.season = v_season group by e.user_id, e.league
   on conflict (season, user_id) do update set points = excluded.points, at_risk_points = excluded.at_risk_points,
                                               league = excluded.league;
  update season_scores s set rank = r.rk from (
    select user_id, rank() over (partition by league order by points desc) rk
    from season_scores where season = v_season) r
   where s.season = v_season and s.user_id = r.user_id;
end $$;

drop function season_board(date, int, int);
create function season_board(p_season date default null, p_league int default 1, p_limit int default 100)
returns table(rank int, handle text, points int, league int, at_risk_points int)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.rank, p.handle, s.points, s.league, s.at_risk_points
  from season_scores s join profiles p on p.id = s.user_id
  where s.season = coalesce(p_season, current_season()) and s.league = coalesce(p_league, 1) and s.points > 0
  order by s.rank, p.handle
  limit least(greatest(coalesce(p_limit, 100), 0), 100)
$$;
revoke execute on function season_board(date,int,int) from public, anon, authenticated;
grant execute on function season_board(date,int,int) to anon, authenticated, service_role;

drop function my_season_standing();
create function my_season_standing() returns table(rank int, points int, league int, at_risk_points int)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.rank, s.points, s.league, s.at_risk_points from season_scores s
  where s.season = current_season() and s.user_id = auth.uid()
$$;
revoke execute on function my_season_standing() from public, anon, authenticated;
grant execute on function my_season_standing() to authenticated, service_role;
