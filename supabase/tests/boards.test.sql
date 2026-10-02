begin;
select plan(37);

insert into auth.users(id,email) select format('00000000-0000-0000-0000-0000000000a%s',g)::uuid, 't'||g||'@example.test' from generate_series(1,6) g;
insert into profiles(id,handle) select format('00000000-0000-0000-0000-0000000000a%s',g)::uuid, 'test_'||g from generate_series(1,6) g;
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live'),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist 2','test-artist-2','pending'),
 ('00000000-0000-0000-0000-0000000000b3','Test Artist 3','test-artist-3','live'),
 ('00000000-0000-0000-0000-0000000000b4','Test Artist 4','test-artist-4','live'),
 ('00000000-0000-0000-0000-0000000000b5','Test Artist 5','test-artist-5','live');

-- artist 1 fixtures
insert into claims(artist_id,user_id,claim_number,claimed_at,dropped_at,status,visibility) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1',1, now()-interval '20 days', null, 'active','public'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a2',2, now()-interval '5 days', null, 'active','public'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a2',3, now()-interval '20 days', now()-interval '17 days','historical','public'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a2',4, now()-interval '30 days', now()-interval '10 days','historical','public'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a3',5, now()-interval '20 days', null, 'active','artist'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a4',6, now()-interval '20 days', null, 'active','anonymous'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a5',7, now()-interval '14 days', null, 'active','public'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a2',8, now()-interval '20 days', now()-interval '20 days'+interval '13 days 23 hours','historical','public'),
 -- pending artist
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1',1, now()-interval '20 days', null, 'active','public'),
 -- scout 1 private claims on other live artists
 ('00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-0000000000a1',1, now()-interval '20 days', null, 'active','artist'),
 ('00000000-0000-0000-0000-0000000000b5','00000000-0000-0000-0000-0000000000a1',1, now()-interval '20 days', null, 'active','anonymous');
-- artist 3: 101 eligible claims
insert into claims(artist_id,user_id,claim_number,claimed_at,dropped_at,status)
 select '00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a6', g, now()-interval '30 days', now()-interval '10 days','historical'
 from generate_series(1,101) g;

select ok(has_function_privilege('anon','artist_founders(uuid)','execute'), 'anon runs artist_founders');
select ok(has_function_privilege('authenticated','artist_founders(uuid)','execute'), 'authenticated runs artist_founders');
select ok(has_function_privilege('anon','scout_historical(uuid)','execute'), 'anon runs scout_historical');
select ok(has_function_privilege('authenticated','scout_historical(uuid)','execute'), 'authenticated runs scout_historical');
select ok(not has_function_privilege('public','artist_founders(uuid)','execute'), 'public cannot run artist_founders directly');
select ok(not has_function_privilege('anon','claim_eligible(claims)','execute'), 'anon cannot run claim_eligible');
select ok(not has_function_privilege('authenticated','claim_eligible(claims)','execute'), 'authenticated cannot run claim_eligible');
select ok(not has_function_privilege('public','claim_eligible(claims)','execute'), 'public cannot run claim_eligible');

select is((select array_agg(claim_number order by claim_number) from artist_founders('00000000-0000-0000-0000-0000000000b1')),
  array[1,2,3,4,5,6,7,8], 'founders: every claim shows at once, provisional and dropped-early ones included');
select is((select array_agg(claim_number order by claim_number) from artist_founders('00000000-0000-0000-0000-0000000000b1') where provisional), array[2], 'provisional: only the active 5-day claim (exactly 14 days is not provisional)');
select is((select held_days from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=2), 5, 'held_days of an active claim runs to now');
select is((select held_days||'/'||dropped_after_days||'/'||dropped_early from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=3), '3/3/true', 'dropped after 3 days: dropped_early');
select is((select held_days||'/'||dropped_after_days||'/'||dropped_early from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=4), '20/20/false', 'dropped after 20 days: a normal historical claim');
select is((select dropped_early from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=8), true, '13d23h drop is still early');
select is((select coalesce(dropped_after_days::text,'')||'/'||provisional||'/'||dropped_early from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=1), '/false/false', 'active claim: no dropped_after_days, not early');
select is((select status from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=4), 'historical', 'dropped-after-20-days claim is labeled historical');
select is((select status from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=1), 'active', 'active claim labeled active');
select is((select handle from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=1), 'test_1', 'public claim shows handle');
select is((select handle from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=5), 'Anonymous scout', 'artist-level claim masked');
select is((select handle from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=6), 'Anonymous scout', 'anonymous claim masked');
select is((select proargnames from pg_proc where proname='artist_founders'),
  array['p_artist','claim_number','handle','status','claimed_at','held_days','provisional','dropped_after_days','dropped_early'], 'artist_founders returns no user id column');
select is((select count(*)::int from artist_founders('00000000-0000-0000-0000-0000000000b2')), 0, 'pending artist has no board');

select is((select count(*)::int from artist_founders('00000000-0000-0000-0000-0000000000b3')), 100, '101 eligible claims return 100');
select is((select min(claim_number)||'-'||max(claim_number) from artist_founders('00000000-0000-0000-0000-0000000000b3')), '1-100', 'the 100 earliest numbers');
select is((select array_agg(claim_number) from artist_founders('00000000-0000-0000-0000-0000000000b3')), (select array_agg(g order by g) from generate_series(1,100) g), 'ordered by number');

-- anon viewer
set local role anon;
select set_config('request.jwt.claims','{}',true);
select is((select count(*)::int from artist_founders('00000000-0000-0000-0000-0000000000b1')), 8, 'anon can read founders board');
select is((select count(*)::int from artist_founders('00000000-0000-0000-0000-0000000000b1') where handle in ('test_3','test_4')), 0, 'anon never sees the handle of artist-only or anonymous claims');
select is((select array_agg(claim_number order by claim_number) from scout_historical('00000000-0000-0000-0000-0000000000a1')), array[1], 'anon sees only public claims of scout 1 (live artist only)');
select is((select count(*)::int from scout_historical('00000000-0000-0000-0000-0000000000a3')), 0, 'anon sees no artist-level claim');
select is((select count(*)::int from scout_historical('00000000-0000-0000-0000-0000000000a4')), 0, 'anon sees no anonymous claim');
reset role;

-- other authenticated scout
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2"}',true);
select is((select count(*)::int from scout_historical('00000000-0000-0000-0000-0000000000a1')), 1, 'other scout sees only scout 1 public claim');
select is((select count(*)::int from scout_historical('00000000-0000-0000-0000-0000000000a3')), 0, 'other scout cannot see artist-level claim');
select is((select array_agg(claim_number order by claim_number) from scout_historical('00000000-0000-0000-0000-0000000000a2')), array[2,3,4,8], 'scout 2 own board: provisional and early-dropped claims show at once');
select is((select provisional||'/'||held_days from scout_historical('00000000-0000-0000-0000-0000000000a2') where claim_number=2), 'true/5', 'scout history flags the provisional claim');

-- owner
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select is((select array_agg(slug||':'||visibility order by slug) from scout_historical('00000000-0000-0000-0000-0000000000a1')),
  array['test-artist-1:public','test-artist-4:artist','test-artist-5:anonymous'], 'owner sees eligible claims with visibility, no pending artist');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a4"}',true);
select is((select visibility from scout_historical('00000000-0000-0000-0000-0000000000a4')), 'anonymous', 'anonymous claim shown to its owner');
reset role;

select is((select count(*)::int from scout_historical('00000000-0000-0000-0000-0000000000a6')), 100, 'scout board also caps at 100');
select * from finish();
rollback;
