begin;
select plan(43);

-- ---------- fixtures: a finished season (March 2026) with one live artist ----------
-- scouts test_1..test_8 (ids ...00c1 to ...00c8); test_1..7 are old accounts (qualified), test_8 was created 2026-03-14
insert into auth.users(id,email) select format('00000000-0000-0000-0000-0000000000c%s',g)::uuid, 't'||g||'@example.test' from generate_series(1,8) g;
insert into profiles(id,handle,created_at) select format('00000000-0000-0000-0000-0000000000c%s',g)::uuid, 'test_'||g,
  case when g=8 then timestamptz '2026-03-14 00:00+00' else timestamptz '2026-01-01 00:00+00' end from generate_series(1,8) g;
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live');

insert into claims(artist_id,user_id,claim_number,claimed_at,dropped_at,status) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c1',1,   timestamptz '2026-02-10 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c2',2,   timestamptz '2026-02-20 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c3',11,  timestamptz '2026-03-05 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c4',51,  timestamptz '2026-03-10 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c5',201, timestamptz '2026-03-15 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c8',4,   timestamptz '2026-03-16 00:00+00', null, 'active'),
 -- historical (dropped) claim: earns nothing, but its owner still counted as a qualified claimer
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c6',3,   timestamptz '2026-03-20 00:00+00', timestamptz '2026-03-25 00:00+00', 'historical');
-- test_7 has no claims at all

-- ---------- multiplier bands in SQL ----------
select is(multiplier_for(1), 5, 'multiplier 1 = 5');
select is(multiplier_for(10), 5, 'multiplier 10 = 5');
select is(multiplier_for(11), 3, 'multiplier 11 = 3');
select is(multiplier_for(50), 3, 'multiplier 50 = 3');
select is(multiplier_for(51), 2, 'multiplier 51 = 2');
select is(multiplier_for(200), 2, 'multiplier 200 = 2');
select is(multiplier_for(201), 1, 'multiplier 201 = 1');
select is(league_for(5,'{}'), 1, 'no boundaries: one league');
select is(league_for(20,'{20}'), 1, 'league_for: 20 with boundary 20 is league 1');
select is(league_for(21,'{20}'), 2, 'league_for: 21 with boundary 20 is league 2');

-- ---------- refresh ----------
select refresh_season_scores(timestamptz '2026-03-01 00:00+00');

select is((select points from season_claim_points where claim_id=(select id from claims where claim_number=1)), 26,
  'claim started before the season counts growth from season start only: (7-2) x 5 + 1 base, not (7-1) x 5');
select is((select points from season_claim_points where claim_id=(select id from claims where claim_number=2)), 26, 'claim 2: (7-2) x 5 + 1 base');
select is((select points from season_claim_points where claim_id=(select id from claims where claim_number=11)), 13, 'claim 11: growth 4 x 3 + 1 base');
select is((select points from season_claim_points where claim_id=(select id from claims where claim_number=51)), 7, 'claim 51: growth 3 x 2 + 1 base');
select is((select points from season_claim_points where claim_id=(select id from claims where claim_number=201)), 3, 'claim 201: growth 2 x 1 + 1 base');
select is((select points from season_claim_points where claim_id=(select id from claims where claim_number=4)), 6,
  'claim 4 by a fresh account: own claim is not growth, (6-5) x 5 + 1 base');
select is((select count(*)::int from season_claim_points where claim_id=(select id from claims where claim_number=3)), 0,
  'a historical claim earns nothing (no row)');
select is((select count(*)::int from season_claim_points), 6, 'one row per active claim');

select is((select array_agg(handle order by handle) from season_scores s join profiles p on p.id=s.user_id), array['test_1','test_2','test_3','test_4','test_5','test_8'],
  'entrants are scouts with an active claim; no-claim and historical-only scouts are absent');
select is((select count(*)::int from season_entrants), 6, 'six entrants');
select is((select count(*)::int from season_scores where user_id in ('00000000-0000-0000-0000-0000000000c6','00000000-0000-0000-0000-0000000000c7')), 0,
  'scout with no active claims has no score row (0 points, not an entrant)');
select is((select count(*)::int from season_scores s where s.points <> coalesce((select sum(k.points) from season_claim_points k where k.season=s.season and k.user_id=s.user_id),0)), 0,
  'per-claim rows add up to each scout''s season_scores.points');
select is((select points from season_scores where user_id='00000000-0000-0000-0000-0000000000c1'), 26, 'test_1 total');
select is((select array_agg(rank order by points desc, user_id) from season_scores), array[1,1,3,4,5,6], 'ties share a rank (rank() semantics): 1,1,3,4,5,6');
select is((select count(distinct league)::int from season_scores), 1, 'version 1: a single league');
select is((select boundaries from seasons where season=date '2026-03-01'), '{}'::int[], 'season stores its league boundaries');

