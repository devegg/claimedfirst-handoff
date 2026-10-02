-- Lets the header show "your artist pages" for a verified owner. Returns only the caller's own rows.
create or replace function my_owned_artists()
returns table(name text, slug text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return query
    select a.name, a.slug
      from artists a join artist_owners o on o.artist_id = a.id
     where o.owner_id = auth.uid() and a.status <> 'delisted'
     order by a.name
     limit 20;
end $$;
revoke execute on function my_owned_artists() from public, anon;
grant execute on function my_owned_artists() to authenticated;
