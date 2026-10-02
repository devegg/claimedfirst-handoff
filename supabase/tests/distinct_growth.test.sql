begin;
select plan(5);
insert into auth.users(id,email) select format('00000000-0000-0000-0000-0000000000a%s',g)::uuid, 't'||g||'@example.test' from generate_series(1,4) g;
insert into profiles(id,handle,created_at) select format('00000000-0000-0000-0000-0000000000a%s',g)::uuid, 'test_'||g, timestamptz '2025-12-01 00:00+00' from generate_series(1,4) g;
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live'),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist 2','test-artist-2','live'),
 ('00000000-0000-0000-0000-0000000000b3','Test Artist 3','test-artist-3','live');
-- b1: test_1 drops and re-adds twice (3 rows), test_2 once, test_3 once
insert into claims(artist_id,user_id,claim_number,claimed_at,dropped_at,status) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1',1, timestamptz '2026-01-01 00:00+00', timestamptz '2026-01-05 00:00+00','historical'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1',2, timestamptz '2026-01-10 00:00+00', timestamptz '2026-01-15 00:00+00','historical'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1',3, timestamptz '2026-01-20 00:00+00', null,'active'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a2',4, timestamptz '2026-01-21 00:00+00', null,'active'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a3',5, timestamptz '2026-01-22 00:00+00', null,'active');
-- b2: one scout who drops and re-adds
insert into claims(artist_id,user_id,claim_number,claimed_at,dropped_at,status) values
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1',1, timestamptz '2026-01-01 00:00+00', timestamptz '2026-01-05 00:00+00','historical'),
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a1',2, timestamptz '2026-01-10 00:00+00', null,'active');
-- b3: two different scouts
insert into claims(artist_id,user_id,claim_number,claimed_at,status) values
 ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a1',1, timestamptz '2026-01-01 00:00+00','active'),
 ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a2',2, timestamptz '2026-01-02 00:00+00','active');

select is(qualified_claimers('00000000-0000-0000-0000-0000000000b2', timestamptz '2026-02-01 00:00+00'), 1, 'a scout who drops and re-adds counts once');
select is(qualified_claimers('00000000-0000-0000-0000-0000000000b3', timestamptz '2026-02-01 00:00+00'), 2, 'two different scouts count twice');
select is(qualified_claimers('00000000-0000-0000-0000-0000000000b1', timestamptz '2026-02-01 00:00+00'), 3, 'three scouts with five claim rows count three');
select is(qualified_claimers_excluding('00000000-0000-0000-0000-0000000000b1', timestamptz '2026-02-01 00:00+00', '00000000-0000-0000-0000-0000000000a2'), 2,
  'cycling by test_1 adds one, not three, to another claimer''s growth');
select is(qualified_claimers_excluding('00000000-0000-0000-0000-0000000000b1', timestamptz '2026-02-01 00:00+00', '00000000-0000-0000-0000-0000000000a1'), 2, 'own rows are still left out');
select * from finish();
rollback;
