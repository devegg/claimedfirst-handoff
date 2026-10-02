begin;
select plan(19);

insert into auth.users(id,email) select format('00000000-0000-0000-0004-%s',lpad(g::text,12,'0'))::uuid, 'pc'||g||'@example.test' from generate_series(1,3) g;
insert into profiles(id,handle) select format('00000000-0000-0000-0004-%s',lpad(g::text,12,'0'))::uuid, 'test_'||g from generate_series(1,3) g;
insert into artists(id,name,slug,status,next_claim_number) values
 ('00000000-0000-0000-0004-0000000000b1','Test Artist 1','pc-live','live',4),
 ('00000000-0000-0000-0004-0000000000b2','Test Artist 2','pc-pending','pending',2);
insert into claims(artist_id,user_id,claim_number,visibility,status,claimed_at,dropped_at) values
 ('00000000-0000-0000-0004-0000000000b1','00000000-0000-0000-0004-000000000001',1,'public','active','2026-10-01 12:00+00',null),
 ('00000000-0000-0000-0004-0000000000b1','00000000-0000-0000-0004-000000000002',2,'artist','historical','2026-10-02 12:00+00','2026-10-20 12:00+00'),
 ('00000000-0000-0000-0004-0000000000b1','00000000-0000-0000-0004-000000000003',3,'anonymous','active',now(),null),
 ('00000000-0000-0000-0004-0000000000b2','00000000-0000-0000-0004-000000000001',1,'public','active',now(),null);

select ok(has_function_privilege('anon','public_claim(text,int)','execute'), 'anon runs public_claim');
select ok(has_function_privilege('authenticated','public_claim(text,int)','execute'), 'authenticated runs public_claim');
select ok(not has_function_privilege('public','public_claim(text,int)','execute'), 'public role cannot run it directly');
select is((select proargnames from pg_proc where proname='public_claim'),
  array['p_slug','p_number','handle','claim_number','artist_name','status','claimed_on'], 'returns status and date, and no user id column');

select ok((select prosecdef from pg_proc where proname='public_claim'), 'public_claim is security definer');
select ok((select 'search_path=public, pg_temp' = any(proconfig) from pg_proc where proname='public_claim'), 'search_path is pinned');

set local role anon;
select set_config('request.jwt.claims','{}',true);
select is((select handle from public_claim('pc-live',1)), 'test_1', 'public claim shows the real handle');
select is((select claim_number||'/'||artist_name from public_claim('pc-live',1)), '1/Test Artist 1', 'number and artist name returned');
select is((select handle from public_claim('pc-live',2)), 'Anonymous scout', 'artist-level claim masked');
select is((select handle from public_claim('pc-live',3)), 'Anonymous scout', 'anonymous claim masked');
select is((select status from public_claim('pc-live',1)), 'active', 'an active claim reports active');
select is((select status from public_claim('pc-live',2)), 'historical', 'a dropped claim reports historical');
select is((select claimed_on from public_claim('pc-live',1)), '2026-10-01'::date, 'the claim date is returned');
select is((select pg_typeof(claimed_on)::text from public_claim('pc-live',1)), 'date', 'the public result carries a date, not a timestamp (no time of day)');
select is((select handle || '/' || status from public_claim('pc-live',3)), 'Anonymous scout/active', 'status never unmasks an anonymous claim');
select is((select count(*)::int from public_claim('pc-live',99)), 0, 'unknown number: no rows');
select is((select count(*)::int from public_claim('pc-pending',1)), 0, 'pending artist: no rows');
select is((select count(*)::int from public_claim('no-such-slug',1)), 0, 'unknown slug: no rows');
select is((select count(*)::int from public_claim('pc-live',1)), 1, 'exactly one row for a hit');

select * from finish();
rollback;
