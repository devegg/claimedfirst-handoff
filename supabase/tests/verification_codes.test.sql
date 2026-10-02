begin;
select plan(13);
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','t1@example.test'),
 ('00000000-0000-0000-0000-0000000000a2','t2@example.test');
insert into profiles(id,handle) values
 ('00000000-0000-0000-0000-0000000000a1','test_1'),
 ('00000000-0000-0000-0000-0000000000a2','test_2');
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','pending'),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist 2','test-artist-2','pending'),
 ('00000000-0000-0000-0000-0000000000b3','Test Artist 3','test-artist-3','pending');
-- fresh code for b1/a1; stale code (issued 25 hours ago, then checked 1 hour ago) for b2/a1; code for b3/a2
insert into verification_attempts(artist_id,user_id,code,result,checked_at) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','cf-FRESH1',null, now() - interval '23 hours'),
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1','cf-STALE1',null, now() - interval '25 hours'),
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1','cf-STALE1','not_found', now() - interval '1 hour'),
 ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a2','cf-OTHER1',null, now());

create table errs(label text, msg text);
create function t_ver(p_label text, p_artist uuid, p_user uuid, p_code text) returns void language plpgsql as $$
begin perform verify_artist_with_code(p_artist, p_user, p_code, 'https://example.test/x'); insert into errs values (p_label, 'ok');
exception when others then insert into errs values (p_label, sqlerrm); end $$;

select ok(has_function_privilege('service_role','verify_artist_with_code(uuid,uuid,text,text)','execute'), 'service_role can verify with a code');
select ok(not has_function_privilege('authenticated','verify_artist_with_code(uuid,uuid,text,text)','execute'), 'authenticated cannot');
select ok(not has_function_privilege('anon','verify_artist_with_code(uuid,uuid,text,text)','execute'), 'anon cannot');
select ok(not has_function_privilege('public','verify_artist_with_code(uuid,uuid,text,text)','execute'), 'public cannot');

select t_ver('stale',  '00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1','cf-STALE1');
select is((select msg from errs where label='stale'), 'code_expired', 'a code first issued more than 24 hours ago is refused');
select is((select verified_at is null from artists where id='00000000-0000-0000-0000-0000000000b2'), true, 'an expired code verifies nothing');
select t_ver('wronguser', '00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a2','cf-FRESH1');
select is((select msg from errs where label='wronguser'), 'code_not_issued', 'a code issued to another account does not work');
select t_ver('fresh',  '00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','cf-FRESH1');
select is((select msg from errs where label='fresh'), 'ok', 'a code inside 24 hours verifies');
select ok((select verified_at is not null and status='live' from artists where id='00000000-0000-0000-0000-0000000000b1'), 'verified_at and live status set together');
select is((select owner_id from artist_owners where artist_id='00000000-0000-0000-0000-0000000000b1'), '00000000-0000-0000-0000-0000000000a1'::uuid, 'owner set in the same call');
select t_ver('again',  '00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','cf-FRESH1');
select is((select msg from errs where label='again'), 'code_used', 'the same code cannot verify again');
select is((select count(*)::int from verification_attempts where code='cf-FRESH1' and result='found'), 1, 'one success row for the code');
select t_ver('nocode', '00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a2','cf-NOPE99');
select is((select msg from errs where label='nocode'), 'code_not_issued', 'an unknown code is refused');
select * from finish();
rollback;
