-- D2: public list of pending artists for /discover. Only name, slug-free public facts and a
-- count of distinct submitters; never who submitted. security definer, pinned search_path.
create or replace function pending_artists_public(p_limit int default 20)
returns table(id uuid, name text, scouts_submitted int, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.id, a.name, count(distinct s.user_id)::int, a.created_at
    from artists a left join artist_submissions s on s.artist_id = a.id
   where a.status = 'pending'
   group by a.id, a.name, a.created_at
   order by a.created_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
revoke execute on function pending_artists_public(int) from public, anon, authenticated;
grant execute on function pending_artists_public(int) to anon, authenticated;
