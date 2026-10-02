-- Founders board: exact time only for public claims; masked rows (artist-only or anonymous) show the day.
create or replace function artist_founders(p_artist uuid)
returns table(claim_number int, handle text, status text, claimed_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.claim_number,
         case when c.visibility = 'public' then p.handle else 'Anonymous scout' end,
         c.status,
         case when c.visibility = 'public' then c.claimed_at else date_trunc('day', c.claimed_at, 'UTC') end
  from claims c
  join profiles p on p.id = c.user_id
  join artists a on a.id = c.artist_id
  where c.artist_id = p_artist and a.status = 'live' and claim_eligible(c)
  order by c.claim_number
  limit 100
$$;
