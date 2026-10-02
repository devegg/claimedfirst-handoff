-- submit_artist: service-role only (called from the /submit server action, which computes the
-- canonical key server-side). Finds or creates the artist, records the submitter, and promotes
-- a pending artist to live once 3 distinct users have submitted it.
create or replace function submit_artist(p_user uuid, p_name text, p_platform text, p_key text, p_url text)
returns artists language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_base text; v_len int; v_id uuid; v_n int; v_row artists;
begin
  if p_user is null or not exists (select 1 from profiles where id = p_user) then
    raise exception 'not_authenticated';
  end if;
  if char_length(v_name) not between 1 and 80 or v_name !~ '[[:alnum:]]' then
    raise exception 'invalid_name';
  end if;
  v_base := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  if v_base = '' then v_base := 'artist'; end if;

  select artist_id into v_id from artist_links where canonical_key = p_key;
  if v_id is null then
    -- slug collision between different keys: retry with a longer hash suffix (md5 is 32 chars)
    foreach v_len in array array[4, 12, 32] loop
      begin
        insert into artists(name, slug) values (v_name, v_base || '-' || substr(md5(p_key), 1, v_len))
          returning id into v_id;
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
