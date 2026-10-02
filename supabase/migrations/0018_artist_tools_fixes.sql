-- Task 13a fixes (R32). Does not edit 0017.

-- One URL rule for songs and donation links: https, DNS-style host (letters/digits/hyphens, no edge hyphens,
-- at least one dot, no trailing dot), not an IPv4 literal, not localhost, optional port, no whitespace/control chars.
create or replace function is_public_https_url(p_url text, p_max int) returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select p_url is not null
     and char_length(p_url) <= p_max
     and p_url ~* '^https://([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?(:[0-9]{1,5})?([/?#][^[:space:][:cntrl:]]*)?$'
     and substring(p_url from '^https://([^/?#:]*)') !~ '^[0-9.]+$'
     and lower(substring(p_url from '^https://([^/?#:]*)')) <> 'localhost'
$$;
revoke execute on function is_public_https_url(text,int) from public, anon, authenticated;

create or replace function set_top_songs(p_artist uuid, p_songs jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_item jsonb;
begin
  perform artist_owner_guard(p_artist);
  if p_songs is null or jsonb_typeof(p_songs) <> 'array' then raise exception 'invalid_songs'; end if;
  if jsonb_array_length(p_songs) > 10 then raise exception 'too_many_songs'; end if;
  -- validate every item first; nothing is touched until the whole list is good
  for v_item in select value from jsonb_array_elements(p_songs) loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item->'title') is distinct from 'string'
       or jsonb_typeof(v_item->'url') is distinct from 'string'
       or char_length(btrim(v_item->>'title')) not between 1 and 100 then
      raise exception 'invalid_song';
    end if;
    if not is_public_https_url(v_item->>'url', 500) then raise exception 'invalid_song_url'; end if;
  end loop;
  delete from top_songs where artist_id = p_artist;
  insert into top_songs(artist_id, position, title, url)
    select p_artist, t.ord::int, btrim(t.item->>'title'), t.item->>'url'
      from jsonb_array_elements(p_songs) with ordinality as t(item, ord);
end $$;

create or replace function set_donation_url(p_artist uuid, p_url text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform artist_owner_guard(p_artist);
  if p_url is null or btrim(p_url) = '' then
    update artists set donation_url = null where id = p_artist;
    return;
  end if;
  if not is_public_https_url(p_url, 300) then raise exception 'invalid_donation_url'; end if;
  update artists set donation_url = p_url where id = p_artist;
end $$;

-- the anonymous claimer's exact time could identify them to the artist: day precision only
create or replace function artist_audience(p_artist uuid)
returns table(kind text, handle text, claim_number int, status text, since timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if auth.uid() is distinct from artist_owner(p_artist) then raise exception 'not_owner'; end if;
  return query
    select 'claimer'::text,
           case when c.visibility in ('public','artist') then p.handle else 'Anonymous scout' end,
           c.claim_number, c.status,
           case when c.visibility = 'anonymous' then date_trunc('day', c.claimed_at, 'UTC') else c.claimed_at end
      from claims c join profiles p on p.id = c.user_id
     where c.artist_id = p_artist
    union all
    select 'watcher'::text, p.handle, null::int, null::text, w.created_at
      from watchlist w join profiles p on p.id = w.user_id
     where w.artist_id = p_artist and w.named_to_artist
    order by 1, 3 nulls last, 5, 2;
end $$;

-- ONE definition of verified: artists.verified_at is not null
create or replace function report_artist(p_artist uuid, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_reason text := btrim(coalesce(p_reason, '')); v_status text; v_verified timestamptz;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if char_length(v_reason) not between 1 and 500 then raise exception 'invalid_reason'; end if;
  select status, verified_at into v_status, v_verified from artists where id = p_artist for update;
  if not found then raise exception 'artist_not_found'; end if;
  insert into artist_reports(artist_id, reporter_id, reason) values (p_artist, auth.uid(), v_reason)
    on conflict (artist_id, reporter_id) do update set reason = excluded.reason;
  if v_verified is null and v_status in ('live','pending') then
    update artists set status = 'disputed' where id = p_artist;
  end if;
end $$;

-- called by the verify route (service role) after a successful bio-code check: all effects in one transaction
create or replace function mark_artist_verified(p_artist uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform 1 from artists where id = p_artist for update;
  if not found then raise exception 'artist_not_found'; end if;
  update artists
     set verified_at = now(),
         status = case when status in ('pending','disputed','live') then 'live' else status end
   where id = p_artist;
  insert into artist_owners(artist_id, owner_id, verified_at) values (p_artist, p_user, now())
    on conflict (artist_id) do update set owner_id = excluded.owner_id, verified_at = excluded.verified_at;
end $$;
revoke execute on function mark_artist_verified(uuid,uuid) from public, anon, authenticated;
grant execute on function mark_artist_verified(uuid,uuid) to service_role;

revoke execute on function set_top_songs(uuid,jsonb), set_donation_url(uuid,text), artist_audience(uuid), report_artist(uuid,text) from public, anon;
grant execute on function set_top_songs(uuid,jsonb), set_donation_url(uuid,text), artist_audience(uuid), report_artist(uuid,text) to authenticated;
