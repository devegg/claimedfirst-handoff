-- Rate limits: fixed windows in a table only the service role (via security definer functions) touches.
create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
alter table rate_limits enable row level security;  -- no policies: no direct access for anon or authenticated

-- Returns true while the caller is within p_max hits for the current window of length p_window.
create or replace function rate_limit_hit(p_key text, p_max int, p_window interval) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_secs double precision := extract(epoch from p_window); v_start timestamptz; v_hits int;
begin
  if p_key is null or p_max is null or v_secs is null or v_secs <= 0 then raise exception 'invalid_rate_limit'; end if;
  v_start := to_timestamp(floor(extract(epoch from now()) / v_secs) * v_secs);
  insert into rate_limits(key, window_start, hits) values (p_key, v_start, 1)
    on conflict (key, window_start) do update set hits = rate_limits.hits + 1
    returning hits into v_hits;
  return v_hits <= p_max;
end $$;
revoke execute on function rate_limit_hit(text,int,interval) from public, anon, authenticated;
grant execute on function rate_limit_hit(text,int,interval) to service_role;

create or replace function purge_rate_limits() returns void
language sql security definer set search_path = public, pg_temp as $$
  delete from rate_limits where window_start < now() - interval '2 days';
$$;
revoke execute on function purge_rate_limits() from public, anon, authenticated;
grant execute on function purge_rate_limits() to service_role;

-- submit_artist: unchanged from 0005 except the rate limit after the user check.
create or replace function submit_artist(p_user uuid, p_name text, p_platform text, p_key text, p_url text)
returns artists language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_base text; v_len int; v_id uuid; v_n int; v_row artists;
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

-- report_artist: unchanged from 0018 except the rate limit after the sign-in check.
create or replace function report_artist(p_artist uuid, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_reason text := btrim(coalesce(p_reason, '')); v_status text; v_verified timestamptz;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not rate_limit_hit('report:' || auth.uid()::text, 10, interval '1 hour') then raise exception 'rate_limited'; end if;
  if char_length(v_reason) not between 1 and 500 then raise exception 'invalid_reason'; end if;
  select status, verified_at into v_status, v_verified from artists where id = p_artist for update;
  if not found then raise exception 'artist_not_found'; end if;
  insert into artist_reports(artist_id, reporter_id, reason) values (p_artist, auth.uid(), v_reason)
    on conflict (artist_id, reporter_id) do update set reason = excluded.reason;
  if v_verified is null and v_status in ('live','pending') then
    update artists set status = 'disputed' where id = p_artist;
  end if;
end $$;


revoke execute on function report_artist(uuid,text) from public, anon;
grant execute on function report_artist(uuid,text) to authenticated;
