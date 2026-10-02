-- 0027: artist page addresses are clean (/artist/heart-echoes). Same as 0021 except the slug rules.
create or replace function submit_artist(p_user uuid, p_name text, p_platform text, p_key text, p_url text)
returns artists language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_base text; v_slug text; v_i int; v_id uuid; v_n int; v_row artists;
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
  v_base := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  if char_length(v_base) < 2 then
    -- name has (almost) no a-z0-9 characters: use the handle or host from the canonical key instead
    v_base := btrim(regexp_replace(lower(regexp_replace(split_part(p_key, ':', 2), '^@', '')), '[^a-z0-9]+', '-', 'g'), '-');
    if v_base = '' then v_base := 'artist'; end if;
  end if;

  select artist_id into v_id from artist_links where canonical_key = p_key;
  if v_id is null then
    -- clean slug first (/artist/name); on collision name-2 .. name-20, then a hash suffix as a last resort
    for v_i in 1..23 loop
      v_slug := case when v_i = 1 then v_base
                     when v_i <= 20 then v_base || '-' || v_i
                     when v_i = 21 then v_base || '-' || substr(md5(p_key), 1, 4)
                     when v_i = 22 then v_base || '-' || substr(md5(p_key), 1, 12)
                     else v_base || '-' || md5(p_key) end;
      begin
        insert into artists(name, slug) values (v_name, v_slug) returning id into v_id;
        exit;
      exception when unique_violation then
        v_id := null;
      end;
    end loop;
    if v_id is null then raise exception 'slug_unavailable'; end if;
    begin
      insert into artist_links(artist_id, platform, canonical_key, url, is_primary)
        values (v_id, p_platform, p_key, p_url, true);
    exception when unique_violation then
      -- lost a race with a concurrent submit of the same key: discard ours, use theirs
      delete from artists where id = v_id;
      select artist_id into v_id from artist_links where canonical_key = p_key;
    end;
  end if;

  -- serialize submitters per artist so the last one counts everyone else's committed rows
  perform 1 from artists where id = v_id for update;
  insert into artist_submissions(artist_id, user_id) values (v_id, p_user) on conflict do nothing;
  select count(*)::int into v_n from artist_submissions where artist_id = v_id;
  update artists set status = 'live' where id = v_id and status = 'pending' and v_n >= 3;
  select * into v_row from artists where id = v_id;
  return v_row;
end $$;

revoke execute on function submit_artist(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function submit_artist(uuid,text,text,text,text) to service_role;
