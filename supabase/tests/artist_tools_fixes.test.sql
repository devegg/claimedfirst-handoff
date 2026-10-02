begin;
select plan(33);

insert into auth.users(id,email)
 select format('00000000-0000-0000-0000-0000000000a%s', g)::uuid, format('t%s@example.test', g) from generate_series(1,7) g;
insert into profiles(id,handle)
 select format('00000000-0000-0000-0000-0000000000a%s', g)::uuid, format('test_%s', g) from generate_series(1,7) g;
update profiles set created_at = now() - interval '8 days';  -- R36: only accounts 7+ days old can start a dispute
-- b1 live verified, owner test_1; b2 pending; b3 delisted; b4 disputed; b5 live with owner row but verified_at null; b6 for failure case
insert into artists(id,name,slug,status,verified_at,next_claim_number) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live',now(),5),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist 2','test-artist-2','pending',null,1),
 ('00000000-0000-0000-0000-0000000000b3','Test Artist 3','test-artist-3','delisted',null,1),
 ('00000000-0000-0000-0000-0000000000b4','Test Artist 4','test-artist-4','disputed',null,1),
 ('00000000-0000-0000-0000-0000000000b5','Test Artist 5','test-artist-5','live',null,1),
 ('00000000-0000-0000-0000-0000000000b6','Test Artist 6','test-artist-6','pending',null,1);
insert into artist_owners(artist_id,owner_id) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000b5','00000000-0000-0000-0000-0000000000a2');
insert into claims(artist_id,user_id,claim_number,status,visibility,dropped_at,claimed_at) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a2',1,'active','public',null,'2026-03-05 13:45:10+00'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a3',2,'active','anonymous',null,'2026-03-06 17:22:33+00'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a4',3,'active','artist',null,'2026-03-07 09:10:11+00'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a5',4,'historical','public',now(),'2026-03-08 21:00:01+00');
insert into watchlist(user_id,artist_id,named_to_artist) values
 ('00000000-0000-0000-0000-0000000000a6','00000000-0000-0000-0000-0000000000b1',true),
 ('00000000-0000-0000-0000-0000000000a7','00000000-0000-0000-0000-0000000000b1',true);

