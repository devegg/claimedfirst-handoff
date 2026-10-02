begin;
select plan(23);

-- helper: run a statement and return its error message (or 'ok')
create function pg_temp.err(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return sqlerrm; end $$;

-- scouts (all accounts old enough to be qualified)
insert into auth.users(id,email) select format('00000000-0000-0000-0002-%s',lpad(g::text,12,'0'))::uuid, 'f'||g||'@example.test' from generate_series(1,10) g;
insert into profiles(id,handle,created_at)
 select format('00000000-0000-0000-0002-%s',lpad(g::text,12,'0'))::uuid,
        (array['test_s1','test_s2','test_s3','test_s4','test_s5','test_s6','test_o1','test_o2','test_l1','test_w1'])[g], timestamptz '2025-12-01 00:00+00'
 from generate_series(1,10) g;
create function pg_temp.u(n int) returns uuid language sql immutable as $$ select format('00000000-0000-0000-0002-%s',lpad(n::text,12,'0'))::uuid $$;
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist X','test-artist-x','live'),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist Y','test-artist-y','live'),
 ('00000000-0000-0000-0000-0000000000b3','Test Artist Z','test-artist-z','live'),
 ('00000000-0000-0000-0000-0000000000b4','Test Artist W','test-artist-w','live');

-- Artist X, season February 2026 (a past season). s1..s6 = users 1..6
insert into claims(artist_id,user_id,claim_number,claimed_at,dropped_at,status) values
 ('00000000-0000-0000-0000-0000000000b1',pg_temp.u(1),1, timestamptz '2026-01-10 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000b1',pg_temp.u(6),6, timestamptz '2026-01-20 00:00+00', timestamptz '2026-02-15 00:00+00', 'historical'),  -- dropped inside the season
 ('00000000-0000-0000-0000-0000000000b1',pg_temp.u(2),2, timestamptz '2026-02-03 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000b1',pg_temp.u(4),4, timestamptz '2026-02-05 00:00+00', timestamptz '2026-03-10 00:00+00', 'historical'), -- dropped after the season ended
 ('00000000-0000-0000-0000-0000000000b1',pg_temp.u(5),5, timestamptz '2026-02-20 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000b1',pg_temp.u(3),3, timestamptz '2026-03-03 00:00+00', null, 'active');  -- after the season ended
-- Artist Y: two scouts. Artist Z: a lone scout. Artist W: a scout who re-claimed after dropping
insert into claims(artist_id,user_id,claim_number,claimed_at,dropped_at,status) values
 ('00000000-0000-0000-0000-0000000000b2',pg_temp.u(7),1, timestamptz '2026-02-02 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000b2',pg_temp.u(8),2, timestamptz '2026-02-10 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000b3',pg_temp.u(9),1, timestamptz '2026-02-05 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000b4',pg_temp.u(10),1, timestamptz '2026-01-10 00:00+00', timestamptz '2026-01-25 00:00+00', 'historical'),
 ('00000000-0000-0000-0000-0000000000b4',pg_temp.u(10),2, timestamptz '2026-02-10 00:00+00', null, 'active');

select refresh_season_scores(timestamptz '2026-02-01 00:00+00');

create function pg_temp.pts(p_handle text) returns int language sql as
 $$ select s.points from season_scores s join profiles p on p.id=s.user_id where p.handle=p_handle and s.season=date '2026-02-01' $$;

