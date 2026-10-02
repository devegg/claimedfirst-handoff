-- Task 13b (R34): placeholder-art personalization. A style name only: no image column, no upload, no storage.
-- Null means "use the default generated from the slug". The value is public (live artist rows are readable) and cosmetic.
alter table artists add column record_style text
  check (record_style is null or record_style in ('classic','ember','tide','paper','night','dusk'));

-- R9: security definer, fixed search_path, execute revoked then granted. Owner check and row lock via artist_owner_guard.
create or replace function set_record_style(p_artist uuid, p_style text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform artist_owner_guard(p_artist);
  if p_style is not null and p_style not in ('classic','ember','tide','paper','night','dusk') then
    raise exception 'invalid_style';
  end if;
  update artists set record_style = p_style where id = p_artist;
end $$;
revoke execute on function set_record_style(uuid, text) from public, anon;
grant execute on function set_record_style(uuid, text) to authenticated;
