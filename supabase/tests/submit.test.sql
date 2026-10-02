begin;
select plan(65);
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','t1@example.test'),
 ('00000000-0000-0000-0000-0000000000a2','t2@example.test'),
 ('00000000-0000-0000-0000-0000000000a3','t3@example.test');
insert into profiles(id,handle) values
 ('00000000-0000-0000-0000-0000000000a1','test_1'),
 ('00000000-0000-0000-0000-0000000000a2','test_2'),
 ('00000000-0000-0000-0000-0000000000a3','test_3');

select is((submit_artist('00000000-0000-0000-0000-0000000000a1','Test Band','suno','suno:@testband','https://suno.com/@testband')).status,'pending','pending after 1st');
select is((submit_artist('00000000-0000-0000-0000-0000000000a1','Test Band','suno','suno:@testband','https://suno.com/@testband')).status,'pending','same user twice stays pending');
select is((select count(*)::int from artist_submissions),1,'same user twice counts once');
select is((submit_artist('00000000-0000-0000-0000-0000000000a2','Test Band','suno','suno:@testband','https://suno.com/@testband')).status,'pending','pending after 2nd');
select is((submit_artist('00000000-0000-0000-0000-0000000000a3','Test Band','suno','suno:@testband','https://suno.com/@testband')).status,'live','live after 3rd distinct');
select is((select count(*)::int from artists),1,'one artist row for one key');
select is((select count(*)::int from artist_links where canonical_key='suno:@testband'),1,'one link row');
select is((select slug from artists),'testband','slug comes from the handle, not the name');

-- disputed / delisted never revive
select submit_artist('00000000-0000-0000-0000-0000000000a1','Bad One','web','web:bad.example','https://bad.example');
update artists set status='disputed' where name='Bad One';
select submit_artist('00000000-0000-0000-0000-0000000000a2','Bad One','web','web:bad.example','https://bad.example');
select is((submit_artist('00000000-0000-0000-0000-0000000000a3','Bad One','web','web:bad.example','https://bad.example')).status,'disputed','disputed stays disputed');
select submit_artist('00000000-0000-0000-0000-0000000000a1','Gone One','web','web:gone.example','https://gone.example');
update artists set status='delisted' where name='Gone One';
select submit_artist('00000000-0000-0000-0000-0000000000a2','Gone One','web','web:gone.example','https://gone.example');
select is((submit_artist('00000000-0000-0000-0000-0000000000a3','Gone One','web','web:gone.example','https://gone.example')).status,'delisted','delisted stays delisted');

-- invalid names
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a1','','web','web:n1.example','https://n1.example')$$,'P0001','invalid_name','empty name');
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a1','   ','web','web:n2.example','https://n2.example')$$,'P0001','invalid_name','whitespace name');
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a1','!!! ---','web','web:n3.example','https://n3.example')$$,'P0001','invalid_name','symbols only');
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a1',repeat('a',81),'web','web:n4.example','https://n4.example')$$,'P0001','invalid_name','81 chars');
select throws_ok($$select submit_artist(null,'Null Id','web','web:n5.example','https://n5.example')$$,'P0001','not_authenticated','null user');
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000ff','Ghost','web','web:n6.example','https://n6.example')$$,'P0001','not_authenticated','unknown user');
select is((select count(*)::int from artists where name in ('Ghost','Null Id')),0,'no artist created on rejection');
select is((submit_artist('00000000-0000-0000-0000-0000000000a1','  Trim Me  ','web','web:trim.example','https://trim.example')).name,'Trim Me','name trimmed');

-- slugs come from the handle, never from the name
select is((select slug from artists where name='Trim Me'),'trim-example','web key: host and path become the slug');
select is((submit_artist('00000000-0000-0000-0000-0000000000a2','Anything At All','suno','suno:@emberv','https://suno.com/@emberv')).slug,'emberv','suno handle');
select is((submit_artist('00000000-0000-0000-0000-0000000000a2','Y One','youtube','youtube:@yt_handle-1','https://youtube.com/@yt_handle-1')).slug,'yt_handle-1','youtube handle');
select is((submit_artist('00000000-0000-0000-0000-0000000000a2','Y Two','youtube','youtube:channel/UCabcDEF123456789ghiJKLm','https://youtube.com/channel/UCabcDEF123456789ghiJKLm')).slug,
  'ucabcdef123456789ghijklm','channel id key: no channel- prefix, lowercased');
select is((submit_artist('00000000-0000-0000-0000-0000000000a2','Long','suno','suno:@'||repeat('a',40),'https://suno.com/@'||repeat('a',40))).slug,repeat('a',30),'derived slug is capped at 30');
select is((submit_artist('00000000-0000-0000-0000-0000000000a2','Dotted','suno','suno:@a.b','https://suno.com/@a.b')).slug,'a-b','invalid characters become -');
select is((submit_artist('00000000-0000-0000-0000-0000000000a2','日本','suno','suno:@nihon_band','https://suno.com/@nihon_band')).slug,'nihon_band','unicode name is irrelevant to the slug');

-- explicit slug
select is((submit_artist('00000000-0000-0000-0000-0000000000a3','Explicit','web','web:ex1.example','https://ex1.example','My-Band_2')).slug,'my-band_2','explicit slug is lowercased and used');
select is((submit_artist('00000000-0000-0000-0000-0000000000a3','Blank','web','web:ex2.example','https://ex2.example','  ')).slug,'ex2-example','blank explicit slug derives');

