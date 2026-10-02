begin;
select plan(16);
select has_table('public','claims','claims table exists');
select col_is_unique('public','artist_links',array['canonical_key'],'one row per canonical artist link');
select throws_ok($$insert into claims(artist_id,user_id,claim_number,status) values (gen_random_uuid(),gen_random_uuid(),1,'bogus')$$,'23514',null,'status is constrained');

-- fixtures (superuser)
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into profiles(id,handle) values ('00000000-0000-0000-0000-000000000001','test_1'),('00000000-0000-0000-0000-000000000002','test_2');
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000a1','Live','live-a','live'),
 ('00000000-0000-0000-0000-0000000000a2','Pending','pending-a','pending');
insert into artist_links(artist_id,platform,canonical_key,url) values
 ('00000000-0000-0000-0000-0000000000a1','bandcamp','bc:live','https://live.example'),
 ('00000000-0000-0000-0000-0000000000a2','bandcamp','bc:pending','https://pending.example');
insert into claims(artist_id,user_id,claim_number,visibility) values
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001',1,'anonymous'),
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000002',2,'public');
insert into referrals(referrer,referred) values ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
insert into verification_attempts(artist_id,user_id,code) values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001','secret-code');
insert into artist_submissions(artist_id,user_id) values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001');
insert into top_songs(artist_id,position,title,url) values ('00000000-0000-0000-0000-0000000000a1',1,'Song','https://song.example');
insert into top_songs(artist_id,position,title,url) values ('00000000-0000-0000-0000-0000000000a2',1,'Hidden','https://hidden.example');

set local role anon;
select is((select count(*) from claims),0::bigint,'anon sees no claims');
select is((select count(*) from referrals),0::bigint,'anon sees no referrals');
select is((select count(*) from verification_attempts),0::bigint,'anon sees no verification attempts');
select is((select count(*) from artist_submissions),0::bigint,'anon sees no submissions');
select is((select count(*) from profiles),0::bigint,'anon sees no raw profiles');
select is((select handle from public_profiles where handle='test_1'),'test_1'::text,'anon sees public_profiles handle') ;
select is((select count(*) from artist_links),1::bigint,'anon sees only live artist link');
select is((select count(*) from top_songs),1::bigint,'anon sees only live artist top songs');
select throws_ok($$insert into top_songs(artist_id,position,title,url) values ('00000000-0000-0000-0000-0000000000a1',2,'x','https://x.example')$$,'42501',null,'anon cannot write top_songs');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((select count(*) from profiles),1::bigint,'user sees only own profile');
select is((select count(*) from claims where user_id='00000000-0000-0000-0000-000000000001'),1::bigint,'user sees own claim');
select is((select count(*) from claims where user_id='00000000-0000-0000-0000-000000000002'),0::bigint,'user cannot see another user''s claim');
select is((select count(*) from referrals),0::bigint,'user sees no referrals directly');
select * from finish();
rollback;
