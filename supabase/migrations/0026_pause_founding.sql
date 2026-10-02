-- 0026: same as 0004 but automatic Founding Scout awards are paused.
-- The only way a profiles row is created. No insert policy exists on profiles; keep it that way.
create or replace function create_profile(p_handle text, p_ref text default null) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_referrer uuid;
  v_founding boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_handle is null or p_handle !~ '^[a-z0-9_]{3,20}$'
     or p_handle = any (array['admin','claimedfirst','support','root','api','login','onboarding','artist','scout','about',
                              'guide','roster','leaderboard','submit','invite','terms','privacy','settings']) then
    raise exception 'invalid_handle' using errcode = '22023';
  end if;

  -- Serialise profile creation so the founding-scout count cannot be raced past 100.
  perform pg_advisory_xact_lock(hashtext('create_profile'));

  if exists (select 1 from profiles where id = v_uid) then
    raise exception 'profile_exists' using errcode = '23505';
  end if;
  if exists (select 1 from profiles where handle = p_handle) then
    raise exception 'handle_taken' using errcode = '23505';
  end if;

  if p_ref is not null and p_ref ~ '^[A-Za-z0-9]{1,16}$' then
    select id into v_referrer from profiles where referral_code = p_ref and id <> v_uid;
  end if;

  -- Founding Scout awards are PAUSED (Brian, 2026-10-01): the rule is undecided. Award later with an explicit UPDATE.
  v_founding := false;

  insert into profiles(id, handle, referred_by, founding_scout)
  values (v_uid, p_handle, v_referrer, v_founding);
  if v_referrer is not null then
    insert into referrals(referrer, referred) values (v_referrer, v_uid);
  end if;
  return v_uid;
end $$;

revoke execute on function create_profile(text, text) from public, anon;
grant execute on function create_profile(text, text) to authenticated;
