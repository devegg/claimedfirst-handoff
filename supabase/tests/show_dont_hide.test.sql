-- B1 (show, don't hide): account-age constant, weighted submitters, public status, report rule, base points, at-risk.
begin;
select plan(53);

insert into auth.users(id,email) select format('00000000-0000-0000-0003-%s',lpad(g::text,12,'0'))::uuid, 'sd'||g||'@example.test' from generate_series(1,10) g;
create function pg_temp.u(n int) returns uuid language sql immutable as $$ select format('00000000-0000-0000-0003-%s',lpad(n::text,12,'0'))::uuid $$;
-- 1-4 and 8 old accounts; 5 created 2026-02-27 (young during the February season); 7 exactly at the age limit now;
-- 9 and 10 are one day old (10 owns a verified page); 6 is unused
insert into profiles(id,handle,created_at) values
 (pg_temp.u(1),'sd_1', timestamptz '2025-12-01 00:00+00'),(pg_temp.u(2),'sd_2', timestamptz '2025-12-01 00:00+00'),
 (pg_temp.u(3),'sd_3', timestamptz '2025-12-01 00:00+00'),(pg_temp.u(4),'sd_4', timestamptz '2025-12-01 00:00+00'),
 (pg_temp.u(5),'sd_5', timestamptz '2026-02-27 00:00+00'),(pg_temp.u(6),'sd_6', timestamptz '2025-12-01 00:00+00'),
 (pg_temp.u(7),'sd_7', now()-account_min_age()),(pg_temp.u(8),'sd_8', timestamptz '2025-12-01 00:00+00'),
 (pg_temp.u(9),'sd_9', now()-interval '1 day'),(pg_temp.u(10),'sd_10', now()-interval '1 day');

-- ---------- A. one account-age constant ----------
select is(account_min_age(), interval '3 days', 'account_min_age is 3 days');
select ok(has_function_privilege('anon','account_min_age()','execute'), 'the constant is readable');
insert into artists(id,name,slug,status) values ('00000000-0000-0000-0000-0000000000a0','Age Test','age-test','live');
insert into claims(artist_id,user_id,claim_number,claimed_at) values
 ('00000000-0000-0000-0000-0000000000a0',pg_temp.u(1),1,now()-interval '10 days'),
 ('00000000-0000-0000-0000-0000000000a0',pg_temp.u(9),2,now()-interval '1 hour'),
 ('00000000-0000-0000-0000-0000000000a0',pg_temp.u(7),3,now()-interval '1 hour');
select is(qualified_claimers('00000000-0000-0000-0000-0000000000a0', now()), 2, 'qualified claimers: 1-day-old account excluded, 3-day-old counted');
select is(qualified_claimers_excluding('00000000-0000-0000-0000-0000000000a0', now(), pg_temp.u(1)), 1, 'excluding variant uses the same constant');
insert into referrals(referrer,referred) values (pg_temp.u(1),pg_temp.u(9)),(pg_temp.u(1),pg_temp.u(7));
select is(qualified_referrals(pg_temp.u(1)), 1, 'referral qualifies at 3 days, not at 1 day');

-- ---------- F. verified owner counts as 2 of 3 ----------
insert into artists(id,name,slug,status,verified_at) values ('00000000-0000-0000-0000-0000000000a1','Owned One','owned-one','live',now());
insert into artist_owners(artist_id,owner_id) values ('00000000-0000-0000-0000-0000000000a1',pg_temp.u(8));
select ok(is_verified_owner(pg_temp.u(8)) and not is_verified_owner(pg_temp.u(1)), 'is_verified_owner');
select is((submit_artist(pg_temp.u(8),'Weighted One','suno','suno:@weighted1','https://suno.com/@weighted1')).status,'pending','verified alone: pending');
select is((select support_points||'/'||needed from public_artist_status('weighted1')), '2/3', 'verified alone is 2 of 3');
select is((select scouts_submitted||'/'||needed from pending_artists_public(50) where name='Weighted One'), '2/3', 'pending list shows the weighted 2 of 3');
select is((submit_artist(pg_temp.u(1),'Weighted One','suno','suno:@weighted1','https://suno.com/@weighted1')).status,'live','verified + one other goes live');
select is((submit_artist(pg_temp.u(1),'Plain One','suno','suno:@plain1','https://suno.com/@plain1')).status,'pending','one unverified: pending');
select is((submit_artist(pg_temp.u(2),'Plain One','suno','suno:@plain1','https://suno.com/@plain1')).status,'pending','two unverified: still pending');
select is((select scouts_submitted from pending_artists_public(50) where name='Plain One'), 2, 'two unverified show 2');
select is((submit_artist(pg_temp.u(3),'Plain One','suno','suno:@plain1','https://suno.com/@plain1')).status,'live','three unverified go live');
select is((submit_artist(pg_temp.u(8),'Weighted Two','suno','suno:@weighted2','https://suno.com/@weighted2')).status,'pending','verified owner submitting twice stays at 2');
select is((submit_artist(pg_temp.u(8),'Weighted Two','suno','suno:@weighted2','https://suno.com/@weighted2')).status,'pending','same verified submitter is not double counted');
select ok(not has_function_privilege('anon','is_verified_owner(uuid)','execute') and not has_function_privilege('authenticated','is_verified_owner(uuid)','execute'), 'helper not callable by clients');

-- ---------- E. public_artist_status ----------
select ok(has_function_privilege('anon','public_artist_status(text)','execute') and has_function_privilege('authenticated','public_artist_status(text)','execute'), 'anon and authenticated may call it');
select is((select proargnames from pg_proc where proname='public_artist_status'), array['p_slug','name','slug','status','source_url','verified','support_points','needed'], 'columns: no scout, submitter or reporter data');
select ok((select coalesce(proconfig,'{}') @> array['search_path=public, pg_temp'] from pg_proc where proname='public_artist_status'), 'search_path pinned');
select is((select status||'/'||verified from public_artist_status('owned-one')), 'live/true', 'live verified page');
insert into artist_links(artist_id,platform,canonical_key,url,is_primary) values ('00000000-0000-0000-0000-0000000000a1','suno','suno:@ownedone','https://suno.com/@ownedone',true);
select is((select source_url from public_artist_status('owned-one')), 'https://suno.com/@ownedone', 'https source link of the primary link');
select is((select support_points from public_artist_status('owned-one')), null, 'live pages have no support figure');
insert into artists(id,name,slug,status,disputed_at,disputed_from) values ('00000000-0000-0000-0000-0000000000a2','Disputed One','disputed-one','disputed',now(),'live');
insert into artist_links(artist_id,platform,canonical_key,url,is_primary) values ('00000000-0000-0000-0000-0000000000a2','web','web:disp.example','http://disp.example',true);
select is((select status||'/'||coalesce(source_url,'none')||'/'||verified from public_artist_status('disputed-one')), 'disputed/none/false', 'disputed page shows its status; an http link is never returned');
insert into artists(id,name,slug,status) values ('00000000-0000-0000-0000-0000000000a3','Gone Two','gone-two','delisted');
insert into artist_links(artist_id,platform,canonical_key,url,is_primary) values ('00000000-0000-0000-0000-0000000000a3','web','web:gone2.example','https://gone2.example',true);
select is((select name||'/'||status||'/'||coalesce(source_url,'none')||'/'||coalesce(verified::text,'none')||'/'||coalesce(support_points::text,'none') from public_artist_status('gone-two')), 'Gone Two/delisted/none/none/none', 'delisted page: name and status only, no link');
select is((select count(*)::int from public_artist_status('no-such-page')), 0, 'unknown address returns nothing');
select is((select count(*)::int from public_artist_status('weighted2') where status='pending'), 1, 'pending page is readable by address');
set local role anon;
select is((select name from public_artist_status('weighted2')), 'Weighted Two', 'anon reads a pending page');
reset role;

-- ---------- G. reports ----------
insert into artists(id,name,slug,status,verified_at) values ('00000000-0000-0000-0000-0000000000a4','Owned Two','owned-two','live',now());
insert into artist_owners(artist_id,owner_id) values ('00000000-0000-0000-0000-0000000000a4',pg_temp.u(10));
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000c1','Target One','target-one','live'),
 ('00000000-0000-0000-0000-0000000000c2','Target Two','target-two','live'),
 ('00000000-0000-0000-0000-0000000000c3','Target Three','target-three','live');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(9))::text, true);
