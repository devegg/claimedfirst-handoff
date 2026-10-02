-- Visibility and watchlist functions. All run as the caller (auth.uid()); none touch other scouts' rows.

create or replace function set_all_claim_visibility(p_visibility text) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_n int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  update claims set visibility = p_visibility where user_id = v_user;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function set_all_watch_named(p_named boolean) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_n int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  update watchlist set named_to_artist = coalesce(p_named, false) where user_id = v_user;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function set_default_visibility(p_claim text, p_watch boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_claim is null or p_claim not in ('public','artist','anonymous') then
    raise exception 'invalid_visibility';
  end if;
  update profiles set default_claim_visibility = p_claim, default_watch_named = coalesce(p_watch, false)
   where id = v_user;
end $$;

create or replace function set_claim_visibility(p_claim uuid, p_visibility text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_n int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  update claims set visibility = p_visibility where id = p_claim and user_id = v_user;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'not_your_claim'; end if;
end $$;

create or replace function set_watch_named(p_artist uuid, p_named boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_n int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  update watchlist set named_to_artist = coalesce(p_named, false)
   where artist_id = p_artist and user_id = v_user;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'not_watching'; end if;
end $$;

create or replace function watch_artist(p_artist uuid, p_named boolean default null) returns watchlist
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_default boolean; v_status text; v_row watchlist;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  -- lock the caller's profile first (R10): serializes this scout's watches
  select default_watch_named into v_default from profiles where id = v_user for update;
  if not found then raise exception 'not_authenticated'; end if;
  select status into v_status from artists where id = p_artist;
  if v_status is distinct from 'live' then raise exception 'artist_not_claimable'; end if;
  insert into watchlist(user_id, artist_id, named_to_artist)
   values (v_user, p_artist, coalesce(p_named, v_default))
   on conflict (user_id, artist_id) do update set named_to_artist = excluded.named_to_artist
   returning * into v_row;
  return v_row;
end $$;

create or replace function unwatch_artist(p_artist uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  delete from watchlist where user_id = v_user and artist_id = p_artist;
end $$;

revoke execute on function
  set_all_claim_visibility(text), set_all_watch_named(boolean), set_default_visibility(text, boolean),
  set_claim_visibility(uuid, text), set_watch_named(uuid, boolean), watch_artist(uuid, boolean),
  unwatch_artist(uuid)
  from public, anon, authenticated;
grant execute on function
  set_all_claim_visibility(text), set_all_watch_named(boolean), set_default_visibility(text, boolean),
  set_claim_visibility(uuid, text), set_watch_named(uuid, boolean), watch_artist(uuid, boolean),
  unwatch_artist(uuid)
  to authenticated;
