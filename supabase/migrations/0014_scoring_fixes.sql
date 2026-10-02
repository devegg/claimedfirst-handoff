-- R26 fixes to scoring (0007 is left untouched).

-- multiplier_for rejects numbers below 1
create or replace function multiplier_for(n int) returns int
language plpgsql immutable security definer set search_path = public, pg_temp as $$
begin
  if n is null or n < 1 then raise exception 'invalid_claim_number'; end if;
  return case when n <= 10 then 5 when n <= 50 then 3 when n <= 200 then 2 else 1 end;
end $$;

-- qualified claimers on an artist at time p_at, leaving out every claim row of one scout (own growth is not growth)
create or replace function qualified_claimers_excluding(p_artist uuid, p_at timestamptz, p_user uuid)
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int from claims c join profiles p on p.id = c.user_id
  where c.artist_id = p_artist and c.claimed_at <= p_at and p.created_at + interval '7 days' <= p_at
    and c.user_id <> p_user
$$;
revoke execute on function qualified_claimers_excluding(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function qualified_claimers_excluding(uuid, timestamptz, uuid) to service_role;

-- A claim counts for season [v_start, v_end) when it was made before the season ended and not dropped before it
-- ended. For the current season (v_end in the future) a mid-season drop therefore never counts; for a past season
-- a claim dropped after the season ended still does. Growth stops at v_end.
create or replace function refresh_season_scores(p_start timestamptz) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_season date := date_trunc('month', p_start at time zone 'utc')::date;
  v_start timestamptz := v_season::timestamp at time zone 'utc';
  v_season_end timestamptz := (v_season + interval '1 month')::timestamp at time zone 'utc';
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
  insert into season_claim_points(season, user_id, claim_id, points)
   select v_season, c.user_id, c.id,
          (greatest(0, qualified_claimers_excluding(c.artist_id, v_end, c.user_id)
                     - qualified_claimers_excluding(c.artist_id, greatest(c.claimed_at, v_start), c.user_id))
           * multiplier_for(c.claim_number))::int
   from claims c
   where c.claimed_at < v_end and (c.dropped_at is null or c.dropped_at >= v_end);
  insert into season_scores(season, user_id, points, league)
   select v_season, e.user_id, coalesce(sum(k.points), 0)::int, e.league
   from season_entrants e left join season_claim_points k on k.season = e.season and k.user_id = e.user_id
   where e.season = v_season group by e.user_id, e.league
   on conflict (season, user_id) do update set points = excluded.points, league = excluded.league;
  -- ranks are computed over all entrants (zero scorers rank below everyone with points), so the
  -- points > 0 board in season_board shows the same ranks as ranking the filtered set would
  update season_scores s set rank = r.rk from (
    select user_id, rank() over (partition by league order by points desc) rk
    from season_scores where season = v_season) r
   where s.season = v_season and s.user_id = r.user_id;
end $$;

create or replace function season_board(p_season date default null, p_league int default 1, p_limit int default 100)
returns table(rank int, handle text, points int, league int)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.rank, p.handle, s.points, s.league
  from season_scores s join profiles p on p.id = s.user_id
  where s.season = coalesce(p_season, current_season()) and s.league = coalesce(p_league, 1) and s.points > 0
  order by s.rank, p.handle
  limit least(greatest(coalesce(p_limit, 100), 0), 100)
$$;