select throws_ok($$select report_artist('00000000-0000-0000-0000-0000000000c1','young account report')$$,'P0001','account_too_new','a 1-day-old non-owner report is rejected');
reset role;
select is((select count(*)::int from artist_reports where artist_id='00000000-0000-0000-0000-0000000000c1'), 0, 'the rejected report is not stored');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000c1'), 'live', 'and the page stays live');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(7))::text, true);
select lives_ok($$select report_artist('00000000-0000-0000-0000-0000000000c2','3 day old report')$$, 'report from an account exactly 3 days old');
reset role;
select is((select status from artists where id='00000000-0000-0000-0000-0000000000c2'), 'disputed', 'a 3-day-old account can start a dispute');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(10))::text, true);
select lives_ok($$select report_artist('00000000-0000-0000-0000-0000000000c3','verified owner report')$$, 'verified owner report');
reset role;
select is((select status from artists where id='00000000-0000-0000-0000-0000000000c3'), 'disputed', 'a verified owner skips the account-age wait');

-- ---------- 0041: delisted-page owner is not a verified owner ----------
insert into artists(id,name,slug,status,verified_at) values ('00000000-0000-0000-0000-0000000000a5','Gone Owned','gone-owned','delisted',now());
insert into artist_owners(artist_id,owner_id) values ('00000000-0000-0000-0000-0000000000a5',pg_temp.u(6));
select ok(not is_verified_owner(pg_temp.u(6)), 'owner of only a delisted page is not a verified owner');
select is((submit_artist(pg_temp.u(6),'Delisted Owner Sub','suno','suno:@dlo','https://suno.com/@dlo')).status,'pending','delisted-page owner counts 1');
select is((select support_points from public_artist_status('dlo')), 1, 'support is 1, not 2');
update profiles set created_at = now() - interval '1 day' where id = pg_temp.u(6);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(6))::text, true);
select throws_ok($$select report_artist('00000000-0000-0000-0000-0000000000c1','delisted owner')$$,'P0001','account_too_new','delisted-page owner gets no report-age waiver');
reset role;
insert into artists(id,name,slug,status,verified_at) values ('00000000-0000-0000-0000-0000000000a7','Disp Owned','disp-owned','disputed',now());
update artists set disputed_from='live', disputed_at=now() where id='00000000-0000-0000-0000-0000000000a7';
update artist_owners set artist_id='00000000-0000-0000-0000-0000000000a7' where artist_id='00000000-0000-0000-0000-0000000000a5';
select ok(is_verified_owner(pg_temp.u(6)), 'owner of a disputed verified page still counts');

