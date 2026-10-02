-- 0033: the public claim page shows when a claim was made and whether it is still active.
-- Adds status ('active' or 'historical') and claimed_on (the UTC DATE only, never the time of day) to public_claim. Nothing new about the scout:
-- still no user id, and the handle is still the real handle only when the claim is public.
drop function if exists public_claim(text, int);
create function public_claim(p_slug text, p_number int)
returns table(handle text, claim_number int, artist_name text, status text, claimed_on date)
language sql stable security definer set search_path = public, pg_temp as $$
  select case when c.visibility = 'public' then p.handle else 'Anonymous scout' end,
         c.claim_number, a.name, c.status, (c.claimed_at at time zone 'UTC')::date
    from artists a
    join claims c on c.artist_id = a.id and c.claim_number = p_number
    join profiles p on p.id = c.user_id
   where a.slug = p_slug and a.status = 'live'
   limit 1
$$;
revoke execute on function public_claim(text, int) from public;
grant execute on function public_claim(text, int) to anon, authenticated;
