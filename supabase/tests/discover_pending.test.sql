begin;
select plan(8);
insert into auth.users(id,email)
 select format('00000000-0000-0000-0000-0000000000d%s', g)::uuid, format('d%s@example.test', g) from generate_series(1,3) g;
insert into profiles(id,handle)
 select format('00000000-0000-0000-0000-0000000000d%s', g)::uuid, format('disc_%s', g) from generate_series(1,3) g;
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000e1','Pending One','pending-one','pending'),
 ('00000000-0000-0000-0000-0000000000e2','Live One','live-one','live'),
 ('00000000-0000-0000-0000-0000000000e3','Delisted One','delisted-one','delisted');
insert into artist_submissions(artist_id,user_id) values
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d1'),
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d2');

select ok(has_function_privilege('anon','pending_artists_public(int)','execute'), 'anon can execute');
select ok(has_function_privilege('authenticated','pending_artists_public(int)','execute'), 'authenticated can execute');
select ok(not has_function_privilege('public','pending_artists_public(int)','execute'), 'public grant revoked');
select ok((select coalesce(proconfig,'{}') @> array['search_path=public, pg_temp'] from pg_proc where proname='pending_artists_public' and pronamespace='public'::regnamespace), 'search_path pinned');
select is((select proargnames from pg_proc where proname='pending_artists_public' and pronamespace='public'::regnamespace),
  array['p_limit','id','name','scouts_submitted','created_at','needed','slug'], 'columns: no submitter ids');
set local role anon;
select is((select count(*)::int from pending_artists_public(20)), 1, 'anon sees only the pending artist');
select is((select scouts_submitted from pending_artists_public(20)), 2, 'distinct submitter count');
select ok((select slug is not null from pending_artists_public(20)), 'slug returned');
reset role;
select * from finish();
rollback;
