begin;
select plan(24);

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','t1@example.test'),
 ('00000000-0000-0000-0000-0000000000a2','t2@example.test');
insert into profiles(id,handle) values
 ('00000000-0000-0000-0000-0000000000a1','test_1'),
 ('00000000-0000-0000-0000-0000000000a2','test_2');
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live'),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist 2','test-artist-2','live'),
 ('00000000-0000-0000-0000-0000000000b3','Test Artist 3','test-artist-3','live');
-- two claims each, direct inserts as superuser
insert into claims(id,artist_id,user_id,claim_number,visibility) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1',1,'public'),
 ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1',1,'public'),
 ('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a2',2,'public'),
 ('00000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a2',2,'public');
insert into watchlist(user_id,artist_id,named_to_artist) values
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1',false),
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b2',false),
 ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000b1',false);

-- privileges
select ok(has_function_privilege('authenticated','set_all_claim_visibility(text)','execute'), 'authenticated can set_all_claim_visibility');
select ok(not has_function_privilege('anon','set_all_claim_visibility(text)','execute'), 'anon cannot set_all_claim_visibility');
select ok(not has_function_privilege('public','set_all_watch_named(boolean)','execute'), 'public cannot set_all_watch_named');
select ok(not has_function_privilege('anon','set_default_visibility(text,boolean)','execute'), 'anon cannot set_default_visibility');
select ok(not has_function_privilege('anon','set_claim_visibility(uuid,text)','execute'), 'anon cannot set_claim_visibility');
select ok(not has_function_privilege('anon','set_watch_named(uuid,boolean)','execute'), 'anon cannot set_watch_named');

-- no JWT: not_authenticated (called as superuser; the function reads auth.uid())
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select set_all_claim_visibility('anonymous')$$, 'not_authenticated', 'bulk claim visibility needs sign-in');

-- scout 1 bulk functions
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select is(set_all_claim_visibility('artist'), 2, 'bulk claim visibility updates 2 rows');
select is((select count(*)::int from claims where user_id='00000000-0000-0000-0000-0000000000a1' and visibility='artist'), 2, 'scout 1 claims all artist-only');
select is((select count(*)::int from claims where user_id='00000000-0000-0000-0000-0000000000a2' and visibility='public'), 2, 'scout 2 claims untouched');
select throws_ok($$select set_all_claim_visibility('everyone')$$, '23514', null, 'invalid visibility rejected by check constraint');
select is(set_all_watch_named(true), 2, 'bulk watch named updates 2 rows');
select is((select count(*)::int from watchlist where user_id='00000000-0000-0000-0000-0000000000a2' and named_to_artist), 0, 'scout 2 watchlist untouched');

-- defaults
select lives_ok($$select set_default_visibility('anonymous', true)$$, 'defaults updated');
select is((select default_claim_visibility||'/'||default_watch_named::text from profiles where id='00000000-0000-0000-0000-0000000000a1'), 'anonymous/true', 'scout 1 defaults stored');
select is((select default_claim_visibility||'/'||default_watch_named::text from profiles where id='00000000-0000-0000-0000-0000000000a2'), 'public/false', 'scout 2 defaults untouched');
select throws_ok($$select set_default_visibility('everyone', false)$$, 'invalid_visibility', 'invalid default rejected');
select is((select count(*)::int from claims where user_id='00000000-0000-0000-0000-0000000000a1' and visibility='artist'), 2, 'defaults change did not touch existing claims');

-- single-item functions only affect the caller's rows
select lives_ok($$select set_claim_visibility('00000000-0000-0000-0000-0000000000c1','public')$$, 'own claim visibility set');
select throws_ok($$select set_claim_visibility('00000000-0000-0000-0000-0000000000c1','everyone')$$, 'invalid_visibility', 'invalid single-claim visibility rejected by the function');
select throws_ok($$select set_claim_visibility('00000000-0000-0000-0000-0000000000c3','anonymous')$$, 'not_your_claim', 'other scout claim rejected');
select throws_ok($$select set_watch_named('00000000-0000-0000-0000-0000000000b3', false)$$, 'not_watching', 'unwatched artist rejected');
select lives_ok($$select set_watch_named('00000000-0000-0000-0000-0000000000b1', false)$$, 'own watch named set');
select is((select named_to_artist from watchlist where user_id='00000000-0000-0000-0000-0000000000a2' and artist_id='00000000-0000-0000-0000-0000000000b1'), false, 'scout 2 watch untouched');

select * from finish();
rollback;
