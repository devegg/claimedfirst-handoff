-- 0041: fix round 1 after review of B1.
-- 1. Masked rows (anonymous and artist-only claims) derive held_days, provisional, dropped_after_days and dropped_early
--    from the UTC DAY of claimed_at/dropped_at, so the exact time of day cannot leak through the day counts.
-- 2. is_verified_owner ignores delisted pages (disputed pages still count).
-- 3. report_artist rejects accounts younger than account_min_age() that do not own a verified page: account_too_new.
create or replace function is_verified_owner(p_user uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from artist_owners o join artists a on a.id = o.artist_id
                  where o.owner_id = p_user and a.verified_at is not null and a.status <> 'delisted')
$$;

-- whole days between two instants: exact for public claims, UTC calendar days for masked ones
create or replace function claim_days(p_from timestamptz, p_to timestamptz, p_masked boolean) returns int
language sql stable set search_path = public, pg_temp as $$
  select case when p_masked
    then (date_trunc('day', p_to, 'UTC')::date - date_trunc('day', p_from, 'UTC')::date)
    else floor(extract(epoch from p_to - p_from) / 86400)::int end
$$;
revoke execute on function claim_days(timestamptz, timestamptz, boolean) from public, anon, authenticated;

drop function artist_founders(uuid);
create function artist_founders(p_artist uuid)
returns table(claim_number int, handle text, status text, claimed_at timestamptz,
              held_days int, provisional boolean, dropped_after_days int, dropped_early boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.claim_number,
         case when c.visibility = 'public' then p.handle else 'Anonymous scout' end,
         c.status,
         case when c.visibility = 'public' then c.claimed_at else date_trunc('day', c.claimed_at, 'UTC') end,
         d.held,
         c.status = 'active' and d.held < 14,
         case when c.status = 'historical' then d.held end,
         c.status = 'historical' and d.held < 14
  from claims c
  join profiles p on p.id = c.user_id
  join artists a on a.id = c.artist_id
  cross join lateral (select claim_days(c.claimed_at, coalesce(c.dropped_at, now()), c.visibility <> 'public') as held) d
  where c.artist_id = p_artist and (a.status = 'live' or (a.status = 'disputed' and a.disputed_from = 'live'))
  order by c.claim_number
  limit 100
$$;

drop function scout_historical(uuid);
create function scout_historical(p_user uuid)
returns table(artist_name text, slug text, claim_number int, status text, claimed_at timestamptz, visibility text,
              held_days int, provisional boolean, dropped_after_days int, dropped_early boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.name, a.slug, c.claim_number, c.status, c.claimed_at, c.visibility,
         d.held,
         c.status = 'active' and d.held < 14,
         case when c.status = 'historical' then d.held end,
         c.status = 'historical' and d.held < 14
  from claims c
  join artists a on a.id = c.artist_id
  cross join lateral (select claim_days(c.claimed_at, coalesce(c.dropped_at, now()), c.visibility <> 'public') as held) d
  where c.user_id = p_user and (a.status = 'live' or (a.status = 'disputed' and a.disputed_from = 'live'))
    and (c.visibility = 'public' or p_user = auth.uid())
  order by c.claim_number
  limit 100
$$;
revoke all on function artist_founders(uuid), scout_historical(uuid) from public;
grant execute on function artist_founders(uuid), scout_historical(uuid) to anon, authenticated;

create or replace function report_artist(p_artist uuid, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_reason text := btrim(coalesce(p_reason, '')); v_status text; v_verified timestamptz; v_ok boolean;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select (created_at <= now() - account_min_age()) or is_verified_owner(id) into v_ok from profiles where id = auth.uid();
  if not coalesce(v_ok, false) then raise exception 'account_too_new'; end if;
  if not rate_limit_hit('report:' || auth.uid()::text, 5, interval '24 hours') then raise exception 'report_limit_reached'; end if;
  if char_length(v_reason) not between 1 and 500 then raise exception 'invalid_reason'; end if;
  select status, verified_at into v_status, v_verified from artists where id = p_artist for update;
  if not found then raise exception 'artist_not_found'; end if;
  insert into artist_reports(artist_id, reporter_id, reason) values (p_artist, auth.uid(), v_reason)
    on conflict (artist_id, reporter_id) do update set reason = excluded.reason;
  if v_verified is null and v_status = 'live' then
    update artists set status = 'disputed', disputed_at = now(), disputed_from = v_status where id = p_artist;
  end if;
end $$;
revoke execute on function report_artist(uuid,text) from public, anon;
grant execute on function report_artist(uuid,text) to authenticated;
