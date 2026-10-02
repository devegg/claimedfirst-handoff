begin;
select plan(82);

-- ---- fixtures: scouts test_1..test_9 ----
insert into auth.users(id,email)
 select format('00000000-0000-0000-0000-0000000000a%s', g)::uuid, format('t%s@example.test', g) from generate_series(1,9) g;
insert into profiles(id,handle)
 select format('00000000-0000-0000-0000-0000000000a%s', g)::uuid, format('test_%s', g) from generate_series(1,9) g;
update profiles set created_at = now() - interval '8 days';  -- R36: only accounts 7+ days old can start a dispute
-- b1 live+verified (owner test_1); b2 live, no owner; b3 live+verified (owner test_8);
-- b4 live, unverified; b5 pending, unverified; b6 live+verified (owner test_1, undo-delist target)
insert into artists(id,name,slug,status,verified_at,next_claim_number) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live',now(),5),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist 2','test-artist-2','live',null,1),
 ('00000000-0000-0000-0000-0000000000b3','Test Artist 3','test-artist-3','live',now(),1),
 ('00000000-0000-0000-0000-0000000000b4','Test Artist 4','test-artist-4','live',null,1),
 ('00000000-0000-0000-0000-0000000000b5','Test Artist 5','test-artist-5','pending',null,1),
 ('00000000-0000-0000-0000-0000000000b6','Test Artist 6','test-artist-6','live',now(),1);
insert into artist_owners(artist_id,owner_id) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000a8'),
 ('00000000-0000-0000-0000-0000000000b6','00000000-0000-0000-0000-0000000000a1');
-- claims on b1: public #1 (test_2), anonymous #2 (test_3), artist-level #3 (test_4), historical public #4 (test_5)
insert into claims(artist_id,user_id,claim_number,status,visibility,dropped_at) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a2',1,'active','public',null),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a3',2,'active','anonymous',null),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a4',3,'active','artist',null),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a5',4,'historical','public',now());
-- watchers on b1: test_6 named, test_7 anonymous, test_9 named
insert into watchlist(user_id,artist_id,named_to_artist) values
 ('00000000-0000-0000-0000-0000000000a6','00000000-0000-0000-0000-0000000000b1',true),
 ('00000000-0000-0000-0000-0000000000a7','00000000-0000-0000-0000-0000000000b1',false),
 ('00000000-0000-0000-0000-0000000000a9','00000000-0000-0000-0000-0000000000b1',true);

