begin;
select plan(16);

insert into auth.users(id,email)
 select format('00000000-0000-0000-0000-0000000000a%s', g)::uuid, format('t%s@example.test', g) from generate_series(1,5) g;
insert into profiles(id,handle)
 select format('00000000-0000-0000-0000-0000000000a%s', g)::uuid, format('test_%s', g) from generate_series(1,5) g;
-- c1 live, c2 delisted, c3 disputed, c4 pending: all owned by test_1. c5 live with no owner.
insert into artists(id,name,slug,status,verified_at,next_claim_number,claims_frozen,donation_url) values
 ('00000000-0000-0000-0000-0000000000c1','Test Artist 1','test-artist-1','live',now(),2,true,'https://example.com/tip'),
 ('00000000-0000-0000-0000-0000000000c2','Test Artist 2','test-artist-2','delisted',now(),1,false,null),
 ('00000000-0000-0000-0000-0000000000c3','Test Artist 3','test-artist-3','disputed',null,1,false,null),
 ('00000000-0000-0000-0000-0000000000c4','Test Artist 4','test-artist-4','pending',null,1,false,null),
 ('00000000-0000-0000-0000-0000000000c5','Test Artist 5','test-artist-5','live',null,1,false,null);
insert into artist_owners(artist_id,owner_id) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-0000000000a1');
insert into claims(artist_id,user_id,claim_number,status,visibility) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a2',1,'active','public');

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

select ok(has_function_privilege('authenticated','my_owned_artist(text)','execute'), 'authenticated can execute');
select ok(not has_function_privilege('anon','my_owned_artist(text)','execute'), 'anon cannot');
select ok(not has_function_privilege('public','my_owned_artist(text)','execute'), 'public cannot');
select ok((select coalesce(proconfig,'{}') @> array['search_path=public, pg_temp'] from pg_proc where proname='my_owned_artist' and pronamespace='public'::regnamespace), 'search_path pinned');
select is((select proargnames[2:] from pg_proc where proname='my_owned_artist' and pronamespace='public'::regnamespace),
  array['id','name','slug','status','claims_frozen','donation_url','verified_at'], 'result columns: no owner or user id');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select is((select status from my_owned_artist('test-artist-1')), 'live', 'owner gets live artist');
select ok((select claims_frozen and donation_url='https://example.com/tip' and verified_at is not null and name='Test Artist 1' and id='00000000-0000-0000-0000-0000000000c1'::uuid from my_owned_artist('test-artist-1')), 'row carries fields');
select is((select status from my_owned_artist('test-artist-2')), 'delisted', 'owner gets delisted artist');
select is((select status from my_owned_artist('test-artist-3')), 'disputed', 'owner gets disputed artist');
select is((select status from my_owned_artist('test-artist-4')), 'pending', 'owner gets pending artist');
select is((select count(*)::int from my_owned_artist('test-artist-5')), 0, 'owner gets nothing for an artist with no owner');
select is((select count(*)::int from my_owned_artist('no-such-artist')), 0, 'unknown slug returns nothing');

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a3"}',true);
select is((select count(*)::int from my_owned_artist('test-artist-1')), 0, 'non-owner gets nothing (live)');
select is((select count(*)::int from my_owned_artist('test-artist-2')), 0, 'non-owner gets nothing (delisted)');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2"}',true);
select is((select count(*)::int from my_owned_artist('test-artist-1')), 0, 'claimant is not an owner');

select set_config('request.jwt.claims','',true);
select t_try('noauth','select * from my_owned_artist(''test-artist-1'')');
select ok((select msg like '%not_authenticated%' from errs where label='noauth'), 'signed out: not_authenticated');
reset role;

select * from finish();
rollback;
