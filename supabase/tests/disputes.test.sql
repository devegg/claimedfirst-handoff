begin;
select plan(29);

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','t1@example.test'),
 ('00000000-0000-0000-0000-0000000000a2','t2@example.test'),
 ('00000000-0000-0000-0000-0000000000a3','t3@example.test'),
 ('00000000-0000-0000-0000-0000000000a4','t4@example.test');
insert into profiles(id,handle,created_at) values
 ('00000000-0000-0000-0000-0000000000a1','test_1', now() - interval '8 days'),
 ('00000000-0000-0000-0000-0000000000a2','test_2', now() - interval '2 days'),
 ('00000000-0000-0000-0000-0000000000a3','test_3', now() - interval '8 days'),
 ('00000000-0000-0000-0000-0000000000a4','test_4', now() - interval '8 days');
-- b1 live unverified (old reporter), b2 live unverified (young reporter), b3 live verified, b4 pending,
-- b5 disputed-from-live past the window, b6 disputed-from-live inside the window,
-- b7 disputed-from-pending past the window, b8 verified but disputed past the window, b9 disputed-from-live to be verified
insert into artists(id,name,slug,status,verified_at,disputed_at,disputed_from) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live',null,null,null),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist 2','test-artist-2','live',null,null,null),
 ('00000000-0000-0000-0000-0000000000b3','Test Artist 3','test-artist-3','live',now(),null,null),
 ('00000000-0000-0000-0000-0000000000b4','Test Artist 4','test-artist-4','pending',null,null,null),
 ('00000000-0000-0000-0000-0000000000b5','Test Artist 5','test-artist-5','disputed',null,now() - interval '73 hours','live'),
 ('00000000-0000-0000-0000-0000000000b6','Test Artist 6','test-artist-6','disputed',null,now() - interval '71 hours','live'),
 ('00000000-0000-0000-0000-0000000000b7','Test Artist 7','test-artist-7','disputed',null,now() - interval '80 hours','pending'),
 ('00000000-0000-0000-0000-0000000000b8','Test Artist 8','test-artist-8','disputed',now(),now() - interval '80 hours','live'),
 ('00000000-0000-0000-0000-0000000000b9','Test Artist 9','test-artist-9','disputed',null,now() - interval '1 hour','live');
insert into artist_links(artist_id,platform,canonical_key,url,is_primary) values
 ('00000000-0000-0000-0000-0000000000b1','web','web:t1.example','https://t1.example',true),
 ('00000000-0000-0000-0000-0000000000b4','web','web:t4.example','https://t4.example',true);
insert into top_songs(artist_id,position,title,url) values
 ('00000000-0000-0000-0000-0000000000b1',1,'Test Song','https://t1.example/s');

create table errs(label text, msg text);
grant all on errs to anon, authenticated;
create function t_try(p_label text, p_sql text) returns void language plpgsql as $$
begin execute p_sql; insert into errs values (p_label, 'ok');
exception when others then insert into errs values (p_label, sqlerrm); end $$;
grant execute on function t_try(text,text) to anon, authenticated;
create function t_reads(p_label text) returns void language plpgsql as $$
begin
  insert into errs values (p_label || ':artists', (select count(*)::text from artists where id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-0000000000b5','00000000-0000-0000-0000-0000000000b7')));
  insert into errs values (p_label || ':links', (select count(*)::text from artist_links));
  insert into errs values (p_label || ':songs', (select count(*)::text from top_songs));
end $$;
grant execute on function t_reads(text) to anon, authenticated;

-- privileges and window
select is(dispute_window(), interval '72 hours', 'dispute_window is 72 hours');
select ok(has_function_privilege('service_role','restore_expired_disputes()','execute'), 'service_role can restore_expired_disputes');
select ok(not has_function_privilege('authenticated','restore_expired_disputes()','execute'), 'authenticated cannot');
select ok(not has_function_privilege('anon','restore_expired_disputes()','execute'), 'anon cannot');
select ok(not has_function_privilege('public','restore_expired_disputes()','execute'), 'public cannot');

-- old account reports a live unverified page
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select report_artist('00000000-0000-0000-0000-0000000000b1','Test reason');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b1'), 'disputed', 'old account report disputes a live unverified page');
select is((select disputed_from from artists where id='00000000-0000-0000-0000-0000000000b1'), 'live', 'disputed_from records live');
select ok((select disputed_at is not null from artists where id='00000000-0000-0000-0000-0000000000b1'), 'disputed_at recorded');
select is((select count(*)::int from artist_reports where artist_id='00000000-0000-0000-0000-0000000000b1'), 1, 'report stored');

-- a disputed-from-live page stays publicly readable but cannot be claimed
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a3', true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select t_try('claim_disputed','select claim_artist(''00000000-0000-0000-0000-0000000000b1'')');
select is((select msg from errs where label='claim_disputed'), 'artist_not_claimable', 'a disputed page cannot be claimed');
set local role anon; select t_reads('anon'); reset role;
select is((select msg from errs where label='anon:artists'), '2', 'anon reads disputed-from-live pages (b1, b5) and not pending-origin ones (b4, b7)');
select is((select msg from errs where label='anon:links'), '1', 'anon reads artist_links of a disputed-from-live page, not of a pending page');
select is((select msg from errs where label='anon:songs'), '1', 'anon reads top_songs of a disputed-from-live page');

-- young account: stored only
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2', true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select t_try('young_report','select report_artist(''00000000-0000-0000-0000-0000000000b2'',''Test reason'')');
select is((select msg from errs where label='young_report'), 'account_too_new', 'young account report is rejected (0041)');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b2'), 'live', 'young account report leaves the page live');
select is((select count(*)::int from artist_reports where artist_id='00000000-0000-0000-0000-0000000000b2'), 0, 'young account report is not stored');

-- verified page unchanged, pending page disputed and hidden
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select report_artist('00000000-0000-0000-0000-0000000000b3','Test reason');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b3'), 'live', 'report on a verified page changes nothing');
select report_artist('00000000-0000-0000-0000-0000000000b4','Test reason');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b4'), 'pending', 'report on a pending page is recorded but does not dispute it (0031)');
select is((select count(*)::int from artist_reports where artist_id='00000000-0000-0000-0000-0000000000b4'), 1, 'the pending page report is stored for review');
set local role anon; delete from errs where label like 'anon2%'; select t_reads('anon2'); reset role;
select is((select msg from errs where label='anon2:artists'), '2', 'the pending page stays hidden');

-- a second report does not restart the window
select is((select disputed_at from artists where id='00000000-0000-0000-0000-0000000000b1') <= now(), true, 'sanity');

-- restore
select is(restore_expired_disputes(), 2, 'restores exactly the expired unverified pages');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b5'), 'live', 'live-origin page restored to live');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b7'), 'pending', 'pending-origin page restored to pending');
select ok((select disputed_at is null and disputed_from is null from artists where id='00000000-0000-0000-0000-0000000000b5'), 'dispute fields cleared');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b6'), 'disputed', 'a dispute inside the window is not restored');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b8'), 'disputed', 'a verified page is left alone');
select is(restore_expired_disputes(), 0, 'nothing left to restore');

-- verification clears the dispute
select mark_artist_verified('00000000-0000-0000-0000-0000000000b9','00000000-0000-0000-0000-0000000000a4');
select ok((select status='live' and disputed_at is null and disputed_from is null and verified_at is not null from artists where id='00000000-0000-0000-0000-0000000000b9'), 'verification clears the dispute and sets live');

select * from finish();
rollback;