-- error recorder usable under any role
create table errs(label text, msg text);
grant all on errs to anon, authenticated;
create function t_try(p_label text, p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
  insert into errs values (p_label, 'ok');
exception when others then
  insert into errs values (p_label, sqlerrm);
end $$;
grant execute on function t_try(text,text) to anon, authenticated;

-- ---- privileges, schema ----
select ok(has_function_privilege('authenticated','set_top_songs(uuid,jsonb)','execute'), 'authenticated: set_top_songs');
select ok(has_function_privilege('authenticated','set_donation_url(uuid,text)','execute'), 'authenticated: set_donation_url');
select ok(has_function_privilege('authenticated','set_artist_state(uuid,boolean,boolean)','execute'), 'authenticated: set_artist_state');
select ok(has_function_privilege('authenticated','artist_audience(uuid)','execute'), 'authenticated: artist_audience');
select ok(has_function_privilege('authenticated','artist_watch_counts(uuid)','execute'), 'authenticated: artist_watch_counts');
select ok(has_function_privilege('authenticated','report_artist(uuid,text)','execute'), 'authenticated: report_artist');
select ok(not has_function_privilege('anon','set_top_songs(uuid,jsonb)','execute')
      and not has_function_privilege('anon','set_donation_url(uuid,text)','execute')
      and not has_function_privilege('anon','set_artist_state(uuid,boolean,boolean)','execute')
      and not has_function_privilege('anon','artist_audience(uuid)','execute')
      and not has_function_privilege('anon','artist_watch_counts(uuid)','execute')
      and not has_function_privilege('anon','report_artist(uuid,text)','execute'), 'anon: none of the owner/reporter functions');
select ok(not has_function_privilege('public','set_top_songs(uuid,jsonb)','execute')
      and not has_function_privilege('public','artist_audience(uuid)','execute')
      and not has_function_privilege('public','report_artist(uuid,text)','execute'), 'public: none');
select ok(not has_function_privilege('authenticated','artist_owner(uuid)','execute'), 'artist_owner not callable by authenticated');
select ok(not has_function_privilege('anon','artist_owner(uuid)','execute'), 'artist_owner not callable by anon');
select ok(not has_function_privilege('public','artist_owner(uuid)','execute'), 'artist_owner not callable by public');
select ok((select relrowsecurity from pg_class where oid='public.artist_owners'::regclass), 'artist_owners RLS on');
select ok((select relrowsecurity from pg_class where oid='public.artist_reports'::regclass), 'artist_reports RLS on');
select is((select count(*)::int from pg_policies where tablename in ('artist_owners','artist_reports')), 0, 'no policies on owners/reports');
select ok((select bool_and(prosecdef) from pg_proc where proname in ('set_top_songs','set_donation_url','set_artist_state','artist_audience','artist_watch_counts','report_artist','artist_owner')), 'all security definer');
select is((select proargnames from pg_proc where proname='artist_audience'),
  array['p_artist','kind','handle','claim_number','status','since'], 'artist_audience columns: no user id');

-- ---- owner enforcement ----
set local role authenticated;
select set_config('request.jwt.claims','{}',true);
select t_try('so_anon_ns','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''[]'')');
select t_try('sd_anon','select set_donation_url(''00000000-0000-0000-0000-0000000000b1'',null)');
select t_try('ss_anon','select set_artist_state(''00000000-0000-0000-0000-0000000000b1'',true,false)');
select t_try('au_anon','select * from artist_audience(''00000000-0000-0000-0000-0000000000b1'')');
select t_try('wc_anon','select * from artist_watch_counts(''00000000-0000-0000-0000-0000000000b1'')');
select t_try('rp_anon','select report_artist(''00000000-0000-0000-0000-0000000000b1'',''x'')');
select is((select count(*)::int from errs where label like '%anon%' and msg='not_authenticated'), 6, 'signed-out: all six refused not_authenticated');

-- test_2: a claimant who is not the owner
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2"}',true);
select t_try('so_claimant','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''[]'')');
select t_try('sd_claimant','select set_donation_url(''00000000-0000-0000-0000-0000000000b1'',null)');
select t_try('ss_claimant','select set_artist_state(''00000000-0000-0000-0000-0000000000b1'',true,false)');
select t_try('au_claimant','select * from artist_audience(''00000000-0000-0000-0000-0000000000b1'')');
select t_try('wc_claimant','select * from artist_watch_counts(''00000000-0000-0000-0000-0000000000b1'')');
select is((select count(*)::int from errs where label like '%claimant' and msg='not_owner'), 5, 'claimant non-owner: all five refused not_owner');
-- owner of ANOTHER artist (test_8 owns b3) cannot act on b1
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a8"}',true);
select t_try('so_other','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''[]'')');
select t_try('ss_other','select set_artist_state(''00000000-0000-0000-0000-0000000000b1'',true,false)');
select is((select count(*)::int from errs where label like '%other' and msg='not_owner'), 2, 'owner of another artist refused');
-- unverified artist with no owner: even test_1 is refused
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select t_try('so_noowner','select set_top_songs(''00000000-0000-0000-0000-0000000000b2'',''[]'')');
select t_try('sd_noowner','select set_donation_url(''00000000-0000-0000-0000-0000000000b2'',null)');
select t_try('ss_noowner','select set_artist_state(''00000000-0000-0000-0000-0000000000b2'',true,false)');
select t_try('au_noowner','select * from artist_audience(''00000000-0000-0000-0000-0000000000b2'')');
select t_try('wc_noowner','select * from artist_watch_counts(''00000000-0000-0000-0000-0000000000b2'')');
select is((select count(*)::int from errs where label like '%noowner' and msg='not_owner'), 5, 'artist with no owner: all refused not_owner');
select t_try('so_missing','select set_top_songs(''00000000-0000-0000-0000-00000000ffff'',''[]'')');
select is((select msg from errs where label='so_missing'), 'not_owner', 'nonexistent artist: not_owner');

-- ---- songs (owner test_1 on b1) ----
select t_try('s0','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''[]'')');
select is((select msg from errs where label='s0'), 'ok', 'empty list accepted');
select t_try('s1','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''[{"title":"  Song A ","url":"https://music.example/a"}]'')');
select is((select msg from errs where label='s1'), 'ok', '1 song accepted');
select is((select title from top_songs where artist_id='00000000-0000-0000-0000-0000000000b1'), 'Song A', 'title trimmed');
select t_try('s10', format('select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',%L)',
  (select jsonb_agg(jsonb_build_object('title','Song '||g,'url','https://music.example/'||g) order by g desc)::text from generate_series(1,10) g)));