create table errs(label text, msg text);
grant all on errs to anon, authenticated;
create function t_try(p_label text, p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
  insert into errs values (p_label, 'ok');
exception when others then
  insert into errs values (p_label, sqlerrm);
end $$;
grant execute on function t_try(text,text) to anon, authenticated;

-- ---- mark_artist_verified: privileges ----
select ok(has_function_privilege('service_role','mark_artist_verified(uuid,uuid)','execute'), 'service_role can mark_artist_verified');
select ok(not has_function_privilege('authenticated','mark_artist_verified(uuid,uuid)','execute'), 'authenticated cannot');
select ok(not has_function_privilege('anon','mark_artist_verified(uuid,uuid)','execute'), 'anon cannot');
select ok(not has_function_privilege('public','mark_artist_verified(uuid,uuid)','execute'), 'public cannot');
select ok(not has_function_privilege('authenticated','artist_owner_guard(uuid)','execute'), 'guard not callable by authenticated');
select ok(not has_function_privilege('anon','artist_owner_guard(uuid)','execute'), 'guard not callable by anon');
select ok(not has_function_privilege('authenticated','artist_owner(uuid)','execute'), 'artist_owner not callable by authenticated');
select ok(not has_function_privilege('anon','artist_owner(uuid)','execute'), 'artist_owner not callable by anon');
select is((select count(*)::int from pg_proc where pronamespace='public'::regnamespace
   and proname in ('set_top_songs','set_donation_url','set_artist_state','artist_audience','artist_watch_counts','report_artist','artist_owner','artist_owner_guard','mark_artist_verified')
   and coalesce(proconfig,'{}') @> array['search_path=public, pg_temp']), 9, 'all 9 functions pin search_path = public, pg_temp');

-- ---- mark_artist_verified: effects ----
select mark_artist_verified('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a3');
select ok((select verified_at is not null and status='live' from artists where id='00000000-0000-0000-0000-0000000000b2'), 'pending -> live and verified_at set');
select is((select owner_id from artist_owners where artist_id='00000000-0000-0000-0000-0000000000b2'), '00000000-0000-0000-0000-0000000000a3'::uuid, 'owner row created');
select mark_artist_verified('00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-0000000000a3');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b4'), 'live', 'disputed cleared to live');
select mark_artist_verified('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a3');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b3'), 'delisted', 'delisted stays delisted');
select ok((select verified_at is not null from artists where id='00000000-0000-0000-0000-0000000000b3')
      and (select owner_id from artist_owners where artist_id='00000000-0000-0000-0000-0000000000b3')='00000000-0000-0000-0000-0000000000a3', 'delisted page still gets verified_at and owner');
update artists set verified_at='2020-01-01' where id='00000000-0000-0000-0000-0000000000b2';
select mark_artist_verified('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a4');
select is((select owner_id from artist_owners where artist_id='00000000-0000-0000-0000-0000000000b2'), '00000000-0000-0000-0000-0000000000a4'::uuid, 'second user replaces owner');
select is((select count(*)::int from artist_owners where artist_id='00000000-0000-0000-0000-0000000000b2'), 1, 'still one owner row');
select ok((select verified_at > '2021-01-01' from artists where id='00000000-0000-0000-0000-0000000000b2'), 'verified_at refreshed to now()');
-- failure: unknown artist
select t_try('mv_noartist','select mark_artist_verified(''00000000-0000-0000-0000-00000000ffff'',''00000000-0000-0000-0000-0000000000a3'')');
select isnt((select msg from errs where label='mv_noartist'), 'ok', 'unknown artist errors');
select is((select count(*)::int from artist_owners where artist_id='00000000-0000-0000-0000-00000000ffff'), 0, 'no owner row for unknown artist');
-- failure: unknown user (FK) leaves nothing partial
select t_try('mv_nouser','select mark_artist_verified(''00000000-0000-0000-0000-0000000000b6'',''00000000-0000-0000-0000-00000000eeee'')');
select isnt((select msg from errs where label='mv_nouser'), 'ok', 'unknown user errors');
select is((select count(*)::int from artist_owners where artist_id='00000000-0000-0000-0000-0000000000b6'), 0, 'no owner row after failure');
select ok((select verified_at is null and status='pending' from artists where id='00000000-0000-0000-0000-0000000000b6'), 'artist unchanged after failure');

-- ---- one definition of verified: report on owner-row-but-unverified page ----
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a7"}',true);
select t_try('rep_owner_unv','select report_artist(''00000000-0000-0000-0000-0000000000b5'',''not them'')');
reset role;
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b5'), 'disputed', 'owner row without verified_at is still reportable');

-- ---- audience: since truncation and native ordering ----
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select is((select since from artist_audience('00000000-0000-0000-0000-0000000000b1') where claim_number=2), '2026-03-06 00:00:00+00'::timestamptz, 'anonymous claim since truncated to the day');
select is((select since from artist_audience('00000000-0000-0000-0000-0000000000b1') where claim_number=1), '2026-03-05 13:45:10+00'::timestamptz, 'public claim since exact');
select is((select since from artist_audience('00000000-0000-0000-0000-0000000000b1') where claim_number=3), '2026-03-07 09:10:11+00'::timestamptz, 'artist-level claim since exact');
select is((select array_agg(k order by rn) from (
    select kind || ':' || coalesce(claim_number::text, handle) as k, row_number() over () as rn
    from artist_audience('00000000-0000-0000-0000-0000000000b1')) x),
  array['claimer:1','claimer:2','claimer:3','claimer:4','watcher:test_6','watcher:test_7'], 'native order: claimers by number, then watchers');

-- ---- URL validation (songs and donation) ----
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
create temp table bad(u text);
create temp table good(u text);
reset role;
insert into bad values ('https://localhost./x'),('https://localhost/x'),('https://1.2.3.4/x'),('https://a./'),
 ('https://exa mple.com'),(E'https://example.com/a\tb'),(E'https://example.com/a\nb'),('https://-a.com'),('https://a-.com'),
 ('http://x.com'),('javascript:alert(1)'),('data:text/html,x'),('https://example.com./x'),('https://user@example.com/'),('https://a..com/');
insert into good values ('https://example.com/a?b=1#c'),('https://sub.example.co.uk:8443/x'),('https://xn--bcher-kva.example/'),('https://example.com');
grant all on bad, good to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select t_try('song_bad_'||row_number() over (), format('select set_top_songs(%L, %L)','00000000-0000-0000-0000-0000000000b1', jsonb_build_array(jsonb_build_object('title','A','url',u))::text)) from bad;
select t_try('don_bad_'||row_number() over (), format('select set_donation_url(%L, %L)','00000000-0000-0000-0000-0000000000b1', u)) from bad;
select t_try('song_good_'||row_number() over (), format('select set_top_songs(%L, %L)','00000000-0000-0000-0000-0000000000b1', jsonb_build_array(jsonb_build_object('title','A','url',u))::text)) from good;
select t_try('don_good_'||row_number() over (), format('select set_donation_url(%L, %L)','00000000-0000-0000-0000-0000000000b1', u)) from good;
select is((select count(*)::int from errs where label like 'song_bad_%' and msg='invalid_song_url'), 15, 'all 15 bad song urls rejected with invalid_song_url');
select is((select count(*)::int from errs where label like 'don_bad_%' and msg='invalid_donation_url'), 15, 'all 15 bad donation urls rejected with invalid_donation_url');
select is((select count(*)::int from errs where label like 'song_good_%' and msg='ok'), 4, 'all 4 good song urls accepted');
select is((select count(*)::int from errs where label like 'don_good_%' and msg='ok'), 4, 'all 4 good donation urls accepted');
select t_try('song_long', format('select set_top_songs(%L,%L)','00000000-0000-0000-0000-0000000000b1', jsonb_build_array(jsonb_build_object('title','A','url','https://example.com/'||repeat('x',501-20)))::text));
select is((select msg from errs where label='song_long'), 'invalid_song_url', '501-char song url still rejected');
select t_try('don_long', format('select set_donation_url(%L,%L)','00000000-0000-0000-0000-0000000000b1', 'https://example.com/'||repeat('x',301-20)));
select is((select msg from errs where label='don_long'), 'invalid_donation_url', '301-char donation url still rejected');

select * from finish();
rollback;
