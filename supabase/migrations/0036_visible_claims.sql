-- 0036: claims show immediately (decisions 1 and 10). Old columns kept; new columns appended:
--   held_days            whole days held (to now for active claims, to the drop for dropped ones)
--   provisional          active and held under 14 days
--   dropped_after_days   dropped claims only
--   dropped_early        dropped before day 14
-- Privacy rules are as before. Pages that are live, or disputed after being live, are shown.
drop function artist_founders(uuid);
create function artist_founders(p_artist uuid)
returns table(claim_number int, handle text, status text, claimed_at timestamptz,
              held_days int, provisional boolean, dropped_after_days int, dropped_early boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.claim_number,
         case when c.visibility = 'public' then p.handle else 'Anonymous scout' end,
         c.status,
         case when c.visibility = 'public' then c.claimed_at else date_trunc('day', c.claimed_at, 'UTC') end,
         floor(extract(epoch from coalesce(c.dropped_at, now()) - c.claimed_at) / 86400)::int,
         c.status = 'active' and now() - c.claimed_at < interval '14 days',
         case when c.status = 'historical' then floor(extract(epoch from c.dropped_at - c.claimed_at) / 86400)::int end,
         c.status = 'historical' and c.dropped_at - c.claimed_at < interval '14 days'
  from claims c
  join profiles p on p.id = c.user_id
  join artists a on a.id = c.artist_id
  where c.artist_id = p_artist and (a.status = 'live' or (a.status = 'disputed' and a.disputed_from = 'live'))
  order by c.claim_number
  limit 100
$$;

drop function scout_historical(uuid);
create function scout_historical(p_user uuid)
returns table(artist_name text, slug text, claim_number int, status text, claimed_at timestamptz, visibility text,
              held_days int, provisional boolean, dropped_after_days int, dropped_early boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.name, a.slug, c.claim_number, c.status, c.claimed_at, c.visibility,
         floor(extract(epoch from coalesce(c.dropped_at, now()) - c.claimed_at) / 86400)::int,
         c.status = 'active' and now() - c.claimed_at < interval '14 days',
         case when c.status = 'historical' then floor(extract(epoch from c.dropped_at - c.claimed_at) / 86400)::int end,
         c.status = 'historical' and c.dropped_at - c.claimed_at < interval '14 days'
  from claims c
  join artists a on a.id = c.artist_id
  where c.user_id = p_user and (a.status = 'live' or (a.status = 'disputed' and a.disputed_from = 'live'))
    and (c.visibility = 'public' or p_user = auth.uid())
  order by c.claim_number
  limit 100
$$;
revoke all on function artist_founders(uuid), scout_historical(uuid) from public;
grant execute on function artist_founders(uuid), scout_historical(uuid) to anon, authenticated;
