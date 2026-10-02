-- Task 13a: verified owner link, artist tools, audience, reports.
-- R9: security definer, fixed search_path, execute revoked then granted. R10: only the artist row is locked.

create table artist_owners (
  artist_id uuid primary key references artists on delete cascade,
  owner_id uuid not null references profiles,
  verified_at timestamptz not null default now()
);
create index artist_owners_owner_idx on artist_owners(owner_id);
alter table artist_owners enable row level security; -- no policies: only security definer functions and the service role

create table artist_reports (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists on delete cascade,
  reporter_id uuid not null references profiles on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (artist_id, reporter_id)
);
alter table artist_reports enable row level security; -- no policies

create or replace function artist_owner(p_artist uuid) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select owner_id from artist_owners where artist_id = p_artist
$$;
revoke execute on function artist_owner(uuid) from public, anon, authenticated;

-- shared guard: signed in, artist exists, row locked, caller is the owner
create or replace function artist_owner_guard(p_artist uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  perform 1 from artists where id = p_artist for update;
  if not found or auth.uid() is distinct from artist_owner(p_artist) then raise exception 'not_owner'; end if;
end $$;
revoke execute on function artist_owner_guard(uuid) from public, anon, authenticated;

create or replace function set_top_songs(p_artist uuid, p_songs jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_item jsonb; v_title text; v_url text; v_pos int := 0;
begin
  perform artist_owner_guard(p_artist);
  if p_songs is null or jsonb_typeof(p_songs) <> 'array' then raise exception 'invalid_songs'; end if;
  if jsonb_array_length(p_songs) > 10 then raise exception 'too_many_songs'; end if;
  -- validate everything before touching rows; the whole call is one transaction anyway
  delete from top_songs where artist_id = p_artist;
  for v_item in select value from jsonb_array_elements(p_songs) loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item->'title') is distinct from 'string'
       or jsonb_typeof(v_item->'url') is distinct from 'string' then
      raise exception 'invalid_song';
    end if;
    v_title := btrim(v_item->>'title');
    v_url := v_item->>'url';
    if char_length(v_title) not between 1 and 100 then raise exception 'invalid_song'; end if;
    if char_length(v_url) > 500 or v_url !~ '^https://[^/?#\s@]+\.[^/?#\s@]*([/?#]\S*)?$' then
      raise exception 'invalid_song_url';
    end if;
    v_pos := v_pos + 1;
    insert into top_songs(artist_id, position, title, url) values (p_artist, v_pos, v_title, v_url);
  end loop;
end $$;

create or replace function set_donation_url(p_artist uuid, p_url text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform artist_owner_guard(p_artist);
  if p_url is null or btrim(p_url) = '' then
    update artists set donation_url = null where id = p_artist;
    return;
  end if;
  if char_length(p_url) > 300 or p_url !~ '^https://[^/?#\s@]+\.[^/?#\s@]*([/?#]\S*)?$' then
    raise exception 'invalid_donation_url';
  end if;
  update artists set donation_url = p_url where id = p_artist;
end $$;

create or replace function set_artist_state(p_artist uuid, p_freeze boolean, p_delist boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform artist_owner_guard(p_artist);
  if p_freeze is not null then
    update artists set claims_frozen = p_freeze where id = p_artist;
  end if;
  if p_delist is true then
    update artists set status = 'delisted' where id = p_artist;
  elsif p_delist is false then
    -- undo only a delist, and only for a verified artist
    update artists set status = 'live' where id = p_artist and status = 'delisted' and verified_at is not null;
  end if;
end $$;

create or replace function artist_audience(p_artist uuid)
returns table(kind text, handle text, claim_number int, status text, since timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if auth.uid() is distinct from artist_owner(p_artist) then raise exception 'not_owner'; end if;
  return query
    select 'claimer'::text,
           case when c.visibility in ('public','artist') then p.handle else 'Anonymous scout' end,
           c.claim_number, c.status, c.claimed_at
      from claims c join profiles p on p.id = c.user_id
     where c.artist_id = p_artist
    union all
    select 'watcher'::text, p.handle, null::int, null::text, w.created_at
      from watchlist w join profiles p on p.id = w.user_id
     where w.artist_id = p_artist and w.named_to_artist
    order by 1, 3 nulls last, 5, 2;
end $$;

create or replace function artist_watch_counts(p_artist uuid)
returns table(total int, named int)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if auth.uid() is distinct from artist_owner(p_artist) then raise exception 'not_owner'; end if;
  return query select count(*)::int, (count(*) filter (where w.named_to_artist))::int
    from watchlist w where w.artist_id = p_artist;
end $$;

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
  -- R31: a verified page keeps its status; an unverified live/pending page is disputed
  if v_verified is null and artist_owner(p_artist) is null and v_status in ('live','pending') then
    update artists set status = 'disputed' where id = p_artist;
  end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'set_top_songs(uuid,jsonb)','set_donation_url(uuid,text)','set_artist_state(uuid,boolean,boolean)',
    'artist_audience(uuid)','artist_watch_counts(uuid)','report_artist(uuid,text)'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
