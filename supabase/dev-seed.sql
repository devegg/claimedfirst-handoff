-- Run `npx supabase db reset` before `npx supabase test db`; the demo seed (supabase/dev-seed.sql) makes some tests fail.
-- Fictional demo data for local development only. Run with:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/dev-seed.sql
-- Safe to re-run: it removes its own rows first. Names follow "Test N" so nothing looks real.
begin;
delete from claims where user_id in (select id from profiles where handle like 'test\_%');
delete from season_claim_points; delete from season_scores; delete from season_entrants; delete from seasons;
delete from watchlist where user_id in (select id from profiles where handle like 'test\_%');
delete from artist_submissions where artist_id in (select id from artists where slug like 'test-artist-%');
delete from artist_links where artist_id in (select id from artists where slug like 'test-artist-%');
delete from artists where slug like 'test-artist-%';
delete from profiles where handle like 'test\_%';
delete from auth.users where email like 'test%@example.test';

insert into auth.users(id,email) select ('00000000-0000-0000-0000-00000000010' || i)::uuid, 'test' || i || '@example.test' from generate_series(1,6) i;
insert into profiles(id,handle,founding_scout,created_at,slots_unlocked)
 select ('00000000-0000-0000-0000-00000000010' || i)::uuid, 'test_' || i, true, now() - interval '30 days', case when i=1 then 10 else 5 end from generate_series(1,6) i;

insert into artists(id,name,slug,status,verified_at,next_claim_number) values
 ('00000000-0000-0000-0000-000000000201','Test Artist 1','test-artist-1','live',now() - interval '20 days',1),
 ('00000000-0000-0000-0000-000000000202','Test Artist 2','test-artist-2','live',null,1),
 ('00000000-0000-0000-0000-000000000203','Test Artist 3','test-artist-3','live',null,1),
 ('00000000-0000-0000-0000-000000000204','Test Artist 4','test-artist-4','pending',null,1);
insert into artist_links(artist_id,platform,canonical_key,url,is_primary) values
 ('00000000-0000-0000-0000-000000000201','suno','suno:@test-artist-1','https://suno.com/@test-artist-1',true),
 ('00000000-0000-0000-0000-000000000202','web','web:example.com/test-artist-2','https://example.com/test-artist-2',true),
 ('00000000-0000-0000-0000-000000000203','web','web:example.com/test-artist-3','https://example.com/test-artist-3',true),
 ('00000000-0000-0000-0000-000000000204','web','web:example.com/test-artist-4','https://example.com/test-artist-4',true);

-- Test Artist 1: a mix of visibility levels, one dropped (historical), two claims too recent for the boards
insert into claims(artist_id,user_id,claim_number,claimed_at,dropped_at,status,visibility) values
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101',1, now() - interval '25 days', null,'active','public'),
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000102',2, now() - interval '24 days', null,'active','artist'),
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000103',3, now() - interval '22 days', null,'active','anonymous'),
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000104',4, now() - interval '20 days', now() - interval '2 days','historical','public'),
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000105',5, now() - interval '3 hours', null,'active','public'),
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000106',6, now() - interval '2 hours', null,'active','public');
update artists set next_claim_number = 7 where id = '00000000-0000-0000-0000-000000000201';
insert into claims(artist_id,user_id,claim_number,claimed_at,status,visibility) values
 ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000102',1, now() - interval '18 days','active','public'),
 ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000101',2, now() - interval '17 days','active','public'),
 ('00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000101',1, now() - interval '16 days','active','public');
update artists set next_claim_number = 3 where id = '00000000-0000-0000-0000-000000000202';
update artists set next_claim_number = 2 where id = '00000000-0000-0000-0000-000000000203';
insert into artist_submissions(artist_id,user_id) values ('00000000-0000-0000-0000-000000000204','00000000-0000-0000-0000-000000000101');
insert into watchlist(user_id,artist_id,named_to_artist) values ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000203',false);
select refresh_season_scores(date_trunc('month', now() at time zone 'utc') at time zone 'utc');
commit;
