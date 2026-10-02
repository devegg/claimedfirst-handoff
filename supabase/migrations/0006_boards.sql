-- Founders and Historical 100 boards. A claim appears on a board only after it was held 14 days.
create or replace function claim_eligible(c claims) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(c.dropped_at, now()) - c.claimed_at >= interval '14 days'
$$;
revoke all on function claim_eligible(claims) from public, anon, authenticated;

create or replace function artist_founders(p_artist uuid)
returns table(claim_number int, handle text, status text, claimed_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.claim_number,
         case when c.visibility = 'public' then p.handle else 'Anonymous scout' end,
         c.status, c.claimed_at
  from claims c
  join profiles p on p.id = c.user_id
  join artists a on a.id = c.artist_id
  where c.artist_id = p_artist and a.status = 'live' and claim_eligible(c)
  order by c.claim_number
  limit 100
$$;

create or replace function scout_historical(p_user uuid)
returns table(artist_name text, slug text, claim_number int, status text, claimed_at timestamptz, visibility text)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.name, a.slug, c.claim_number, c.status, c.claimed_at, c.visibility
  from claims c
  join artists a on a.id = c.artist_id
  where c.user_id = p_user and a.status = 'live' and claim_eligible(c)
    and (c.visibility = 'public' or p_user = auth.uid())
  order by c.claim_number
  limit 100
$$;

revoke all on function artist_founders(uuid), scout_historical(uuid) from public;
grant execute on function artist_founders(uuid), scout_historical(uuid) to anon, authenticated;
