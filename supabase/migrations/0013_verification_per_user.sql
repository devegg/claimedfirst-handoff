-- R14: verification codes are issued per (artist, user).
-- The table is empty before launch, so NOT NULL is safe.
delete from verification_attempts;
alter table verification_attempts add column user_id uuid not null references profiles(id) on delete cascade;
create index verification_attempts_artist_user_idx on verification_attempts(artist_id, user_id, checked_at desc);
-- RLS unchanged: no policies; service role only.
