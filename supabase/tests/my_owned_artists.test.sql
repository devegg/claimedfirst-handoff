begin;
select plan(7);
insert into auth.users(id, email) values ('00000000-0000-0000-0000-00000000d001','o1@example.test'),('00000000-0000-0000-0000-00000000d002','o2@example.test');
insert into profiles(id,handle) values ('00000000-0000-0000-0000-00000000d001','owner_one'),('00000000-0000-0000-0000-00000000d002','owner_two');
insert into artists(id,name,slug,status) values
  ('00000000-0000-0000-0000-00000000e001','Mine A','mine-a','live'),
  ('00000000-0000-0000-0000-00000000e002','Mine Gone','mine-gone','delisted'),
  ('00000000-0000-0000-0000-00000000e003','Not Mine','not-mine','live');
insert into artist_owners(artist_id, owner_id) values
  ('00000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-00000000d001'),
  ('00000000-0000-0000-0000-00000000e002','00000000-0000-0000-0000-00000000d001'),
  ('00000000-0000-0000-0000-00000000e003','00000000-0000-0000-0000-00000000d002');
select ok(not has_function_privilege('anon','my_owned_artists()','execute'),'anon cannot execute');
select ok(has_function_privilege('authenticated','my_owned_artists()','execute'),'authenticated can execute');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000d001"}',true);
set local role authenticated;
select is((select count(*)::int from my_owned_artists()),1,'owner sees only their non-delisted artist');
select is((select slug from my_owned_artists()),'mine-a','returns the right slug');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000d002"}',true);
select is((select slug from my_owned_artists()),'not-mine','another owner sees only theirs');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000d999"}',true);
select is((select count(*)::int from my_owned_artists()),0,'non-owner sees nothing');
select set_config('request.jwt.claims','',true);
select throws_ok($$select * from my_owned_artists()$$,'P0001','not_authenticated','no JWT rejected');
select * from finish();
rollback;