-- idempotent
create temp table snap1 as select 'c'::text k, to_jsonb(k) j from season_claim_points k union all select 's', to_jsonb(s) from season_scores s union all select 'e', to_jsonb(e) from season_entrants e;
select refresh_season_scores(timestamptz '2026-03-01 00:00+00');
create temp table snap2 as select 'c'::text k, to_jsonb(k) j from season_claim_points k union all select 's', to_jsonb(s) from season_scores s union all select 'e', to_jsonb(e) from season_entrants e;
select is((select count(*)::int from (select * from snap1 except select * from snap2) d) + (select count(*)::int from (select * from snap2 except select * from snap1) d), 0, 'refresh is idempotent (identical rows)');
select is((select count(*)::int from snap2), 18, 'idempotent run keeps the same number of rows');
-- a mid-month instant is normalised to the first of the month
select refresh_season_scores(timestamptz '2026-03-17 05:00+00');
select is((select count(*)::int from season_scores where season=date '2026-03-01'), 6, 'mid-month start maps to the same season');

-- ---------- board and standing ----------
select is(pg_get_function_result('season_board(date,integer,integer)'::regprocedure), 'TABLE(rank integer, handle text, points integer, league integer, at_risk_points integer)', 'season_board returns no user id column');
select is((select array_agg(handle order by rank, handle) from season_board(date '2026-03-01')), array['test_1','test_2','test_3','test_4','test_8','test_5'], 'board ordered by rank then handle, handles not ids');
select is((select count(*)::int from season_board(date '2026-03-01') where handle !~ '^test_'), 0, 'board shows handles, not user ids');

-- the current season: a 120-scout board capped at 100 rows
insert into auth.users(id,email) select format('00000000-0000-0000-0001-%s',lpad(g::text,12,'0'))::uuid, 'x'||g||'@example.test' from generate_series(1,120) g;
insert into profiles(id,handle) select format('00000000-0000-0000-0001-%s',lpad(g::text,12,'0'))::uuid, 'test_x'||g from generate_series(1,120) g;
insert into seasons(season,boundaries) values (current_season(), '{}');
insert into season_scores(season,user_id,points,league,rank)
  select current_season(), format('00000000-0000-0000-0001-%s',lpad(g::text,12,'0'))::uuid, 200-g, 1, g from generate_series(1,120) g;
select is((select count(*)::int from season_board(current_season(), 1, 1000)), 100, 'board returns at most 100 rows');
select is((select count(*)::int from season_board(null, 1, 5)), 5, 'null season = current season, limit respected');
select is((select min(rank) from season_board()), 1, 'defaults: current season, league 1');

set local role anon;
select ok((select count(*) from season_board(null,1,3)) = 3, 'anon can read the board');
reset role;
-- signed out (no auth.uid()): empty. (anon holds no execute grant on it, so this is checked with no uid.)
select set_config('request.jwt.claims','{}',true);
select is((select count(*)::int from my_season_standing()), 0, 'my_season_standing is empty when signed out');
select ok(not has_function_privilege('anon','my_season_standing()','execute'), 'anon cannot run my_season_standing directly');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0001-000000000007"}',true);
select is((select array[rank, points, league] from my_season_standing()), array[7,193,1], 'my_season_standing returns the caller''s own row');
reset role;

-- ---------- privileges ----------
select ok(has_function_privilege('service_role','refresh_season_scores(timestamptz)','execute') and has_function_privilege('service_role','recompute_all_slots()','execute'), 'service_role runs the jobs');
select ok(not (has_function_privilege('anon','refresh_season_scores(timestamptz)','execute') or has_function_privilege('authenticated','refresh_season_scores(timestamptz)','execute')
   or has_function_privilege('anon','recompute_all_slots()','execute') or has_function_privilege('authenticated','recompute_all_slots()','execute')), 'anon/authenticated cannot run the jobs');
select ok(has_function_privilege('anon','season_board(date,integer,integer)','execute') and has_function_privilege('authenticated','my_season_standing()','execute'), 'anon runs season_board, authenticated runs my_season_standing');

-- ---------- RLS: new tables are closed to anon ----------
set local role anon;
select is((select count(*)::int from league_rules) + (select count(*)::int from seasons) + (select count(*)::int from season_entrants)
        + (select count(*)::int from season_claim_points) + (select count(*)::int from season_scores), 0, 'anon sees 0 rows from every new table');
reset role;

select * from finish();
rollback;
