begin;
select plan(23);

-- one live artist for all claims
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live');

-- referrers k = 0,1,2,5,10,20 get k qualified referrals (10 days old, 1 claim each)
-- id scheme: referrer 00000000-0000-0000-0001-<12 digit k>, referred 00000000-0000-0000-0002-<k*100+i>
create function pg_temp.uid(grp int, n int) returns uuid language sql immutable as
 $$ select format('00000000-0000-0000-%s-%s', lpad(grp::text,4,'0'), lpad(n::text,12,'0'))::uuid $$;

create sequence pg_temp.cn;
create function pg_temp.mk_referred(k int, i int, age interval, with_claim boolean, status text default 'active')
returns void language plpgsql as $$
declare u uuid := pg_temp.uid(2, k*100+i);
begin
  insert into auth.users(id,email) values (u, format('ref_%s_%s@example.test',k,i));
  insert into profiles(id,handle,created_at) values (u, format('test_ref_%s_%s',k,i), now()-age);
  insert into referrals(referrer,referred) values (pg_temp.uid(1,k), u);
  if with_claim then
    insert into claims(artist_id,user_id,claim_number,status,dropped_at)
    values ('00000000-0000-0000-0000-0000000000b1', u, nextval('pg_temp.cn'), status,
            case when status='historical' then now() end);
  end if;
end $$;

do $$
declare k int; i int;
begin
  foreach k in array array[0,1,2,5,10,20,30,31,32,33] loop
    insert into auth.users(id,email) values (pg_temp.uid(1,k), format('referrer_%s@example.test',k));
    insert into profiles(id,handle,created_at) values (pg_temp.uid(1,k), format('test_%s',k), now()-interval '30 days');
  end loop;
  foreach k in array array[1,2,5,10,20] loop
    for i in 1..k loop
      perform pg_temp.mk_referred(k, i, interval '10 days', true);
    end loop;
  end loop;
  -- referrer 30: one qualified + one 3-day-old (with claim) + one 10-day-old with no claim
  perform pg_temp.mk_referred(30,1,interval '10 days',true);
  perform pg_temp.mk_referred(30,2,interval '2 days',true);
  perform pg_temp.mk_referred(30,3,interval '10 days',false);
  -- referrer 31: two referred, one with only a historical (dropped) claim -> both qualify
  perform pg_temp.mk_referred(31,1,interval '10 days',true);
  perform pg_temp.mk_referred(31,2,interval '10 days',true,'historical');
  -- referrer 32: exactly 3 days old counts (boundary), 2 days 23h does not
  perform pg_temp.mk_referred(32,1,interval '3 days',true);
  perform pg_temp.mk_referred(32,2,interval '2 days 23 hours',true);
end $$;

-- thresholds
select is(recompute_slots(pg_temp.uid(1,0)),  5, '0 qualified -> 5');
select is(recompute_slots(pg_temp.uid(1,1)),  5, '1 qualified -> 5');
select is(recompute_slots(pg_temp.uid(1,2)), 10, '2 qualified -> 10');
select is(recompute_slots(pg_temp.uid(1,5)), 20, '5 qualified -> 20');
select is(recompute_slots(pg_temp.uid(1,10)), 30, '10 qualified -> 30');
select is(recompute_slots(pg_temp.uid(1,20)), 50, '20 qualified -> 50');
select is(qualified_referrals(pg_temp.uid(1,20)), 20, '20 counted');
select is((select slots_unlocked from profiles where id=pg_temp.uid(1,5)), 20, 'value is stored');

-- just below thresholds: 4 of 5 qualified keeps 10
update profiles set created_at = now() - interval '2 days' where id = pg_temp.uid(2,5*100+1);
select is(qualified_referrals(pg_temp.uid(1,5)), 4, '4 counted after one becomes young');

-- exclusions
select is(qualified_referrals(pg_temp.uid(1,30)), 1, 'under-3-day and no-claim accounts excluded');
select is(recompute_slots(pg_temp.uid(1,30)), 5, 'excluded accounts do not unlock');
select is((select count(*)::int from claims where user_id=pg_temp.uid(2,3001)), 1, 'qualifying fixture has a claim');
select is((select count(*)::int from claims where user_id=pg_temp.uid(2,3003)), 0, 'no-claim account exists');
select is(qualified_referrals(pg_temp.uid(1,31)), 2, 'historical-only claim still counts as having claimed');
select is(qualified_referrals(pg_temp.uid(1,32)), 1, 'exactly 3 days counts, 2d23h does not');

-- constraints
select throws_ok(format($$insert into referrals(referrer,referred) values (%L,%L)$$, pg_temp.uid(1,33), pg_temp.uid(1,33)),
  '23514', null, 'self-referral rejected');
select throws_ok(format($$insert into referrals(referrer,referred) values (%L,%L)$$, pg_temp.uid(1,33), pg_temp.uid(2,1001)),
  '23505', null, 'duplicate referred rejected');
select throws_ok(format($$update profiles set referred_by=id where id=%L$$, pg_temp.uid(1,33)),
  '23514', null, 'profile referred_by self rejected');

-- never decreases
delete from referrals where referrer = pg_temp.uid(1,20);
select is(qualified_referrals(pg_temp.uid(1,20)), 0, 'referrals gone');
select is(recompute_slots(pg_temp.uid(1,20)), 50, 'never decreases after referrals deleted');
delete from claims where user_id = pg_temp.uid(2,1001);
select is(recompute_slots(pg_temp.uid(1,2)), 10, 'never decreases after data changes');

-- privileges: server only
select ok(not has_function_privilege('authenticated','recompute_slots(uuid)','execute'), 'authenticated cannot recompute_slots');
select ok(not has_function_privilege('anon','recompute_slots(uuid)','execute')
      and not has_function_privilege('authenticated','qualified_referrals(uuid)','execute')
      and not has_function_privilege('anon','qualified_referrals(uuid)','execute'), 'anon/qualified_referrals not callable by clients');

select * from finish();
rollback;
