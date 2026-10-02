-- R36: a report on an UNVERIFIED page pauses claims for a limited window instead of hiding the page,
-- and only reports from accounts at least 7 days old can start a dispute.
alter table artists add column disputed_at timestamptz;
alter table artists add column disputed_from text check (disputed_from in ('pending', 'live'));

-- the one place the window lives
create or replace function dispute_window() returns interval
language sql immutable set search_path = public, pg_temp as $$ select interval '72 hours' $$;

-- a page that was live before the dispute stays publicly readable; one disputed from pending stays hidden
drop policy "public read live" on artists;
create policy "public read live" on artists for select
  using (status = 'live' or (status = 'disputed' and disputed_from = 'live'));
drop policy "public read live artist links" on artist_links;
create policy "public read live artist links" on artist_links for select
  using (exists (select 1 from artists a where a.id = artist_id
                 and (a.status = 'live' or (a.status = 'disputed' and a.disputed_from = 'live'))));
drop policy "public read live top songs" on top_songs;
create policy "public read live top songs" on top_songs for select
  using (exists (select 1 from artists a where a.id = artist_id
                 and (a.status = 'live' or (a.status = 'disputed' and a.disputed_from = 'live'))));

-- report_artist: every rule from 0018/0021 kept; only reporters with a 7-day-old profile can start a dispute
create or replace function report_artist(p_artist uuid, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_reason text := btrim(coalesce(p_reason, '')); v_status text; v_verified timestamptz; v_old boolean;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not rate_limit_hit('report:' || auth.uid()::text, 10, interval '1 hour') then raise exception 'rate_limited'; end if;
  if char_length(v_reason) not between 1 and 500 then raise exception 'invalid_reason'; end if;
  select status, verified_at into v_status, v_verified from artists where id = p_artist for update;
  if not found then raise exception 'artist_not_found'; end if;
  insert into artist_reports(artist_id, reporter_id, reason) values (p_artist, auth.uid(), v_reason)
    on conflict (artist_id, reporter_id) do update set reason = excluded.reason;
  select created_at <= now() - interval '7 days' into v_old from profiles where id = auth.uid();
  if coalesce(v_old, false) and v_verified is null and v_status in ('live','pending') then
    update artists set status = 'disputed', disputed_at = now(), disputed_from = v_status where id = p_artist;
  end if;
end $$;
revoke execute on function report_artist(uuid,text) from public, anon;
grant execute on function report_artist(uuid,text) to authenticated;

-- nightly: unverified disputes that outlived the window go back to the status they came from
create or replace function restore_expired_disputes() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; v_n int := 0;
begin
  for r in select id from artists
           where status = 'disputed' and verified_at is null and disputed_at is not null
             and disputed_at + dispute_window() <= now()
  loop
    perform 1 from artists where id = r.id for update;
    update artists set status = disputed_from, disputed_at = null, disputed_from = null
     where id = r.id and status = 'disputed' and verified_at is null and disputed_from is not null
       and disputed_at + dispute_window() <= now();
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;
revoke execute on function restore_expired_disputes() from public, anon, authenticated;
grant execute on function restore_expired_disputes() to service_role;

-- mark_artist_verified: as 0018, plus clearing any dispute
create or replace function mark_artist_verified(p_artist uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform 1 from artists where id = p_artist for update;
  if not found then raise exception 'artist_not_found'; end if;
  update artists
     set verified_at = now(),
         status = case when status in ('pending','disputed','live') then 'live' else status end,
         disputed_at = null, disputed_from = null
   where id = p_artist;
  insert into artist_owners(artist_id, owner_id, verified_at) values (p_artist, p_user, now())
    on conflict (artist_id) do update set owner_id = excluded.owner_id, verified_at = excluded.verified_at;
end $$;
revoke execute on function mark_artist_verified(uuid,uuid) from public, anon, authenticated;
grant execute on function mark_artist_verified(uuid,uuid) to service_role;
