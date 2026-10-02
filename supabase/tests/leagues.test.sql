begin;
select plan(16);

insert into auth.users(id,email) select format('00000000-0000-0000-0003-%s',lpad(g::text,12,'0'))::uuid, 'lg'||g||'@example.test' from generate_series(1,7) g;
create function pg_temp.u(n int) returns uuid language sql immutable as $$ select format('00000000-0000-0000-0003-%s',lpad(n::text,12,'0'))::uuid $$;
-- scouts 1-4 are the league scouts; 5-7 are newer claimers whose arrival is the growth. All accounts are older than 7 days.
insert into profiles(id,handle,slots_unlocked,created_at) values
 (pg_temp.u(1),'test_l1',20, now() - interval '60 days'),
 (pg_temp.u(2),'test_l2',21, now() - interval '60 days'),
 (pg_temp.u(3),'test_l3',5,  now() - interval '60 days'),
 (pg_temp.u(4),'test_l4',50, now() - interval '60 days'),
 (pg_temp.u(5),'test_l5',5,  now() - interval '60 days'),
 (pg_temp.u(6),'test_l6',5,  now() - interval '60 days'),
 (pg_temp.u(7),'test_l7',5,  now() - interval '60 days');
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000e1','Test Artist 1','test-artist-1','live');
-- l1 and l2 hold 5x claims, l3 and l4 hold 3x claims, all made before the season; l5..l7 claim now.
-- Growth for each of l1..l4 is therefore 3 new claimers: l1 and l2 score 15, l3 and l4 score 9.
insert into claims(artist_id,user_id,claim_number,claimed_at) values
 ('00000000-0000-0000-0000-0000000000e1',pg_temp.u(1), 1, now() - interval '50 days'),
 ('00000000-0000-0000-0000-0000000000e1',pg_temp.u(2), 2, now() - interval '49 days'),
 ('00000000-0000-0000-0000-0000000000e1',pg_temp.u(3),11, now() - interval '48 days'),
 ('00000000-0000-0000-0000-0000000000e1',pg_temp.u(4),12, now() - interval '47 days'),
 ('00000000-0000-0000-0000-0000000000e1',pg_temp.u(5),13, now()),
 ('00000000-0000-0000-0000-0000000000e1',pg_temp.u(6),14, now()),
 ('00000000-0000-0000-0000-0000000000e1',pg_temp.u(7),15, now());

create function pg_temp.lg(n int) returns int language sql as
 $$ select league from season_scores where user_id=pg_temp.u(n) and season=current_season() $$;
create function pg_temp.rk(n int) returns int language sql as
 $$ select rank from season_scores where user_id=pg_temp.u(n) and season=current_season() $$;

-- season_league_count: absent season -> 1, otherwise boundaries + 1, and only that integer is returned
select is(season_league_count(date '2031-01-01'), 1, 'no season row: one league');
select is(season_league_count(), 1, 'current season not refreshed yet: one league');
insert into seasons values (date '2030-01-01','{20}'), (date '2030-02-01','{5,10,20,30}'), (date '2030-03-01','{}');
select is(season_league_count(date '2030-01-01'), 2, 'boundaries {20}: two leagues');
select is(season_league_count(date '2030-02-01'), 5, 'boundaries {5,10,20,30}: five leagues');
select is(season_league_count(date '2030-03-01'), 1, 'empty boundaries: one league');
select is(pg_typeof(season_league_count(date '2030-02-01'))::text, 'integer', 'returns a plain integer');
select ok(not (select proretset from pg_proc where proname='season_league_count') and season_league_count(date '2030-01-01') <> 20, 'a single count, never the boundary value');
select ok(has_function_privilege('anon','season_league_count(date)','execute') and has_function_privilege('authenticated','season_league_count(date)','execute'), 'anon and authenticated may call it');
select ok(not has_function_privilege('public','season_league_count(date)','execute'), 'not granted to public');

-- leagues are assigned by slots_at_start
update league_rules set boundaries='{20}' where active_from_scouts=0;
select refresh_season_scores(date_trunc('month', now()));
select is(pg_temp.lg(1), 1, '20 slots -> league 1');
select is(pg_temp.lg(2), 2, '21 slots -> league 2');
select is(season_league_count(), 2, 'the current season now has two leagues');

-- unlocking more slots mid-season does not move the scout this season
update profiles set slots_unlocked=50 where id=pg_temp.u(1);
select refresh_season_scores(date_trunc('month', now()));
select is(pg_temp.lg(1), 1, 'mid-season slot upgrade: stays in league 1');

-- changing the rules mid-season does not reshuffle the season
update league_rules set boundaries='{5,10,20,30}' where active_from_scouts=0;
select refresh_season_scores(date_trunc('month', now()));
select is((select count(distinct league)::int from season_scores where season=current_season()), 2, 'season keeps its two leagues');
select is(season_league_count(), 2, 'league count for the season is unchanged by the rules change');

-- ranks restart in each league: l1 (15) over l3 (9) in league 1; l2 (15) over l4 (9) in league 2
select ok(pg_temp.rk(1)=1 and pg_temp.rk(3)=2 and pg_temp.rk(2)=1 and pg_temp.rk(4)=2, 'each league ranks from 1');
select * from finish();
rollback;
