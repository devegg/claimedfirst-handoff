-- 0034: one shared account-age constant (decision 6: 3 days instead of 7).
-- Every rule that asks "is this account old enough" uses account_min_age(): referral qualification,
-- scoring growth (qualified claimers), and reports (0040). The 14-day hold and 30-day cooldown are unrelated.
create or replace function account_min_age() returns interval
language sql immutable set search_path = public, pg_temp as $$ select interval '3 days' $$;
grant execute on function account_min_age() to anon, authenticated, service_role;

create or replace function qualified_claimers(p_artist uuid, p_at timestamptz)
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select count(distinct c.user_id)::int from claims c join profiles p on p.id = c.user_id
  where c.artist_id = p_artist and c.claimed_at <= p_at and p.created_at + account_min_age() <= p_at
$$;

create or replace function qualified_claimers_excluding(p_artist uuid, p_at timestamptz, p_user uuid)
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select count(distinct c.user_id)::int from claims c join profiles p on p.id = c.user_id
  where c.artist_id = p_artist and c.claimed_at <= p_at and p.created_at + account_min_age() <= p_at
    and c.user_id <> p_user
$$;

create or replace function qualified_referrals(p_user uuid) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int from referrals r join profiles p on p.id = r.referred
  where r.referrer = p_user and r.referrer <> r.referred
    and p.created_at + account_min_age() <= now()
    and exists (select 1 from claims c where c.user_id = p.id)
$$;