-- ---------- claim lock helpers and day-only precision ----------
insert into artists(id,name,slug,status) values ('00000000-0000-0000-0000-0000000000e1','Lock Test','lock-test','live');
insert into claims(id,artist_id,user_id,claim_number,claimed_at) values
 ('00000000-0000-0000-0000-00000000f001','00000000-0000-0000-0000-0000000000e1',pg_temp.u(1),1, now()-interval '1 hour');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(2))::text, true);
select is(claim_unlocks_at('00000000-0000-0000-0000-00000000f001'), null, 'claim_unlocks_at is null for another user''s claim');
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(1))::text, true);
select ok(claim_unlocks_at('00000000-0000-0000-0000-00000000f001') is not null, 'claim_unlocks_at works for the owner');
create function pg_temp.lock_detail() returns text language plpgsql as $f$
declare d text; begin perform drop_claim('00000000-0000-0000-0000-00000000f001'); return 'dropped';
exception when others then get stacked diagnostics d = pg_exception_detail; return d; end $f$;
select matches(pg_temp.lock_detail(), '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$', 'claim_locked detail is an ISO 8601 UTC time');
reset role;
-- masked claims: day counts come from UTC days, not hours. Claimed 23:00 UTC two days ago, viewed "now": exact would be 1 or 2 days.
insert into artists(id,name,slug,status) values ('00000000-0000-0000-0000-0000000000e2','Day Test','day-test','live');
insert into claims(artist_id,user_id,claim_number,claimed_at,dropped_at,status,visibility) values
 ('00000000-0000-0000-0000-0000000000e2',pg_temp.u(1),1, timestamptz '2026-03-01 23:30+00', timestamptz '2026-03-15 00:30+00','historical','anonymous'),
 ('00000000-0000-0000-0000-0000000000e2',pg_temp.u(2),2, timestamptz '2026-03-01 23:30+00', timestamptz '2026-03-15 00:30+00','historical','public'),
 ('00000000-0000-0000-0000-0000000000e2',pg_temp.u(3),3, timestamptz '2026-03-01 00:30+00', timestamptz '2026-03-14 23:30+00','historical','artist');
