-- 0035: a new claim is locked for 72 hours (decision 1). drop_claim refuses with claim_locked;
-- the error DETAIL carries the unlock time (ISO 8601, UTC). Signature unchanged.
create or replace function claim_lock_period() returns interval
language sql immutable set search_path = public, pg_temp as $$ select interval '72 hours' $$;
grant execute on function claim_lock_period() to anon, authenticated, service_role;

-- unlock time of the caller's own active claim; null for anything else
create or replace function claim_unlocks_at(p_claim uuid) returns timestamptz
language sql stable security definer set search_path = public, pg_temp as $$
  select claimed_at + claim_lock_period() from claims
   where id = p_claim and user_id = auth.uid() and status = 'active'
$$;
revoke execute on function claim_unlocks_at(uuid) from public, anon;
grant execute on function claim_unlocks_at(uuid) to authenticated;

create or replace function drop_claim(p_claim uuid) returns claims
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row claims; v_unlock timestamptz;
begin
  select * into v_row from claims where id = p_claim and user_id = auth.uid() and status = 'active' for update;
  if v_row.id is null then raise exception 'not_your_claim'; end if;
  v_unlock := v_row.claimed_at + claim_lock_period();
  if v_unlock > now() then
    raise exception 'claim_locked' using detail = to_char(v_unlock at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;
  update claims set status = 'historical', dropped_at = now() where id = p_claim returning * into v_row;
  return v_row;
end $$;
revoke execute on function drop_claim(uuid) from public, anon;
grant execute on function drop_claim(uuid) to authenticated;
