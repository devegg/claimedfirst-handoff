-- BEFORE INSERT runs before ON CONFLICT arbitration, so an upsert of an artist already on the
-- list was counted as a new row. Skip the count when the row already exists (lock stays first).
create or replace function enforce_watchlist_limit() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if exists (select 1 from watchlist where user_id = new.user_id and artist_id = new.artist_id) then
    return new;
  end if;
  if (select count(*) from watchlist where user_id = new.user_id) >= watchlist_limit() then
    raise exception 'watchlist_full';
  end if;
  return new;
end $$;

-- Validate in the function so the error matches set_default_visibility.
create or replace function set_claim_visibility(p_claim uuid, p_visibility text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_n int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_visibility is null or p_visibility not in ('public','artist','anonymous') then
    raise exception 'invalid_visibility';
  end if;
  update claims set visibility = p_visibility where id = p_claim and user_id = v_user;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'not_your_claim'; end if;
end $$;
