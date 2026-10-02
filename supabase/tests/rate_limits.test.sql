begin;
select plan(23);

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','t1@example.test'),
 ('00000000-0000-0000-0000-0000000000a2','t2@example.test');
insert into profiles(id,handle,created_at) values
 ('00000000-0000-0000-0000-0000000000a1','test_1', now() - interval '8 days'),
 ('00000000-0000-0000-0000-0000000000a2','test_2', now() - interval '8 days');
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live');

create table errs(label text, msg text);
grant all on errs to anon, authenticated;

-- ---- privileges and RLS ----
select ok(has_function_privilege('service_role','rate_limit_hit(text,int,interval)','execute'), 'service_role can rate_limit_hit');
select ok(not has_function_privilege('authenticated','rate_limit_hit(text,int,interval)','execute'), 'authenticated cannot rate_limit_hit');
select ok(not has_function_privilege('anon','rate_limit_hit(text,int,interval)','execute'), 'anon cannot rate_limit_hit');
select ok(not has_function_privilege('public','rate_limit_hit(text,int,interval)','execute'), 'public cannot rate_limit_hit');
select ok(has_function_privilege('service_role','purge_rate_limits()','execute'), 'service_role can purge_rate_limits');
select ok(not has_function_privilege('authenticated','purge_rate_limits()','execute'), 'authenticated cannot purge');
select ok(not has_function_privilege('anon','purge_rate_limits()','execute'), 'anon cannot purge');
select ok(not has_function_privilege('public','purge_rate_limits()','execute'), 'public cannot purge');
select ok((select relrowsecurity from pg_class where oid='public.rate_limits'::regclass), 'RLS enabled on rate_limits');
select is((select count(*)::int from pg_policies where tablename='rate_limits'), 0, 'no policies on rate_limits');

-- ---- counting ----
select is((select array_agg(rate_limit_hit('test-key', 3, interval '1 hour') order by g) from generate_series(1,5) g),
  array[true,true,true,false,false], 'the call after the max in a window returns false');
select is(rate_limit_hit('test-other', 3, interval '1 hour'), true, 'a different key is independent');
select is(rate_limit_hit('test-key', 3, interval '1 day'), true, 'same key in a different window size starts its own count');

-- new window resets: an old exhausted window does not block the current one
insert into rate_limits(key, window_start, hits) values ('test-old', now() - interval '3 hours', 99);
select is(rate_limit_hit('test-old', 1, interval '1 hour'), true, 'a new window resets the count');
select is((select hits from rate_limits where key='test-old' and window_start > now() - interval '1 hour'), 1, 'new window row counts from 1');

-- ---- purge ----
insert into rate_limits(key, window_start, hits) values
 ('test-purge', now() - interval '3 days', 1),
 ('test-purge', now() - interval '1 hour', 1);
select purge_rate_limits();
select is((select count(*)::int from rate_limits where key='test-purge'), 1, 'purge removes only rows older than 2 days');
select is((select count(*)::int from rate_limits where key='test-old'), 2, 'recent rows survive purge');

-- ---- RLS: anon and authenticated see nothing ----
create function t_count() returns void language plpgsql as $$
begin
  insert into errs values (current_user, (select count(*)::text from rate_limits));
exception when others then
  insert into errs values (current_user, 'denied');
end $$;
grant execute on function t_count() to anon, authenticated;
set local role anon; select t_count(); reset role;
set local role authenticated; select t_count(); reset role;
select ok((select msg in ('0','denied') from errs where label='anon'), 'anon reads no rate_limits rows');
select ok((select msg in ('0','denied') from errs where label='authenticated'), 'authenticated reads no rate_limits rows');

-- ---- submit_artist: 11th call in an hour ----
do $$
declare i int;
begin
  for i in 1..10 loop
    perform submit_artist('00000000-0000-0000-0000-0000000000a1', 'Test Band ' || i, 'web', 'web:t' || i || '.example', 'https://t' || i || '.example');
  end loop;
  begin
    perform submit_artist('00000000-0000-0000-0000-0000000000a1', 'Test Band 11', 'web', 'web:t11.example', 'https://t11.example');
    insert into errs values ('submit11', 'ok');
  exception when others then
    insert into errs values ('submit11', sqlerrm);
  end;
  begin
    perform submit_artist('00000000-0000-0000-0000-0000000000a2', 'Test Band 11', 'web', 'web:t11.example', 'https://t11.example');
    insert into errs values ('submit_other', 'ok');
  exception when others then
    insert into errs values ('submit_other', sqlerrm);
  end;
end $$;
select is((select msg from errs where label='submit11'), 'rate_limited', 'submit_artist raises rate_limited on the 11th call in an hour');
select is((select msg from errs where label='submit_other'), 'ok', 'another user is not limited');

-- ---- report_artist: 6th call in 24 hours (limit moved to 5 a day in 0031) ----
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$
declare i int;
begin
  insert into rate_limits(key, window_start, hits)
    values ('report:00000000-0000-0000-0000-0000000000a1', to_timestamp(floor(extract(epoch from now()) / 86400) * 86400), 5);
  begin
    perform report_artist('00000000-0000-0000-0000-0000000000b1', 'Test reason');
    insert into errs values ('report11', 'ok');
  exception when others then
    insert into errs values ('report11', sqlerrm);
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
  begin
    perform report_artist('00000000-0000-0000-0000-0000000000b1', 'Test reason');
    insert into errs values ('report_other', 'ok');
  exception when others then
    insert into errs values ('report_other', sqlerrm);
  end;
end $$;
select is((select msg from errs where label='report11'), 'report_limit_reached', 'report_artist raises report_limit_reached past 5 a day');
select is((select msg from errs where label='report_other'), 'ok', 'another reporter is not limited');

select * from finish();
rollback;
