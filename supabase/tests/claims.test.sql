begin;
select plan(24);
-- fixtures: two scouts, live artists
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','t1@example.test'),
 ('00000000-0000-0000-0000-0000000000a2','t2@example.test');
insert into profiles(id,handle) values
 ('00000000-0000-0000-0000-0000000000a1','test_1'),
 ('00000000-0000-0000-0000-0000000000a2','test_2');
insert into artists(id,name,slug,status,claims_frozen) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live',false),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist 2','test-artist-2','pending',false),
 ('00000000-0000-0000-0000-0000000000b3','Test Artist 3','test-artist-3','live',false),
 ('00000000-0000-0000-0000-0000000000b4','Test Artist 4','test-artist-4','live',false),
 ('00000000-0000-0000-0000-0000000000b5','Test Artist 5','test-artist-5','live',false),
 ('00000000-0000-0000-0000-0000000000b6','Test Artist 6','test-artist-6','live',false),
 ('00000000-0000-0000-0000-0000000000b7','Test Artist 7','test-artist-7','live',false),
 ('00000000-0000-0000-0000-0000000000b8','Test Artist 8 frozen','test-artist-8','live',true),
 ('00000000-0000-0000-0000-0000000000b9','Test Artist 9','test-artist-9','live',false),
 ('00000000-0000-0000-0000-0000000000ba','Test Artist 10','test-artist-10','live',false);
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000c1','q1@example.test'),
 ('00000000-0000-0000-0000-0000000000c2','q2@example.test'),
 ('00000000-0000-0000-0000-0000000000a4','t4@example.test');
insert into profiles(id,handle,created_at,slots_unlocked) values
 ('00000000-0000-0000-0000-0000000000c1','qual_1',now()-interval '8 days',5),
 ('00000000-0000-0000-0000-0000000000c2','qual_2',now()-interval '8 days',5),
 ('00000000-0000-0000-0000-0000000000a4','test_4',now(),6);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select is((claim_artist('00000000-0000-0000-0000-0000000000b1')).claim_number,1,'first claim is #1');
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b1')$$,'P0001','already_claimed');
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b2')$$,'P0001','artist_not_claimable');

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2"}',true);
select is((claim_artist('00000000-0000-0000-0000-0000000000b1')).claim_number,2,'second scout gets #2');

-- drop keeps the number as historical
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
-- a fresh claim is locked for 72 hours (0035): refused with claim_locked and the unlock time in the detail
select throws_ok($$select drop_claim((select id from claims where user_id='00000000-0000-0000-0000-0000000000a1'))$$,'P0001','claim_locked','fresh claim cannot be dropped');
select is((select claim_unlocks_at(id) from claims where user_id='00000000-0000-0000-0000-0000000000a1') - (select claimed_at from claims where user_id='00000000-0000-0000-0000-0000000000a1'), interval '72 hours', 'claim_unlocks_at is claimed_at + 72 hours');
reset role;
update claims set claimed_at = now() - interval '71 hours 59 minutes' where user_id='00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select throws_ok($$select drop_claim((select id from claims where user_id='00000000-0000-0000-0000-0000000000a1'))$$,'P0001','claim_locked','71h59m: still locked');
reset role;
update claims set claimed_at = now() - interval '72 hours' where user_id='00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select is((drop_claim((select id from claims where user_id='00000000-0000-0000-0000-0000000000a1'))).status,'historical','72h: drop -> historical');
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b1')$$,'P0001','cooldown');

-- 29 days: still blocked; 30 days: allowed with new number, old claim kept
reset role;
update claims set dropped_at = now() - interval '29 days' where user_id='00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b1')$$,'P0001','cooldown','day 29 blocked');
reset role;
update claims set dropped_at = now() - interval '30 days' where user_id='00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select is((claim_artist('00000000-0000-0000-0000-0000000000b1')).claim_number,3,'day 30: new number #3');

-- old claim kept as historical with its number; numbers unique per artist
reset role;
select is((select claim_number from claims where user_id='00000000-0000-0000-0000-0000000000a1'
            and artist_id='00000000-0000-0000-0000-0000000000b1' and status='historical'),1,'old claim kept historical with #1');
select is((select count(distinct claim_number)::int from claims where artist_id='00000000-0000-0000-0000-0000000000b1'),3,'claim numbers unique per artist');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);

-- frozen artist refused
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b8')$$,'P0001','artist_not_claimable','frozen artist refused');

-- invalid visibility violates the check constraint
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b3','bogus')$$,'23514',null,'invalid visibility fails check');

-- explicit visibility stored (a1 active: b1, b3)
select is((claim_artist('00000000-0000-0000-0000-0000000000b3','anonymous')).visibility,'anonymous','explicit visibility stored');

-- default visibility used when null (a2 default = artist)
reset role;
update profiles set default_claim_visibility='artist' where id='00000000-0000-0000-0000-0000000000a2';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2"}',true);
select is((claim_artist('00000000-0000-0000-0000-0000000000b3')).visibility,'artist','null visibility uses profile default');

-- roster_full: a1 reaches 5 active (b1,b3,b4,b5,b6), then b7 refused
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
do $$ begin
  perform claim_artist('00000000-0000-0000-0000-0000000000b4');
  perform claim_artist('00000000-0000-0000-0000-0000000000b5');
  perform claim_artist('00000000-0000-0000-0000-0000000000b6');
end $$;
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b7')$$,'P0001','roster_full');

-- not_authenticated: no jwt subject
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b9')$$,'P0001','not_authenticated');

-- anon role cannot execute claim_artist at all
-- (checked via privileges: running pgTAP's throws_ok under role anon segfaults this local Postgres)
select is(has_function_privilege('anon','claim_artist(uuid,text)','execute')
       or has_function_privilege('anon','drop_claim(uuid)','execute'),false,'anon cannot execute claim_artist/drop_claim');

-- not_your_claim: a2 tries to drop a1's claim
reset role;
create temp table a1_claim as select id from claims where user_id='00000000-0000-0000-0000-0000000000a1' and status='active' limit 1;
grant select on a1_claim to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2"}',true);
select throws_ok($$select drop_claim((select id from a1_claim))$$,'P0001','not_your_claim');

-- base_qualified: two 8-day-old scouts claim b9, then a2 (new account) claims it
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c1"}',true);
do $$ begin perform claim_artist('00000000-0000-0000-0000-0000000000b9'); end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c2"}',true);
do $$ begin perform claim_artist('00000000-0000-0000-0000-0000000000b9'); end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2"}',true);
select is((claim_artist('00000000-0000-0000-0000-0000000000b9')).base_qualified,2,'base_qualified = qualified claimers at claim time');

-- slots_unlocked = 6: holds 6, refused the 7th
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a4"}',true);
do $$ begin
  perform claim_artist('00000000-0000-0000-0000-0000000000b1');
  perform claim_artist('00000000-0000-0000-0000-0000000000b3');
  perform claim_artist('00000000-0000-0000-0000-0000000000b4');
  perform claim_artist('00000000-0000-0000-0000-0000000000b5');
  perform claim_artist('00000000-0000-0000-0000-0000000000b6');
  perform claim_artist('00000000-0000-0000-0000-0000000000b7');
end $$;
select is((select count(*)::int from claims where user_id='00000000-0000-0000-0000-0000000000a4' and status='active'),6,'6-slot scout holds 6');
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000ba')$$,'P0001','roster_full','7th refused at 6 slots');
select * from finish();
rollback;
