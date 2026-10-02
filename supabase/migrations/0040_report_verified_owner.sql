-- 0040: reports (decision 7). A reporter who owns a verified page has no account-age wait; others need
-- account_min_age(). Otherwise identical to 0031 (limit of 5 per 24 hours, pending reports only recorded).
-- The age rule only gates starting a dispute, as before: a younger reporter's report is stored.
create or replace function report_artist(p_artist uuid, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_reason text := btrim(coalesce(p_reason, '')); v_status text; v_verified timestamptz; v_old boolean;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not rate_limit_hit('report:' || auth.uid()::text, 5, interval '24 hours') then raise exception 'report_limit_reached'; end if;
  if char_length(v_reason) not between 1 and 500 then raise exception 'invalid_reason'; end if;
  select status, verified_at into v_status, v_verified from artists where id = p_artist for update;
  if not found then raise exception 'artist_not_found'; end if;
  insert into artist_reports(artist_id, reporter_id, reason) values (p_artist, auth.uid(), v_reason)
    on conflict (artist_id, reporter_id) do update set reason = excluded.reason;
  select (created_at <= now() - account_min_age()) or is_verified_owner(id) into v_old from profiles where id = auth.uid();
  if coalesce(v_old, false) and v_verified is null and v_status = 'live' then
    update artists set status = 'disputed', disputed_at = now(), disputed_from = v_status where id = p_artist;
  end if;
end $$;
revoke execute on function report_artist(uuid,text) from public, anon;
grant execute on function report_artist(uuid,text) to authenticated;
