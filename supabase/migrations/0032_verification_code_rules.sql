-- 0032: a verification code works for 24 hours and once.
-- The code's age is the time of its first row in verification_attempts (the row made when it was issued).
-- A code that already has a 'found' row cannot verify again. verify_artist_with_code does the checks, records the
-- success and calls mark_artist_verified (unchanged, 0022) in ONE transaction, with the artist row locked, so
-- verified_at, owner and status still change together or not at all.
create or replace function verify_artist_with_code(p_artist uuid, p_user uuid, p_code text, p_url text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_first timestamptz;
begin
  perform 1 from artists where id = p_artist for update;
  if not found then raise exception 'artist_not_found'; end if;
  select min(checked_at) into v_first from verification_attempts
   where artist_id = p_artist and user_id = p_user and code = p_code;
  if v_first is null then raise exception 'code_not_issued'; end if;
  if exists (select 1 from verification_attempts where code = p_code and result = 'found') then
    raise exception 'code_used';
  end if;
  if v_first <= now() - interval '24 hours' then raise exception 'code_expired'; end if;
  insert into verification_attempts(artist_id, user_id, code, url, result) values (p_artist, p_user, p_code, p_url, 'found');
  perform mark_artist_verified(p_artist, p_user);
end $$;
revoke execute on function verify_artist_with_code(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function verify_artist_with_code(uuid,uuid,text,text) to service_role;
