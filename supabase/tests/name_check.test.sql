begin;
select plan(14);
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','t1@example.test');
insert into profiles(id,handle) values ('00000000-0000-0000-0000-0000000000a1','test_1');

create table errs(label text, msg text);
create function t_name(p_label text, p_name text, p_n int) returns void language plpgsql as $$
begin
  perform submit_artist('00000000-0000-0000-0000-0000000000a1', p_name, 'web', 'web:nc' || p_n || '.example', 'https://nc' || p_n || '.example', 'nc' || p_n);
  insert into errs values (p_label, 'ok');
exception when others then insert into errs values (p_label, sqlerrm); end $$;

select t_name('url',    'Visit www.example.com', 1);
select t_name('url2',   'shop.example.io', 2);
select t_name('email',  'me@example.com', 3);
select t_name('phone',  'Call 555 123 4567', 4);
select t_name('repeat', 'Aaaaaaaaaa', 5);
select t_name('symbols','!!!', 6);
select t_name('ok1',    'Assassin', 7);
select t_name('ok2',    'Cocktail Hour', 8);
select t_name('ok3',    'Björk ♥', 9);
select t_name('ok4',    'Blink 182', 10);

select is((select msg from errs where label='url'), 'name_not_allowed', 'a link in the name is refused');
select is((select msg from errs where label='url2'), 'name_not_allowed', 'a bare domain in the name is refused');
select is((select msg from errs where label='email'), 'name_not_allowed', 'an email in the name is refused');
select is((select msg from errs where label='phone'), 'name_not_allowed', 'a phone number in the name is refused');
select is((select msg from errs where label='repeat'), 'name_not_allowed', '8 repeated characters are refused');
select is((select msg from errs where label='symbols'), 'invalid_name', 'a symbols-only name is still invalid_name');
select is((select msg from errs where label in ('ok1') ), 'ok', 'Assassin passes');
select is((select msg from errs where label='ok2'), 'ok', 'Cocktail Hour passes');
select is((select msg from errs where label='ok3'), 'ok', 'a name with accents and a symbol passes');
select is((select msg from errs where label='ok4'), 'ok', 'a short number in a name passes');
select is((select count(*)::int from artists where name in ('Assassin','Cocktail Hour','Björk ♥','Blink 182')), 4, 'the four good names were stored');
select is((select count(*)::int from artists where name ~ 'example|@|!!!|Aaaa'), 0, 'refused names were not stored');
select ok(not has_function_privilege('anon','submit_artist(uuid,text,text,text,text,text)','execute'), 'anon still cannot call submit_artist');
select ok(has_function_privilege('service_role','submit_artist(uuid,text,text,text,text,text)','execute'), 'service_role can call submit_artist');
select * from finish();
rollback;
