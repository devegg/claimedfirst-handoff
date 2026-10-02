begin;
select plan(14);

insert into auth.users(id,email)
 select format('00000000-0000-0000-0000-0000000000a%s', g)::uuid, format('t%s@example.test', g) from generate_series(1,3) g;
insert into profiles(id,handle)
 select format('00000000-0000-0000-0000-0000000000a%s', g)::uuid, format('test_%s', g) from generate_series(1,3) g;
-- c1 live, verified, owned by test_1 (test_2 is a claimant). c2 live, unverified, no owner.
insert into artists(id,name,slug,status,verified_at,next_claim_number) values
 ('00000000-0000-0000-0000-0000000000c1','Test Artist 1','test-artist-1','live',now(),2),
 ('00000000-0000-0000-0000-0000000000c2','Test Artist 2','test-artist-2','live',null,1);
insert into artist_owners(artist_id,owner_id) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1');
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

select ok(has_function_privilege('authenticated','set_record_style(uuid,text)','execute'), 'authenticated can execute');
select ok(not has_function_privilege('anon','set_record_style(uuid,text)','execute'), 'anon cannot');
select ok(not has_function_privilege('public','set_record_style(uuid,text)','execute'), 'public cannot');
select ok((select coalesce(proconfig,'{}') @> array['search_path=public, pg_temp'] from pg_proc where proname='set_record_style' and pronamespace='public'::regnamespace), 'search_path pinned');
select ok((select prosecdef from pg_proc where proname='set_record_style' and pronamespace='public'::regnamespace), 'security definer');
select is((select record_style from artists where id='00000000-0000-0000-0000-0000000000c1'), null, 'style starts null');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select t_try('own_set','select set_record_style(''00000000-0000-0000-0000-0000000000c1'',''ember'')');
select ok((select msg='ok' from errs where label='own_set'), 'owner can set ember');
reset role;
select is((select record_style from artists where id='00000000-0000-0000-0000-0000000000c1'), 'ember', 'ember stored');

set local role anon;
select is((select record_style from artists where slug='test-artist-1'), 'ember', 'anon reads the style through the public artists read');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select t_try('own_bad','select set_record_style(''00000000-0000-0000-0000-0000000000c1'',''custom.png'')');
select ok((select msg like '%invalid_style%' or msg like '%record_style%check%' from errs where label='own_bad'), 'custom.png rejected');
select t_try('own_null','select set_record_style(''00000000-0000-0000-0000-0000000000c1'',null)');
reset role;
select is((select record_style from artists where id='00000000-0000-0000-0000-0000000000c1'), null, 'null clears the style');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a3"}',true);
select t_try('non_owner','select set_record_style(''00000000-0000-0000-0000-0000000000c1'',''tide'')');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2"}',true);
select t_try('claimant','select set_record_style(''00000000-0000-0000-0000-0000000000c1'',''tide'')');
select t_try('unowned','select set_record_style(''00000000-0000-0000-0000-0000000000c2'',''tide'')');
select set_config('request.jwt.claims','',true);
select t_try('noauth','select set_record_style(''00000000-0000-0000-0000-0000000000c1'',''tide'')');
reset role;
select ok((select bool_and(msg like '%not_owner%') from errs where label in ('non_owner','claimant','unowned'))
  and (select msg like '%not_authenticated%' from errs where label='noauth'), 'non-owner, claimant, unowned fail; signed out not_authenticated');
select is((select record_style from artists where id in ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c2') limit 1), null, 'no failed call changed a row');

do $$ begin
  update artists set record_style = 'custom.png' where id = '00000000-0000-0000-0000-0000000000c1';
  insert into errs values ('direct','ok');
exception when check_violation then
  insert into errs values ('direct', sqlstate);
end $$;
select is((select msg from errs where label='direct'), '23514', 'column check rejects a bad value on a direct update');
select * from finish();
rollback;
