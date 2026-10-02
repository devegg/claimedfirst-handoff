-- 0042: the referral ladder is public. The caller sees each referred friend as joined, pending (with days left) or counted,
-- plus their own counted total and the next step of the ladder (next_friends is the total at that step; null at the top).
-- With no friends the function returns one row with a null handle. Own data only (auth.uid()); no other user's details.
-- Ladder (same as recompute_slots in 0003): 2 friends -> 10 slots, 5 -> 20, 10 -> 30, 20 -> 50.
create or replace function my_referral_progress()
returns table(handle text, joined_on date, status text, days_left int, has_claim boolean,
              qualified_count int, next_friends int, next_slots int)
language sql stable security definer set search_path = public, pg_temp as $$
  with me as (select auth.uid() as id),
  q as (select qualified_referrals((select id from me)) as n),
  step as (
    select s.friends, s.slots from (values (2,10),(5,20),(10,30),(20,50)) s(friends, slots)
     where s.friends > (select n from q) order by s.friends limit 1
  ),
  friends as (
    select p.handle, p.created_at::date as joined_on, p.created_at, r.referred,
           exists (select 1 from claims c where c.user_id = p.id) as has_claim
      from referrals r join profiles p on p.id = r.referred
     where r.referrer = (select id from me) and r.referrer <> r.referred
  )
  select f.handle, f.joined_on,
         case when f.has_claim and f.created_at + account_min_age() <= now() then 'counted' else 'pending' end,
         case when f.has_claim and f.created_at + account_min_age() <= now() then null
              else greatest(0, ceil(extract(epoch from (f.created_at + account_min_age() - now())) / 86400))::int end,
         f.has_claim,
         (select n from q), (select friends from step), (select slots from step)
    from (select 1) one left join friends f on true
   where (select id from me) is not null
   order by f.created_at nulls last, f.referred
$$;
revoke execute on function my_referral_progress() from public, anon;
grant execute on function my_referral_progress() to authenticated;
