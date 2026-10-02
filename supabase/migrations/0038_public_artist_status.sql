-- 0038: public read-only status of a page by address, for any status (decisions 2 and 4).
-- Returns nothing about scouts, submitters or reporters. Delisted pages return only name, slug and status.
-- shared helper: does this user own any verified page? (verified submitters count 2 of 3, report without waiting)
create or replace function is_verified_owner(p_user uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from artist_owners o join artists a on a.id = o.artist_id
                  where o.owner_id = p_user and a.verified_at is not null)
$$;
revoke execute on function is_verified_owner(uuid) from public, anon, authenticated;
grant execute on function is_verified_owner(uuid) to service_role;

create or replace function public_artist_status(p_slug text)
returns table(name text, slug text, status text, source_url text, verified boolean, support_points int, needed int)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.name, a.slug, a.status,
         case when a.status <> 'delisted' then
           (select l.url from artist_links l where l.artist_id = a.id and l.url ~* '^https://'
             order by l.is_primary desc, l.id limit 1) end,
         case when a.status <> 'delisted' then a.verified_at is not null end,
         case when a.status = 'pending' then
           (select coalesce(sum(case when is_verified_owner(s.user_id) then 2 else 1 end), 0)::int
              from artist_submissions s where s.artist_id = a.id) end,
         case when a.status = 'pending' then 3 end
  from artists a where a.slug = lower(btrim(p_slug))
$$;
revoke execute on function public_artist_status(text) from public;
grant execute on function public_artist_status(text) to anon, authenticated;
