-- 0042: my_referral_progress
begin;
select plan(12);
insert into auth.users(id,email) select format('00000000-0000-0000-0004-%s',lpad(g::text,12,'0'))::uuid, 'rp'||g||'@example.test' from generate_series(1,8) g;
create function pg_temp.u(n int) returns uuid language sql immutable as $$ select format('00000000-0000-0000-0004-%s',lpad(n::text,12,'0'))::uuid $$;
-- 1 referrer; 2 old with claim (counted); 3 old without claim; 4 one day old with claim; 5 old with claim (counted); 8 lone user
insert into profiles(id,handle,created_at) values
 (pg_temp.u(1),'rp_1', now()-interval '30 days'),(pg_temp.u(2),'rp_2', now()-interval '10 days'),
 (pg_temp.u(3),'rp_3', now()-interval '10 days'),(pg_temp.u(4),'rp_4', now()-interval '1 day'),
 (pg_temp.u(5),'rp_5', now()-interval '10 days'),(pg_temp.u(8),'rp_8', now()-interval '10 days');
insert into artists(id,name,slug,status) values ('00000000-0000-0000-0000-0000000000b0','Ref Test','ref-test','live');
insert into claims(artist_id,user_id,claim_number) values
 ('00000000-0000-0000-0000-0000000000b0',pg_temp.u(2),1),('00000000-0000-0000-0000-0000000000b0',pg_temp.u(4),2),('00000000-0000-0000-0000-0000000000b0',pg_temp.u(5),3);
insert into referrals(referrer,referred) values (pg_temp.u(1),pg_temp.u(2)),(pg_temp.u(1),pg_temp.u(3)),(pg_temp.u(1),pg_temp.u(4)),(pg_temp.u(1),pg_temp.u(5));

select ok(not has_function_privilege('anon','my_referral_progress()','execute'), 'anon cannot run it');
select ok(has_function_privilege('authenticated','my_referral_progress()','execute'), 'authenticated can');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(1))::text, true);
select is((select count(*)::int from my_referral_progress()), 4, 'one row per friend');
select is((select status from my_referral_progress() where handle='rp_2'), 'counted', 'old friend with a claim is counted');
select is((select days_left from my_referral_progress() where handle='rp_2'), null, 'counted has no days left');
select is((select status||'/'||has_claim from my_referral_progress() where handle='rp_3'), 'pending/false', 'old friend without a claim is pending');
select is((select days_left from my_referral_progress() where handle='rp_4'), 2, 'one-day-old friend has 2 days left');
select is((select qualified_count||'/'||next_friends||'/'||next_slots from my_referral_progress() limit 1), '2/5/20', 'two counted: next step is 5 friends, 20 slots');
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(8))::text, true);
select is((select count(*)::int from my_referral_progress()), 1, 'no friends: one summary row');
select is((select handle||'' from my_referral_progress()), null, 'summary row has no handle');
select is((select next_friends||'/'||next_slots from my_referral_progress()), '2/10', 'first step is 2 friends, 10 slots');
select set_config('request.jwt.claims', json_build_object('sub', pg_temp.u(2))::text, true);
select is((select count(*)::int from my_referral_progress() where handle is not null), 0, 'a friend sees none of the referrer''s data');
reset role;
select * from finish();
rollback;