select is((select msg from errs where label='s10'), 'ok', '10 songs accepted');
select is((select array_agg(title order by position) from top_songs where artist_id='00000000-0000-0000-0000-0000000000b1'),
  array['Song 10','Song 9','Song 8','Song 7','Song 6','Song 5','Song 4','Song 3','Song 2','Song 1'], 'positions follow array order');
select is((select array_agg(position order by position) from top_songs where artist_id='00000000-0000-0000-0000-0000000000b1'),
  array[1,2,3,4,5,6,7,8,9,10], 'positions are 1..10');
select t_try('s11', format('select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',%L)',
  (select jsonb_agg(jsonb_build_object('title','S'||g,'url','https://music.example/'||g))::text from generate_series(1,11) g)));
select is((select msg from errs where label='s11'), 'too_many_songs', '11 rejected');
select t_try('shttp','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''[{"title":"A","url":"http://music.example/a"}]'')');
select is((select msg from errs where label='shttp'), 'invalid_song_url', 'http rejected');
select t_try('snodot','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''[{"title":"A","url":"https://localhost/a"}]'')');
select is((select msg from errs where label='snodot'), 'invalid_song_url', 'host without a dot rejected');
select t_try('stitle0','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''[{"title":"   ","url":"https://music.example/a"}]'')');
select is((select msg from errs where label='stitle0'), 'invalid_song', 'blank title rejected');
select t_try('stitle101', format('select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',%L)',
  jsonb_build_array(jsonb_build_object('title',repeat('x',101),'url','https://music.example/a'))::text));
select is((select msg from errs where label='stitle101'), 'invalid_song', '101-char title rejected');
select t_try('stitle100', format('select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',%L)',
  jsonb_build_array(jsonb_build_object('title',repeat('x',100),'url','https://music.example/a'))::text));
select is((select msg from errs where label='stitle100'), 'ok', '100-char title accepted');
select t_try('surl501', format('select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',%L)',
  jsonb_build_array(jsonb_build_object('title','A','url','https://music.example/'||repeat('x',501-22)))::text));
select is((select msg from errs where label='surl501'), 'invalid_song_url', '501-char url rejected');
select t_try('surl500', format('select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',%L)',
  jsonb_build_array(jsonb_build_object('title','A','url','https://music.example/'||repeat('x',500-22)))::text));
select is((select msg from errs where label='surl500'), 'ok', '500-char url accepted');
select t_try('snotarr','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''{"title":"A"}'')');
select is((select msg from errs where label='snotarr'), 'invalid_songs', 'non-array rejected');
select t_try('sdup','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''[{"title":"D","url":"https://m.example/d"},{"title":"D","url":"https://m.example/d"}]'')');
select is((select count(*)::int from top_songs where artist_id='00000000-0000-0000-0000-0000000000b1'), 2, 'duplicates allowed');
-- atomic: a failing batch leaves the previous list intact
select t_try('satomic','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''[{"title":"N1","url":"https://m.example/1"},{"title":"N2","url":"http://bad.example/2"}]'')');
select is((select msg from errs where label='satomic'), 'invalid_song_url', 'failing batch rejected');
select is((select array_agg(title order by position) from top_songs where artist_id='00000000-0000-0000-0000-0000000000b1'), array['D','D'], 'previous list intact after failure');
select t_try('sclear','select set_top_songs(''00000000-0000-0000-0000-0000000000b1'',''[]'')');
select is((select count(*)::int from top_songs where artist_id='00000000-0000-0000-0000-0000000000b1'), 0, 'empty array clears the list');