select is((select held_days||'/'||dropped_after_days||'/'||dropped_early from artist_founders('00000000-0000-0000-0000-0000000000e2') where claim_number=1), '14/14/false', 'anonymous: UTC days (Mar 1 to Mar 15 = 14), not 13 days 1 hour');
select is((select held_days||'/'||dropped_early from artist_founders('00000000-0000-0000-0000-0000000000e2') where claim_number=2), '13/true', 'public: exact time (13 days 1 hour)');
select is((select held_days||'/'||dropped_early from artist_founders('00000000-0000-0000-0000-0000000000e2') where claim_number=3), '13/true', 'artist-only: UTC days (Mar 1 to Mar 14 = 13)');
insert into claims(artist_id,user_id,claim_number,claimed_at,status,visibility) values
 ('00000000-0000-0000-0000-0000000000e2',pg_temp.u(4),4, date_trunc('day', now(), 'UTC') - interval '14 days' + interval '23 hours', 'active','anonymous');
select is((select provisional from artist_founders('00000000-0000-0000-0000-0000000000e2') where claim_number=4), false, 'masked active claim: provisional ends on the UTC day boundary, not the hour');

-- ---------- D. scoring: base point and at-risk (February 2026, a closed season) ----------
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000d1','Score One','score-one','live'),
 ('00000000-0000-0000-0000-0000000000d2','Score Two','score-two','live'),
 ('00000000-0000-0000-0000-0000000000d3','Score Three','score-three','live');
insert into claims(artist_id,user_id,claim_number,claimed_at,dropped_at,status) values
 ('00000000-0000-0000-0000-0000000000d1',pg_temp.u(1),1, timestamptz '2026-02-01 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000d1',pg_temp.u(2),2, timestamptz '2026-02-24 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000d1',pg_temp.u(5),3, timestamptz '2026-02-28 00:00+00', null, 'active'),
 ('00000000-0000-0000-0000-0000000000d2',pg_temp.u(3),1, timestamptz '2026-02-02 00:00+00', timestamptz '2026-02-10 00:00+00', 'historical'),
 ('00000000-0000-0000-0000-0000000000d3',pg_temp.u(8),1, timestamptz '2026-02-27 00:00+00', null, 'active');
select refresh_season_scores(timestamptz '2026-02-01 00:00+00');
select is((select array_agg(handle||':'||rank||':'||points||':'||at_risk_points order by rank, handle) from season_board(date '2026-02-01')),
  array['sd_1:1:6:0','sd_2:2:1:1','sd_5:2:1:1','sd_8:2:1:1'],
  'base point puts every active scout on the board; growth only from accounts old enough; at risk = young claims; ranks tie');
select is((select count(*)::int from season_board(date '2026-02-01') where handle in ('sd_3','sd_4')), 0, 'dropped-only and claim-less scouts are not on the board');
select is((select points from season_scores where user_id=pg_temp.u(5) and season=date '2026-02-01'), 1, 'a young account still earns the base point (no age rule on it)');
select is(pg_get_function_result('season_board(date,integer,integer)'::regprocedure), 'TABLE(rank integer, handle text, points integer, league integer, at_risk_points integer)', 'season_board: old columns kept, at_risk_points added');
-- dropping removes the points
update claims set status='historical', dropped_at=timestamptz '2026-02-26 00:00+00' where user_id=pg_temp.u(2) and artist_id='00000000-0000-0000-0000-0000000000d1';
select refresh_season_scores(timestamptz '2026-02-01 00:00+00');
select is((select array_agg(handle||':'||points order by rank, handle) from season_board(date '2026-02-01')), array['sd_1:6','sd_5:1','sd_8:1'], 'a claim dropped in the season earns nothing and its scout leaves the board');
-- current season standing carries at_risk_points
insert into seasons(season,boundaries) values (current_season(),'{}');
insert into season_scores(season,user_id,points,at_risk_points,league,rank) values (current_season(), pg_temp.u(1), 5, 2, 1, 1);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(1))::text, true);
select is((select array[rank, points, league, at_risk_points] from my_season_standing()), array[1,5,1,2], 'my_season_standing returns at_risk_points');
reset role;

select * from finish();
rollback;
