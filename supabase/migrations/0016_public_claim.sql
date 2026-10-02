-- Public claim lookup for share links. Returns one row for a claim on a LIVE artist; the handle is the real
-- handle only when the claim is public. No user id is returned.
create or replace function public_claim(p_slug text, p_number int)
returns table(handle text, claim_number int, artist_name text)
language sql stable security definer set search_path = public, pg_temp as $$
  select case when c.visibility = 'public' then p.handle else 'Anonymous scout' end,
         c.claim_number, a.name
    from artists a
    join claims c on c.artist_id = a.id and c.claim_number = p_number
    join profiles p on p.id = c.user_id
   where a.slug = p_slug and a.status = 'live'
   limit 1
$$;

revoke execute on function public_claim(text, int) from public;
grant execute on function public_claim(text, int) to anon, authenticated;
