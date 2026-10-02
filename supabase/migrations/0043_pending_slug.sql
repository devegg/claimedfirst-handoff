-- 0043: the pending list also returns each page's address (slug) so Discover can link to the pending page.
-- Public data only, as before: no submitter ids. Appended column; arguments unchanged.
drop function pending_artists_public(int);
create function pending_artists_public(p_limit int default 20)
returns table(id uuid, name text, scouts_submitted int, created_at timestamptz, needed int, slug text)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.id, a.name,
         coalesce(sum(case when is_verified_owner(s.user_id) then 2 else 1 end), 0)::int,
         a.created_at, 3, a.slug
    from artists a left join artist_submissions s on s.artist_id = a.id
   where a.status = 'pending'
   group by a.id, a.name, a.created_at, a.slug
   order by a.created_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
revoke execute on function pending_artists_public(int) from public;
grant execute on function pending_artists_public(int) to anon, authenticated;
