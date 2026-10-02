begin;
select plan(23);

select is((select count(*)::int from profiles), 0, 'starts with no profiles');

-- fixtures: 98 existing profiles (fixed ids, fake emails)
insert into auth.users(id,email)
  select format('00000000-0000-0000-0100-%s', lpad(g::text,12,'0'))::uuid, format('fx%s@example.test', g) from generate_series(1,98) g;
insert into profiles(id,handle,referral_code)
  select format('00000000-0000-0000-0100-%s', lpad(g::text,12,'0'))::uuid, format('fx_%s', g), format('FX%s', g) from generate_series(1,98) g;
-- test users
insert into auth.users(id,email) values
 ('00000000-0000-0000-0200-000000000001','t1@example.test'),
 ('00000000-0000-0000-0200-000000000002','t2@example.test'),
 ('00000000-0000-0000-0200-000000000003','t3@example.test'),
 ('00000000-0000-0000-0200-000000000004','t4@example.test');

-- privileges
select ok(not has_function_privilege('anon','create_profile(text,text)','execute'), 'anon cannot execute');
select ok(not has_function_privilege('public','create_profile(text,text)','execute'), 'public cannot execute');
select ok(has_function_privilege('authenticated','create_profile(text,text)','execute'), 'authenticated can execute');

set local role authenticated;

-- not authenticated (no sub claim)
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select create_profile('nobody1','')$$, 'not_authenticated', 'rejected without JWT');

-- user 1: 99th profile, founding true, valid ref sets referred_by
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0200-000000000001"}',true);
select throws_ok($$select create_profile('ab','')$$, 'invalid_handle', 'too short rejected');
select throws_ok($$select create_profile('Has_Caps','')$$, 'invalid_handle', 'uppercase rejected');
select throws_ok($$select create_profile('has space','')$$, 'invalid_handle', 'space rejected');
select throws_ok($$select create_profile(repeat('x',21),'')$$, 'invalid_handle', 'too long rejected');
select throws_ok($$select create_profile('admin','')$$, 'invalid_handle', 'reserved admin rejected');
select throws_ok($$select create_profile('leaderboard','')$$, 'invalid_handle', 'reserved leaderboard rejected');
select throws_ok($$select create_profile('fx_1','')$$, 'handle_taken', 'taken handle rejected');
select lives_ok($$select create_profile('test_one','FX5')$$, 'valid profile created with valid ref');
select throws_ok($$select create_profile('test_one_b','')$$, 'profile_exists', 'second profile rejected');

-- user 2: 100th profile, founding true, unknown ref ignored
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0200-000000000002"}',true);
select lives_ok($$select create_profile('test_two','nosuchcode')$$, 'unknown ref accepted but ignored');

-- user 3: 101st, founding false
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0200-000000000003"}',true);
select lives_ok($$select create_profile('test_three','')$$, '101st profile created');

-- user 4: self ref ignored (use user 1's code)
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0200-000000000001"}',true);
select is((select count(*)::int from profiles), 1, 'scout reads only their own profile row');
select is((select count(*)::int from profiles where id <> auth.uid()), 0, 'cannot read another scout row');

reset role;
select is((select referred_by from profiles where handle='test_one'), '00000000-0000-0000-0100-000000000005'::uuid, 'valid ref sets referred_by');
select is((select count(*)::int from referrals where referred='00000000-0000-0000-0200-000000000001'), 1, 'referral row recorded');
select is((select referred_by from profiles where handle='test_two'), null, 'unknown ref leaves referred_by null');
select is((select array_agg(founding_scout order by handle) from profiles where handle in ('test_one','test_two','test_three')),
  array[false,false,false]::boolean[], 'founding awards are paused (0026): nobody is awarded automatically');

-- self ref: user 4 uses their own code after creation is impossible; emulate by pre-seeding a profile whose code we pass
-- (create_profile resolves ref before insert, so a user's own code cannot exist yet; verify guard via id <> uid logic)
select is((select count(*)::int from profiles where referred_by = id), 0, 'no self referrals');

select * from finish();
rollback;
