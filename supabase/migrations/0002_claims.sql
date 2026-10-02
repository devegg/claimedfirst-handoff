create or replace function qualified_claimers(p_artist uuid, p_at timestamptz)
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int from claims c join profiles p on p.id=c.user_id
  where c.artist_id=p_artist and c.claimed_at<=p_at and p.created_at + interval '7 days' <= p_at
$$;

create or replace function claim_artist(p_artist uuid, p_visibility text default null) returns claims
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_status text; v_frozen boolean;
        v_slots int; v_active int; v_num int; v_row claims;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select status, claims_frozen into v_status, v_frozen from artists where id=p_artist;
  if v_status is distinct from 'live' or v_frozen then raise exception 'artist_not_claimable'; end if;
  -- lock the scout's profile first (lock order is always profile, then artist): serializes this
  -- scout's claims so the slot, duplicate and cooldown checks below cannot race
  select slots_unlocked into v_slots from profiles where id=v_user for update;
  if not found then raise exception 'not_authenticated'; end if;
  if exists(select 1 from claims where artist_id=p_artist and user_id=v_user and status='active')
    then raise exception 'already_claimed'; end if;
  if exists(select 1 from claims where artist_id=p_artist and user_id=v_user and status='historical'
            and dropped_at > now() - interval '30 days')
    then raise exception 'cooldown'; end if;
  select count(*) into v_active from claims where user_id=v_user and status='active';
  if v_active >= v_slots then raise exception 'roster_full'; end if;
  -- the UPDATE row-locks the artist, so concurrent claims take numbers one at a time
  update artists set next_claim_number = next_claim_number + 1
   where id=p_artist returning next_claim_number - 1 into v_num;
  begin
    insert into claims(artist_id,user_id,claim_number,base_qualified,visibility)
     values (p_artist,v_user,v_num,qualified_claimers(p_artist,now()),
             coalesce(p_visibility,(select default_claim_visibility from profiles where id=v_user))) returning * into v_row;
  exception when unique_violation then
    raise exception 'already_claimed';
  end;
  return v_row;
end $$;

create or replace function drop_claim(p_claim uuid) returns claims
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row claims;
begin
  update claims set status='historical', dropped_at=now()
   where id=p_claim and user_id=auth.uid() and status='active' returning * into v_row;
  if v_row.id is null then raise exception 'not_your_claim'; end if;
  return v_row;
end $$;
revoke execute on function claim_artist(uuid,text), drop_claim(uuid), qualified_claimers(uuid,timestamptz) from public, anon, authenticated;
grant execute on function claim_artist(uuid,text), drop_claim(uuid) to authenticated;
