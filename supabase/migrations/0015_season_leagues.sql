-- Task 11b: how many leagues a season has, without exposing the slot boundaries.
create or replace function season_league_count(p_season date default null) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select coalesce(array_length(s.boundaries, 1), 0) + 1 from seasons s
                    where s.season = coalesce(p_season, current_season())), 1)
$$;
revoke execute on function season_league_count(date) from public;
grant execute on function season_league_count(date) to anon, authenticated, service_role;
