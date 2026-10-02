begin;
select plan(11);
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','t1@example.test'),
 ('00000000-0000-0000-0000-0000000000a2','t2@example.test');
insert into profiles(id,handle,created_at) values
 ('00000000-0000-0000-0000-0000000000a1','test_1', now() - interval '8 days'),
 ('00000000-0000-0000-0000-0000000000a2','test_2', now() - interval '8 days');
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','pending'),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist 2','test-artist-2','live'),
 ('00000000-0000-0000-0000-0000000000b3','Test Artist 3','test-artist-3','live'),
 ('00000000-0000-0000-0000-0000000000b4','Test Artist 4','test-artist-4','live'),
 ('00000000-0000-0000-0000-0000000000b5','Test Artist 5','test-artist-5','live'),
 ('00000000-0000-0000-0000-0000000000b6','Test Artist 6','test-artist-6','live');
create table errs(label text, msg text);
grant all on errs to authenticated;
create function t_rep(p_label text, p_artist uuid) returns void language plpgsql as $$
begin perform report_artist(p_artist, 'Test reason'); insert into errs values (p_label, 'ok');
exception when others then insert into errs values (p_label, sqlerrm); end $$;
grant execute on function t_rep(text, uuid) to authenticated;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}',true);
select t_rep('r1','00000000-0000-0000-0000-0000000000b1'); -- pending
select t_rep('r2','00000000-0000-0000-0000-0000000000b2');
select t_rep('r3','00000000-0000-0000-0000-0000000000b3');
select t_rep('r4','00000000-0000-0000-0000-0000000000b4');
select t_rep('r5','00000000-0000-0000-0000-0000000000b5');
select t_rep('r6','00000000-0000-0000-0000-0000000000b6');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}',true);
select t_rep('other','00000000-0000-0000-0000-0000000000b6');
reset role;

select is((select count(*)::int from errs where label in ('r1','r2','r3','r4','r5') and msg='ok'), 5, 'the first five reports in 24 hours are accepted');
select is((select msg from errs where label='r6'), 'report_limit_reached', 'the sixth report in 24 hours is refused');
select is((select count(*)::int from artist_reports where reporter_id='00000000-0000-0000-0000-0000000000a1'), 5, 'the refused report was not stored');
select is((select msg from errs where label='other'), 'ok', 'another account is not limited');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b1'), 'pending', 'a report on a pending page leaves it pending');
select is((select disputed_at is null and disputed_from is null from artists where id='00000000-0000-0000-0000-0000000000b1'), true, 'a report on a pending page starts no dispute window');
select is((select count(*)::int from artist_reports where artist_id='00000000-0000-0000-0000-0000000000b1'), 1, 'the pending page report is recorded for manual review');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b2'), 'disputed', 'a report from an old account on a live unverified page still starts a dispute');
select ok(has_function_privilege('authenticated','report_artist(uuid,text)','execute'), 'signed-in accounts can report');
select ok(not has_function_privilege('anon','report_artist(uuid,text)','execute'), 'anonymous visitors cannot report');
select is((select hits from rate_limits where key='report:00000000-0000-0000-0000-0000000000a1' and window_start > now() - interval '24 hours'), 5, 'the refused attempt rolls back with the call, so the count stays at the limit');
select * from finish();
rollback;