-- (a) growth after the season end is not counted: s1 = (4-1) x 5; s3's claim on 3 March does not add
select is(pg_temp.pts('test_s1'), 16, '(a) growth after season end is not counted');
select is(pg_temp.pts('test_s2'), 11, 'worked: s2 (4-2) x 5');
-- (b) claim dropped after season end still earns when the past season is refreshed
select is(pg_temp.pts('test_s4'), 6, '(b) claim dropped after the season ended still earns its season points');
select is((select count(*)::int from season_claim_points where claim_id=(select id from claims where claim_number=4 and artist_id='00000000-0000-0000-0000-0000000000b1')), 1, '(b) per-claim row exists');
-- (c) dropped inside the season: no points and not an entrant
select is((select count(*)::int from season_claim_points where claim_id=(select id from claims where claim_number=6 and artist_id='00000000-0000-0000-0000-0000000000b1')), 0, '(c) claim dropped inside the season earns nothing');
select is(pg_temp.pts('test_s6'), null, '(c) scout whose only claim was dropped in-season is not an entrant');
-- claim made after the season ended does not count for it
select is(pg_temp.pts('test_s3'), null, 'claim made after season end: not an entrant for that season');
select is(pg_temp.pts('test_s5'), 1, 'entrant with no growth has the 1 base point');

-- own growth
select is(pg_temp.pts('test_l1'), 1, 'lone scout with a matured account and one claim earns the base point only');
select is(pg_temp.pts('test_o1'), 6, 'first of two scouts earns only from the second');
select is(pg_temp.pts('test_o2'), 1, 'second scout earns nothing from the first');
select is(pg_temp.pts('test_w1'), 1, 'own earlier claim row on the same artist is not growth');
select is(qualified_claimers_excluding('00000000-0000-0000-0000-0000000000b2', timestamptz '2026-03-01 00:00+00', pg_temp.u(7)), 1, 'qualified_claimers_excluding drops that scout');
select ok(not (has_function_privilege('anon','qualified_claimers_excluding(uuid,timestamptz,uuid)','execute') or has_function_privilege('authenticated','qualified_claimers_excluding(uuid,timestamptz,uuid)','execute')), 'excluding-helper is not callable by anon/authenticated');

-- (d) refreshing a past season twice is idempotent
create temp table snap1 as select 'c'::text k, to_jsonb(k) j from season_claim_points k union all select 's', to_jsonb(s) from season_scores s union all select 'e', to_jsonb(e) from season_entrants e;
select refresh_season_scores(timestamptz '2026-02-01 00:00+00');
create temp table snap2 as select 'c'::text k, to_jsonb(k) j from season_claim_points k union all select 's', to_jsonb(s) from season_scores s union all select 'e', to_jsonb(e) from season_entrants e;
select is((select count(*)::int from (select * from snap1 except select * from snap2) d) + (select count(*)::int from (select * from snap2 except select * from snap1) d), 0, '(d) past season refresh is idempotent');
select ok((select count(*) from snap2) > 0, '(d) snapshot is not empty');

-- board: only scouts with points, ranks over all entrants (zero scorers rank below, so ranks match the filtered set)
select is((select array_agg(handle||':'||rank order by rank, handle) from season_board(date '2026-02-01')), array['test_s1:1','test_s2:2','test_o1:3','test_s4:3','test_l1:5','test_o2:5','test_s5:5','test_w1:5'], 'board lists every scout with an active claim (base point); ties share a rank');
select is((select count(*)::int from season_board(date '2026-02-01') where points = 0), 0, 'no zero-point rows on the board');
insert into seasons(season,boundaries) values (current_season(), '{}');
insert into season_scores(season,user_id,points,league,rank) values (current_season(), pg_temp.u(9), 0, 1, 1);
select is((select count(*)::int from season_board(current_season())), 0, 'zero-point scout is not on the current board');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0002-000000000009"}',true);
select is((select array[rank, points] from my_season_standing()), array[1,0], 'my_season_standing still returns the caller at 0 points');
reset role;

-- multiplier_for rejects numbers below 1
select is(pg_temp.err('select multiplier_for(0)'), 'invalid_claim_number', 'multiplier_for(0) raises');
select is(pg_temp.err('select multiplier_for(-3)'), 'invalid_claim_number', 'multiplier_for(-3) raises');
select is(pg_temp.err('select multiplier_for(1)'), 'ok', 'multiplier_for(1) is fine');

select * from finish();
rollback;
