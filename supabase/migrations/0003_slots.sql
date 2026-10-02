-- Referral-qualified slot unlocks. Server (service role) only.

create or replace function qualified_referrals(p_user uuid) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int from referrals r join profiles p on p.id = r.referred
  where r.referrer = p_user and r.referrer <> r.referred
    and p.created_at + interval '7 days' <= now()
    and exists (select 1 from claims c where c.user_id = p.id)
$$;

create or replace function recompute_slots(p_user uuid) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare n int; target int; result int;
begin
  -- lock the profile row first (R10); never lock an artist row
  perform 1 from profiles where id = p_user for update;
  n := qualified_referrals(p_user);
  target := case when n >= 20 then 50 when n >= 10 then 30 when n >= 5 then 20 when n >= 2 then 10 else 5 end;
  update profiles set slots_unlocked = greatest(slots_unlocked, target)
   where id = p_user returning slots_unlocked into result;
  return result;
end $$;

create or replace function profiles_referral_guard() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.referred_by is not null and new.referred_by = new.id then
    raise exception 'self_referral' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger profiles_referral_guard before insert or update of referred_by on profiles
  for each row execute function profiles_referral_guard();

revoke execute on function qualified_referrals(uuid), recompute_slots(uuid) from public, anon, authenticated;

-- Nightly job (run by the server with the service role, not scheduled here):
--   select recompute_slots(id) from profiles where id in (select referrer from referrals);
