-- 0028: artist page addresses use the platform @handle (/artist/emberv).
-- submit_artist: same as 0027 except the slug rules. New optional p_slug; null derives it from the key.
-- A slug held by a different artist raises slug_taken (never silently renamed); a bad slug raises invalid_slug.
drop function if exists submit_artist(uuid,text,text,text,text);

create or replace function submit_artist(p_user uuid, p_name text, p_platform text, p_key text, p_url text, p_slug text default null)
returns artists language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text; v_id uuid; v_n int; v_row artists;
begin
  if p_user is null or not exists (select 1 from profiles where id = p_user) then
    raise exception 'not_authenticated';
  end if;
  if not rate_limit_hit('submit:' || p_user::text, 10, interval '1 hour') then
    raise exception 'rate_limited';
  end if;
  if char_length(v_name) not between 1 and 80 or v_name !~ '[[:alnum:]]' then
    raise exception 'invalid_name';
  end if;

  if nullif(btrim(coalesce(p_slug, '')), '') is not null then
    v_slug := lower(btrim(p_slug));
  else
    -- derive from the key: drop the platform prefix and a leading @ (or channel/), sanitize, cap at 30
    v_slug := lower(regexp_replace(regexp_replace(substr(p_key, strpos(p_key, ':') + 1), '^channel/', ''), '^@', ''));
    v_slug := btrim(regexp_replace(v_slug, '[^a-z0-9_-]+', '-', 'g'), '-_');
    v_slug := btrim(left(v_slug, 30), '-_');
  end if;
  if v_slug !~ '^[a-z0-9][a-z0-9_-]{1,29}$' then
    raise exception 'invalid_slug';
  end if;

  select artist_id into v_id from artist_links where canonical_key = p_key;
  if v_id is null then
    begin
      insert into artists(name, slug) values (v_name, v_slug) returning id into v_id;
    exception when unique_violation then
      -- the slug belongs to someone else, unless a concurrent submit of this same key just created it
      select artist_id into v_id from artist_links where canonical_key = p_key;
      if v_id is null then raise exception 'slug_taken'; end if;
    end;
    if not exists (select 1 from artist_links where artist_id = v_id) then
      begin
        insert into artist_links(artist_id, platform, canonical_key, url, is_primary)
          values (v_id, p_platform, p_key, p_url, true);
      exception when unique_violation then
        -- lost a race with a concurrent submit of the same key: discard ours, use theirs
        delete from artists where id = v_id;
        select artist_id into v_id from artist_links where canonical_key = p_key;
      end;
    end if;
  end if;

  -- serialize submitters per artist so the last one counts everyone else's committed rows
  perform 1 from artists where id = v_id for update;
  insert into artist_submissions(artist_id, user_id) values (v_id, p_user) on conflict do nothing;
  select count(*)::int into v_n from artist_submissions where artist_id = v_id;
  update artists set status = 'live' where id = v_id and status = 'pending' and v_n >= 3;
  select * into v_row from artists where id = v_id;
  return v_row;
end $$;

revoke execute on function submit_artist(uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function submit_artist(uuid,text,text,text,text,text) to service_role;

-- Is this page address taken? Any status holds a slug, but name and slug are only revealed for live or pending pages.
create or replace function artist_slug_status(p_slug text)
returns table(taken boolean, name text, slug text)
language sql stable security definer set search_path = public, pg_temp as $$
  select true,
         case when a.status in ('live','pending') then a.name end,
         case when a.status in ('live','pending') then a.slug end
  from artists a where a.slug = lower(btrim(coalesce(p_slug, '')))
  union all
  select false, null::text, null::text
  where not exists (select 1 from artists a where a.slug = lower(btrim(coalesce(p_slug, ''))))
$$;
revoke execute on function artist_slug_status(text) from public;
grant execute on function artist_slug_status(text) to anon, authenticated;

-- Name/address search for the submit form: live artists only, public columns only, at most 5.
create or replace function search_live_artists(p_q text)
returns table(name text, slug text)
language sql stable security definer set search_path = public, pg_temp as $$
  with t as (select replace(replace(replace(btrim(coalesce(p_q, '')), '\', '\\'), '%', '\%'), '_', '\_') as q)
  select a.name, a.slug from artists a, t
  where char_length(t.q) >= 1 and a.status = 'live'
    and (a.name ilike '%' || t.q || '%' escape '\' or a.slug ilike '%' || t.q || '%' escape '\')
  order by a.created_at desc limit 5
$$;
revoke execute on function search_live_artists(text) from public;
grant execute on function search_live_artists(text) to anon, authenticated;
