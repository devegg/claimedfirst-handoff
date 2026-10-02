begin;
select plan(4);
insert into auth.users(id,email) select format('00000000-0000-0000-0000-0000000000a%s',g)::uuid, 't'||g||'@example.test' from generate_series(1,3) g;
insert into profiles(id,handle,created_at) select format('00000000-0000-0000-0000-0000000000a%s',g)::uuid, 'test_'||g, timestamptz '2025-12-01 00:00+00' from generate_series(1,3) g;
insert into artists(id,name,slug,status) values ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live');
insert into claims(artist_id,user_id,claim_number,claimed_at,status,visibility) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1',1, timestamptz '2026-01-05 13:45:10+00','active','public'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a2',2, timestamptz '2026-01-06 17:22:33+00','active','anonymous'),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a3',3, timestamptz '2026-01-07 09:10:11+00','active','artist');
select is((select claimed_at from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=1), timestamptz '2026-01-05 13:45:10+00', 'public claim keeps the exact time');
select is((select claimed_at from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=2), timestamptz '2026-01-06 00:00:00+00', 'anonymous claim is truncated to the day');
select is((select claimed_at from artist_founders('00000000-0000-0000-0000-0000000000b1') where claim_number=3), timestamptz '2026-01-07 00:00:00+00', 'artist-only claim is truncated to the day');
select is((select proargnames from pg_proc where proname='artist_founders'), array['p_artist','claim_number','handle','status','claimed_at','held_days','provisional','dropped_after_days','dropped_early'], 'old columns unchanged, new ones appended');
select * from finish();
rollback;