-- ---- donation url ----
select t_try('d1','select set_donation_url(''00000000-0000-0000-0000-0000000000b1'',''https://tip.example/me'')');
select is((select donation_url from artists where id='00000000-0000-0000-0000-0000000000b1'), 'https://tip.example/me', 'donation url set');
select t_try('dhttp','select set_donation_url(''00000000-0000-0000-0000-0000000000b1'',''http://tip.example/me'')');
select is((select msg from errs where label='dhttp'), 'invalid_donation_url', 'http donation rejected');
select t_try('dnodot','select set_donation_url(''00000000-0000-0000-0000-0000000000b1'',''https://tip/me'')');
select is((select msg from errs where label='dnodot'), 'invalid_donation_url', 'dotless host rejected');
select t_try('d301', format('select set_donation_url(''00000000-0000-0000-0000-0000000000b1'',%L)', 'https://tip.example/'||repeat('x',301-20)));
select is((select msg from errs where label='d301'), 'invalid_donation_url', '301 chars rejected');
select t_try('d300', format('select set_donation_url(''00000000-0000-0000-0000-0000000000b1'',%L)', 'https://tip.example/'||repeat('x',300-20)));
select is((select msg from errs where label='d300'), 'ok', '300 chars accepted');
select t_try('dnull','select set_donation_url(''00000000-0000-0000-0000-0000000000b1'',null)');
select is((select donation_url from artists where id='00000000-0000-0000-0000-0000000000b1'), null, 'null clears');
select t_try('dset2','select set_donation_url(''00000000-0000-0000-0000-0000000000b1'',''https://tip.example/me'')');
select t_try('dempty','select set_donation_url(''00000000-0000-0000-0000-0000000000b1'','''')');
select is((select donation_url from artists where id='00000000-0000-0000-0000-0000000000b1'), null, 'empty string clears');

-- ---- audience ----
select is((select count(*)::int from artist_audience('00000000-0000-0000-0000-0000000000b1') where kind='claimer'), 4, 'all 4 claims (active + historical) listed');
select is((select handle from artist_audience('00000000-0000-0000-0000-0000000000b1') where claim_number=1), 'test_2', 'public claim shows handle');
select is((select handle from artist_audience('00000000-0000-0000-0000-0000000000b1') where claim_number=3), 'test_4', 'artist-level claim shows handle');
select is((select handle from artist_audience('00000000-0000-0000-0000-0000000000b1') where claim_number=2), 'Anonymous scout', 'anonymous claim masked');
select is((select status from artist_audience('00000000-0000-0000-0000-0000000000b1') where claim_number=4), 'historical', 'historical claim included');
select is((select count(*)::int from artist_audience('00000000-0000-0000-0000-0000000000b1') a where to_jsonb(a)::text ilike '%test_3%' or to_jsonb(a)::text ilike '%0000a3%'), 0, 'anonymous scout appears nowhere');
select is((select array_agg(handle order by handle) from artist_audience('00000000-0000-0000-0000-0000000000b1') where kind='watcher'), array['test_6','test_9'], 'only named watchers listed');
select is((select count(*)::int from artist_audience('00000000-0000-0000-0000-0000000000b1') a where to_jsonb(a)::text ilike '%test_7%'), 0, 'anonymous watcher not listed');
select is((select array_agg(claim_number order by claim_number) from artist_audience('00000000-0000-0000-0000-0000000000b1') where kind='claimer'), array[1,2,3,4], 'claims ordered by claim number only');
select is((select total from artist_watch_counts('00000000-0000-0000-0000-0000000000b1')), 3, 'watch total includes anonymous');
select is((select named from artist_watch_counts('00000000-0000-0000-0000-0000000000b1')), 2, 'named watcher count');

-- ---- freeze / delist (owner test_1 on b1; claimer test_7 has default slots) ----
select t_try('freeze','select set_artist_state(''00000000-0000-0000-0000-0000000000b1'',true,false)');
select is((select claims_frozen from artists where id='00000000-0000-0000-0000-0000000000b1'), true, 'frozen');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a7"}',true);
select t_try('claim_frozen','select claim_artist(''00000000-0000-0000-0000-0000000000b1'')');
select is((select msg from errs where label='claim_frozen'), 'artist_not_claimable', 'frozen blocks claim_artist');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select t_try('unfreeze','select set_artist_state(''00000000-0000-0000-0000-0000000000b1'',false,false)');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a7"}',true);
select t_try('claim_open','select claim_artist(''00000000-0000-0000-0000-0000000000b1'')');
select is((select msg from errs where label='claim_open'), 'ok', 'unfreeze reopens claiming');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select t_try('delist','select set_artist_state(''00000000-0000-0000-0000-0000000000b1'',false,true)');
reset role;
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b1'), 'delisted', 'delisted');
select is((select count(*)::int from claims where artist_id='00000000-0000-0000-0000-0000000000b1'), 5, 'delist keeps every claim row');
set local role anon;
select is((select count(*)::int from artists where id='00000000-0000-0000-0000-0000000000b1'), 0, 'delisted artist hidden from public read');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select t_try('undelist','select set_artist_state(''00000000-0000-0000-0000-0000000000b1'',false,false)');
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b1'), 'live', 'undo-delist restores live when verified');
-- undo-delist on an artist with no verified_at leaves status alone (owner row exists, verified_at cleared)
reset role;
update artists set verified_at=null, status='delisted' where id='00000000-0000-0000-0000-0000000000b6';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select t_try('undelist_unv','select set_artist_state(''00000000-0000-0000-0000-0000000000b6'',false,false)');
reset role;
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b6'), 'delisted', 'undo-delist without verified_at leaves status');
set local role authenticated;

-- ---- reports ----
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a7"}',true);
select t_try('rep_unv','select report_artist(''00000000-0000-0000-0000-0000000000b4'','' not this artist '')');
select is((select msg from errs where label='rep_unv'), 'ok', 'report accepted');
reset role;
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b4'), 'disputed', 'unverified page -> disputed');
select is((select reason from artist_reports where artist_id='00000000-0000-0000-0000-0000000000b4'), 'not this artist', 'reason trimmed');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a6"}',true);
select t_try('claim_disputed','select claim_artist(''00000000-0000-0000-0000-0000000000b4'')');
select is((select msg from errs where label='claim_disputed'), 'artist_not_claimable', 'disputed page cannot be claimed');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a7"}',true);
select t_try('rep_pending','select report_artist(''00000000-0000-0000-0000-0000000000b5'',''spam'')');
reset role;
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b5'), 'pending', 'report on a pending page leaves status alone (0031)');
select is((select count(*)::int from artist_reports where artist_id='00000000-0000-0000-0000-0000000000b5'), 1, 'report on a pending page is stored for review');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a7"}',true);
select t_try('rep_ver','select report_artist(''00000000-0000-0000-0000-0000000000b3'',''hmm'')');
reset role;
select is((select status from artists where id='00000000-0000-0000-0000-0000000000b3'), 'live', 'verified page status unchanged');
select is((select count(*)::int from artist_reports where artist_id='00000000-0000-0000-0000-0000000000b3'), 1, 'report on verified page still stored');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a7"}',true);
select t_try('rep_again','select report_artist(''00000000-0000-0000-0000-0000000000b3'',''second thought'')');
reset role;
select is((select count(*)::int from artist_reports where artist_id='00000000-0000-0000-0000-0000000000b3'), 1, 'repeat report keeps one row');
select is((select reason from artist_reports where artist_id='00000000-0000-0000-0000-0000000000b3'), 'second thought', 'repeat report updates reason');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a8"}',true); -- a7 has used 4 of 5 daily reports
select t_try('rep_empty','select report_artist(''00000000-0000-0000-0000-0000000000b3'',''   '')');
select t_try('rep_long', format('select report_artist(''00000000-0000-0000-0000-0000000000b3'',%L)', repeat('x',501)));
select is((select count(*)::int from errs where label in ('rep_empty','rep_long') and msg='invalid_reason'), 2, 'blank and 501-char reasons rejected');

-- ---- tables closed to anon/authenticated ----
select is((select count(*)::int from artist_owners), 0, 'authenticated sees 0 artist_owners rows');
select is((select count(*)::int from artist_reports), 0, 'authenticated sees 0 artist_reports rows');
set local role anon;
select is((select count(*)::int from artist_owners), 0, 'anon sees 0 artist_owners rows');
select is((select count(*)::int from artist_reports), 0, 'anon sees 0 artist_reports rows');
reset role;
select ok((select count(*) from artist_owners) > 0 and (select count(*) from artist_reports) > 0, 'rows exist for the superuser');

select * from finish();
rollback;
