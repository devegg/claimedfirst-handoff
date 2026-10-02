-- Task 11: scoring, season leaderboard. Seasons are calendar months (UTC).

-- pure helpers (mirrors src/lib/scoring.ts)
create or replace function multiplier_for(n int) returns int
language sql immutable security definer set search_path = public, pg_temp as $$
  select case when n <= 10 then 5 when n <= 50 then 3 when n <= 200 then 2 else 1 end
$$;

create or replace function league_for(p_slots int, p_bounds int[]) returns int
language sql immutable security definer set search_path = public, pg_temp as $$
  select 1 + (select count(*) from unnest(p_bounds) b where p_slots > b)::int
$$;

create or replace function current_season() returns date
language sql stable security definer set search_path = public, pg_temp as $$
  select date_trunc('month', now() at time zone 'utc')::date
$$;

-- league settings: the row with the highest active_from_scouts that is <= the scout count applies
create table league_rules (active_from_scouts int primary key, boundaries int[] not null);
insert into league_rules values (0, '{}');            -- one league (version 1)

create table seasons (season date primary key, boundaries int[] not null);
create table season_entrants (
  season date not null references seasons, user_id uuid not null references profiles on delete cascade,
  slots_at_start int not null, league int not null, primary key (season, user_id)
);
create table season_claim_points (
  season date not null, user_id uuid not null references profiles on delete cascade,
  claim_id uuid not null references claims on delete cascade,
  points int not null, primary key (season, claim_id)
);
create table season_scores (
  season date not null, user_id uuid not null references profiles on delete cascade,
  points int not null default 0, league int not null default 1, rank int,
  primary key (season, user_id)
);
create index season_scores_board on season_scores (season, league, rank);
create index season_claim_points_user on season_claim_points (season, user_id);

-- closed tables: RLS on, no policies; reads go through the security-definer functions below
alter table league_rules enable row level security;
alter table seasons enable row level security;
alter table season_entrants enable row level security;
alter table season_claim_points enable row level security;
alter table season_scores enable row level security;

create or replace function refresh_season_scores(p_start timestamptz) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_season date := date_trunc('month', p_start at time zone 'utc')::date;
  v_start timestamptz := v_season::timestamp at time zone 'utc';
  v_end timestamptz;
begin
  -- one refresh at a time
  perform pg_advisory_xact_lock(hashtext('refresh_season_scores'));
  -- a past season stops growing at its end
  v_end := least(now(), v_start + interval '1 month');

  -- the league structure and each scout's league are fixed the first time the season is refreshed
  insert into seasons(season, boundaries)
   select v_season, coalesce((select boundaries from league_rules
                               where active_from_scouts <= (select count(distinct user_id) from claims)
                               order by active_from_scouts desc limit 1), '{}')
   on conflict do nothing;
  insert into season_entrants(season, user_id, slots_at_start, league)
   select v_season, p.id, p.slots_unlocked,
          league_for(p.slots_unlocked, (select boundaries from seasons where season = v_season))
   from profiles p
   where exists (select 1 from claims c where c.user_id = p.id and c.status = 'active')
   on conflict do nothing;

  -- points per claim (only active claims earn), then totals
  delete from season_claim_points where season = v_season;
  insert into season_claim_points(season, user_id, claim_id, points)
   select v_season, c.user_id, c.id,
          (greatest(0, qualified_claimers(c.artist_id, v_end) - qualified_claimers(c.artist_id, greatest(c.claimed_at, v_start)))
           * multiplier_for(c.claim_number))::int
   from claims c where c.status = 'active';
  insert into season_scores(season, user_id, points, league)
   select v_season, e.user_id, coalesce(sum(k.points), 0)::int, e.league
   from season_entrants e left join season_claim_points k on k.season = e.season and k.user_id = e.user_id
   where e.season = v_season group by e.user_id, e.league
   on conflict (season, user_id) do update set points = excluded.points, league = excluded.league;
  update season_scores s set rank = r.rk from (
    select user_id, rank() over (partition by league order by points desc) rk
    from season_scores where season = v_season) r
   where s.season = v_season and s.user_id = r.user_id;
end $$;

-- nightly slot recompute for everyone who has referred someone
create or replace function recompute_all_slots() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; n int := 0;
begin
  for r in select distinct referrer from referrals loop
    perform recompute_slots(r.referrer);
    n := n + 1;
  end loop;
  return n;
end $$;

-- public leaderboard (R24): handles only, never user ids
create or replace function season_board(p_season date default null, p_league int default 1, p_limit int default 100)
returns table(rank int, handle text, points int, league int)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.rank, p.handle, s.points, s.league
  from season_scores s join profiles p on p.id = s.user_id
  where s.season = coalesce(p_season, current_season()) and s.league = coalesce(p_league, 1)
  order by s.rank, p.handle
  limit least(greatest(coalesce(p_limit, 100), 0), 100)
$$;

create or replace function my_season_standing() returns table(rank int, points int, league int)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.rank, s.points, s.league from season_scores s
  where s.season = current_season() and s.user_id = auth.uid()
$$;

revoke execute on function multiplier_for(int), league_for(int,int[]), refresh_season_scores(timestamptz), recompute_all_slots(),
  season_board(date,int,int), my_season_standing(), current_season() from public, anon, authenticated;
grant execute on function multiplier_for(int), league_for(int,int[]), refresh_season_scores(timestamptz), recompute_all_slots(),
  season_board(date,int,int), my_season_standing(), current_season() to service_role;
grant execute on function season_board(date,int,int), current_season() to anon, authenticated;
grant execute on function my_season_standing() to authenticated;
