-- The one place the watchlist limit lives; a future paid tier changes this function.
create or replace function watchlist_limit() returns int
language sql immutable as $$ select 100 $$;

create or replace function enforce_watchlist_limit() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- backstop: serialize inserts for one scout even if a caller skipped watch_artist's profile lock
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if (select count(*) from watchlist where user_id = new.user_id) >= watchlist_limit() then
    raise exception 'watchlist_full';
  end if;
  return new;
end $$;

create trigger watchlist_cap before insert on watchlist
  for each row execute function enforce_watchlist_limit();

-- Inserts and updates go only through the functions in 0009; owners may read and delete.
drop policy "own watchlist" on watchlist;
create policy "own watchlist select" on watchlist for select using (auth.uid() = user_id);
create policy "own watchlist delete" on watchlist for delete using (auth.uid() = user_id);