-- collisions never rename: a different artist holding the slug fails
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a3','Other EmberV','youtube','youtube:@emberv','https://youtube.com/@emberv')$$,'P0001','slug_taken','same handle on another platform: slug_taken');
select is((select count(*)::int from artists where name='Other EmberV'),0,'slug_taken leaves no artist row');
select is((select count(*)::int from artist_links where canonical_key='youtube:@emberv'),0,'slug_taken leaves no link row');
select is((submit_artist('00000000-0000-0000-0000-0000000000a3','Other EmberV','youtube','youtube:@emberv','https://youtube.com/@emberv','emberv-yt')).slug,'emberv-yt','user picks another slug and it works');
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a3','Taken','web','web:tk.example','https://tk.example','EMBERV')$$,'P0001','slug_taken','explicit slug taken (case-insensitive)');
-- a pending/delisted page still holds its slug
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a3','Taken 2','web','web:tk2.example','https://tk2.example','gone-example')$$,'P0001','slug_taken','non-live holders still block') ;

-- same key resubmitted: just adds a submitter, slug and name unchanged, p_slug ignored
select is((submit_artist('00000000-0000-0000-0000-0000000000a3','Rename Attempt','suno','suno:@emberv','https://suno.com/@emberv','different')).slug,'emberv','existing key keeps its slug');
select is((select name from artists where slug='emberv'),'Anything At All','existing key keeps its name');
select is((select count(*)::int from artist_submissions where artist_id=(select id from artists where slug='emberv')),2,'resubmit adds a submitter');

-- invalid slugs
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a3','V','web','web:v1.example','https://v1.example','a')$$,'P0001','invalid_slug','1 char');
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a3','V','web','web:v2.example','https://v2.example',repeat('a',31))$$,'P0001','invalid_slug','31 chars');
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a3','V','web','web:v3.example','https://v3.example','-bad')$$,'P0001','invalid_slug','leading dash');
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a3','V','web','web:v4.example','https://v4.example','_bad')$$,'P0001','invalid_slug','leading underscore');
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a3','V','web','web:v5.example','https://v5.example','has space')$$,'P0001','invalid_slug','space');
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a3','V','web','web:v6.example','https://v6.example','bäd')$$,'P0001','invalid_slug','non-ascii');
select throws_ok($$select submit_artist('00000000-0000-0000-0000-0000000000a3','V','suno','suno:@日本','https://suno.com/@x')$$,'P0001','invalid_slug','derived slug empty');

-- artist_slug_status
select ok(has_function_privilege('anon','artist_slug_status(text)','execute'),'anon can execute slug status');
select ok(has_function_privilege('authenticated','artist_slug_status(text)','execute'),'authenticated can execute slug status');
select ok(not has_function_privilege('public','artist_slug_status(text)','execute'),'public cannot execute slug status');
select ok((select coalesce(proconfig,'{}') @> array['search_path=public, pg_temp'] from pg_proc where proname='artist_slug_status' and pronamespace='public'::regnamespace),'slug status search_path pinned');
select is((select proargnames from pg_proc where proname='artist_slug_status' and pronamespace='public'::regnamespace),array['p_slug','taken','name','slug'],'slug status columns');
select results_eq($$select taken, name, slug from artist_slug_status('EmberV')$$,$$values (true,'Anything At All','emberv')$$,'taken pending page shows name and slug');
select results_eq($$select taken, name, slug from artist_slug_status('gone-example')$$,$$values (true,null::text,null::text)$$,'delisted holder: taken, nothing revealed');
select results_eq($$select taken, name, slug from artist_slug_status('free-slug')$$,$$values (false,null::text,null::text)$$,'free slug');

-- search_live_artists
update artists set status='live' where slug in ('emberv','yt_handle-1');
insert into artists(name,slug,status) values ('100% Pure','pure-one','live'),('Under_Score','under-score','live'),('Hidden Pending','hidden-pending','pending');
select ok(has_function_privilege('anon','search_live_artists(text)','execute'),'anon can execute search');
select ok(not has_function_privilege('public','search_live_artists(text)','execute'),'public cannot execute search');
select ok((select coalesce(proconfig,'{}') @> array['search_path=public, pg_temp'] from pg_proc where proname='search_live_artists' and pronamespace='public'::regnamespace),'search search_path pinned');
select is((select proargnames from pg_proc where proname='search_live_artists' and pronamespace='public'::regnamespace),array['p_q','name','slug'],'search columns: name and slug only');
select results_eq($$select slug from search_live_artists('RAYG')$$,$$values ('emberv')$$,'matches slug or name, case-insensitive');
select is((select count(*)::int from search_live_artists('hidden')),0,'pending artists are not searchable');
select is((select count(*)::int from search_live_artists('%')),1,'% is literal');
select is((select count(*)::int from search_live_artists('_')),2,'_ is literal (Under_Score and yt_handle-1)');
select is((select count(*)::int from search_live_artists('')),0,'empty term returns nothing');
insert into artists(name,slug,status) select 'Many '||g,'many-'||g,'live' from generate_series(1,8) g;
select is((select count(*)::int from search_live_artists('many')),5,'at most 5');

select hasnt_function('submit_artist',array['uuid','text','text','text','text'],'old 5-arg submit_artist is gone');
select ok(not has_function_privilege('authenticated','submit_artist(uuid,text,text,text,text,text)','execute'),'authenticated cannot execute');
select ok(not has_function_privilege('anon','submit_artist(uuid,text,text,text,text,text)','execute'),'anon cannot execute');
select ok(has_function_privilege('service_role','submit_artist(uuid,text,text,text,text,text)','execute'),'service_role can execute');
select * from finish();
rollback;
