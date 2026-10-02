-- R37: growth counts distinct scouts, so a scout cannot inflate points by dropping and re-adding.
create or replace function qualified_claimers(p_artist uuid, p_at timestamptz)
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select count(distinct c.user_id)::int from claims c join profiles p on p.id=c.user_id
  where c.artist_id=p_artist and c.claimed_at<=p_at and p.created_at + interval '7 days' <= p_at
$$;

create or replace function qualified_claimers_excluding(p_artist uuid, p_at timestamptz, p_user uuid)
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select count(distinct c.user_id)::int from claims c join profiles p on p.id = c.user_id
  where c.artist_id = p_artist and c.claimed_at <= p_at and p.created_at + interval '7 days' <= p_at
    and c.user_id <> p_user
$$;
