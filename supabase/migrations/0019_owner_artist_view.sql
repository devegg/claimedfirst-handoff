-- R33: the verified owner can always read their own artist row, even when RLS hides it (delisted, disputed, pending).
-- Returns a row only for the owner; for anyone else it returns nothing, so existence is never revealed.
create or replace function my_owned_artist(p_slug text)
returns table(id uuid, name text, slug text, status text, claims_frozen boolean, donation_url text, verified_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return query
    select a.id, a.name, a.slug, a.status, a.claims_frozen, a.donation_url, a.verified_at
      from artists a join artist_owners o on o.artist_id = a.id
     where a.slug = p_slug and o.owner_id = auth.uid();
end $$;
revoke execute on function my_owned_artist(text) from public, anon;
grant execute on function my_owned_artist(text) to authenticated;
