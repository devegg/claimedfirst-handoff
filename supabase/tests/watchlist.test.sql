begin;
select plan(34);

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','t1@example.test'),
 ('00000000-0000-0000-0000-0000000000a2','t2@example.test');
insert into profiles(id,handle,default_watch_named) values
 ('00000000-0000-0000-0000-0000000000a1','test_1',true),
 ('00000000-0000-0000-0000-0000000000a2','test_2',false);
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live'),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist 2','test-artist-2','pending');
-- 101 more live artists for the cap
insert into artists(id,name,slug,status)
 select format('00000000-0000-0000-0001-%s', lpad(g::text,12,'0'))::uuid, 'Test Cap Artist '||g, 'test-cap-artist-'||g, 'live'
 from generate_series(1,101) g;

select ok(has_function_privilege('authenticated','watch_artist(uuid,boolean)','execute'), 'authenticated can watch_artist');
select ok(not has_function_privilege('anon','watch_artist(uuid,boolean)','execute'), 'anon cannot watch_artist');
select ok(not has_function_privilege('public','watch_artist(uuid,boolean)','execute'), 'public cannot watch_artist');
select ok(not has_function_privilege('anon','unwatch_artist(uuid)','execute'), 'anon cannot unwatch_artist');
select is(watchlist_limit(), 100, 'limit is 100');

select set_config('request.jwt.claims','{}',true);
select throws_ok($$select watch_artist('00000000-0000-0000-0000-0000000000b1')$$, 'not_authenticated', 'watch needs sign-in');

-- scout 1 (default_watch_named = true)
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select throws_ok($$select watch_artist('00000000-0000-0000-0000-0000000000b2')$$, 'artist_not_claimable', 'pending artist cannot be watched');
select is((watch_artist('00000000-0000-0000-0000-0000000000b1')).named_to_artist, true, 'null uses profile default (true)');
select lives_ok($$select watch_artist('00000000-0000-0000-0000-0000000000b1', false)$$, 'watching again is fine');
select is((select count(*)::int from watchlist where user_id='00000000-0000-0000-0000-0000000000a1'), 1, 'still one row');
select is((select named_to_artist from watchlist where user_id='00000000-0000-0000-0000-0000000000a1'), false, 'second call updated named flag');

-- scout 2 watches the same artist; unwatch by scout 1 leaves it
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2"}',true);
select is((watch_artist('00000000-0000-0000-0000-0000000000b1')).named_to_artist, false, 'scout 2 default false');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select lives_ok($$select unwatch_artist('00000000-0000-0000-0000-0000000000b1')$$, 'unwatch');
select is((select count(*)::int from watchlist), 1, 'only scout 1 row removed');

-- cap: scout 1 gets 99 rows directly (superuser), then 100th ok and 101st rejected
insert into watchlist(user_id,artist_id)
 select '00000000-0000-0000-0000-0000000000a1', format('00000000-0000-0000-0001-%s', lpad(g::text,12,'0'))::uuid
 from generate_series(1,99) g;
select is((select count(*)::int from watchlist where user_id='00000000-0000-0000-0000-0000000000a1'), 99, '99 watches in place');
select lives_ok($$select watch_artist('00000000-0000-0000-0001-000000000100')$$, 'the 100th watch succeeds');
select throws_ok($$select watch_artist('00000000-0000-0000-0001-000000000101')$$, 'watchlist_full', 'the 101st watch raises watchlist_full');
select is((select count(*)::int from watchlist where user_id='00000000-0000-0000-0000-0000000000a1'), 100, 'exactly 100 rows');

-- at exactly 100 rows, touching an artist already on the list must not count as a new insert
select lives_ok($$select watch_artist('00000000-0000-0000-0001-000000000001')$$, 'at 100: re-watching an artist already listed succeeds');
select is((select count(*)::int from watchlist where user_id='00000000-0000-0000-0000-0000000000a1'), 100, 'at 100: still 100 rows after re-watch');
select lives_ok($$select watch_artist('00000000-0000-0000-0001-000000000001', true)$$, 'at 100: watch_artist can change the named flag');
select is((select named_to_artist from watchlist where user_id='00000000-0000-0000-0000-0000000000a1' and artist_id='00000000-0000-0000-0001-000000000001'), true, 'at 100: flag set to true via watch_artist');
select lives_ok($$select set_watch_named('00000000-0000-0000-0001-000000000001', false)$$, 'at 100: set_watch_named succeeds');
select is((select named_to_artist from watchlist where user_id='00000000-0000-0000-0000-0000000000a1' and artist_id='00000000-0000-0000-0001-000000000001'), false, 'at 100: flag set to false via set_watch_named');
select throws_ok($$select watch_artist('00000000-0000-0000-0001-000000000101')$$, 'watchlist_full', 'at 100: a new artist is still rejected');

-- owner RLS as the authenticated scout 1: select and delete own rows only; no direct update
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select is((select count(*)::int from public.watchlist), 100, 'owner sees exactly own 100 rows');
select is((select count(*)::int from public.watchlist where user_id='00000000-0000-0000-0000-0000000000a2'), 0, 'other scout rows not visible');
do $$ declare n int; begin
  delete from public.watchlist where user_id='00000000-0000-0000-0000-0000000000a2';
  get diagnostics n = row_count; perform set_config('test.del_other', n::text, true);
  update public.watchlist set named_to_artist = true where artist_id='00000000-0000-0000-0001-000000000001';
  get diagnostics n = row_count; perform set_config('test.upd_own', n::text, true);
  delete from public.watchlist where artist_id='00000000-0000-0000-0001-000000000002';
  get diagnostics n = row_count; perform set_config('test.del_own', n::text, true);
end $$;
reset role;
select is(current_setting('test.del_other'), '0', 'deleting another scout row affects 0 rows');
select is(current_setting('test.upd_own'), '0', 'direct update of named_to_artist affects 0 rows');
select is((select named_to_artist from watchlist where user_id='00000000-0000-0000-0000-0000000000a1' and artist_id='00000000-0000-0000-0001-000000000001'), false, 'named flag unchanged after denied update');
select is(current_setting('test.del_own'), '1', 'owner can delete own row');
select is((select count(*)::int from watchlist where user_id='00000000-0000-0000-0000-0000000000a1'), 99, 'own row count dropped to 99');
select is((select count(*)::int from watchlist where user_id='00000000-0000-0000-0000-0000000000a2'), 1, 'other scout row still present');

-- a direct INSERT by an authenticated scout is denied (no insert policy)
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2"}',true);
do $$ begin
  insert into public.watchlist(user_id,artist_id) values ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0001-000000000001');
  perform set_config('test.direct_insert','allowed',true);
exception when others then
  perform set_config('test.direct_insert', sqlstate, true);
end $$;
select is(current_setting('test.direct_insert'), '42501', 'direct insert denied by RLS');

reset role;
select * from finish();
rollback;
