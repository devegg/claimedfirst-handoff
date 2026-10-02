#!/usr/bin/env bash
# Concurrency check for the watchlist cap. Run separately from `supabase test db`.
# One scout with 99 watches fires 5 concurrent watch_artist calls on 5 different live artists;
# the result must be exactly 100 rows, 4 watchlist_full errors. Self-cleaning, unique ids per run.
set -uo pipefail
DB="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
RUN=$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
TMP=$(mktemp -d)
FAILS=0
q() { psql "$DB" -v ON_ERROR_STOP=1 -qAt "$@"; }
check() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $3)"; else echo "FAIL $1 (expected $2, got $3)"; FAILS=$((FAILS+1)); fi; }
cleanup() {
  q -c "delete from watchlist where user_id in (select id from profiles where handle like 'wc_${RUN}_%');
        delete from artists where slug like 'wc-${RUN}-%';
        delete from profiles where handle like 'wc_${RUN}_%';
        delete from auth.users where email like 'wc_${RUN}_%@example.test';" >/dev/null
  rm -rf "$TMP"
}
trap cleanup EXIT

U=$(uuidgen | tr 'A-Z' 'a-z')
q -c "insert into auth.users(id,email) values ('$U','wc_${RUN}_u@example.test');
      insert into profiles(id,handle) values ('$U','wc_${RUN}_u');
      insert into artists(name,slug,status)
        select 'WC '||g, 'wc-${RUN}-'||g, 'live' from generate_series(1,104) g;
      insert into watchlist(user_id,artist_id)
        select '$U', id from artists where slug like 'wc-${RUN}-%' order by slug limit 99;" >/dev/null
check "setup: 99 watches" 99 "$(q -c "select count(*) from watchlist where user_id='$U';")"

n=0
for A in $(q -c "select id from artists where slug like 'wc-${RUN}-%' and id not in (select artist_id from watchlist where user_id='$U') limit 5;"); do
  n=$((n+1))
  ( q -c "select set_config('request.jwt.claims','{\"sub\":\"$U\"}',false);" -c "select watch_artist('$A');" >/dev/null 2>"$TMP/e.$n" || true ) &
done
wait
check "5 free artists fired" 5 "$n"
check "rows never exceed the limit" 100 "$(q -c "select count(*) from watchlist where user_id='$U';")"
check "watchlist_full errors" 4 "$(cat "$TMP"/e.* 2>/dev/null | grep -c watchlist_full || true)"

# 2: backstop. 5 concurrent DIRECT inserts (superuser, bypassing watch_artist) for a scout at 99 rows
U=$(uuidgen | tr 'A-Z' 'a-z')
q -c "insert into auth.users(id,email) values ('$U','wc_${RUN}_d@example.test');
      insert into profiles(id,handle) values ('$U','wc_${RUN}_d');
      insert into watchlist(user_id,artist_id)
        select '$U', id from artists where slug like 'wc-${RUN}-%' order by slug limit 99;" >/dev/null
check "2 setup: 99 watches" 99 "$(q -c "select count(*) from watchlist where user_id='$U';")"
n=0
for A in $(q -c "select id from artists where slug like 'wc-${RUN}-%' and id not in (select artist_id from watchlist where user_id='$U') limit 5;"); do
  n=$((n+1))
  ( q -c "insert into watchlist(user_id,artist_id) values ('$U','$A');" >/dev/null 2>"$TMP/d.$n" || true ) &
done
wait
check "2 direct inserts fired" 5 "$n"
check "2 rows never exceed the limit" 100 "$(q -c "select count(*) from watchlist where user_id='$U';")"
check "2 watchlist_full errors" 4 "$(cat "$TMP"/d.* 2>/dev/null | grep -c watchlist_full || true)"

[ "$FAILS" -eq 0 ] && echo "ALL PASS" || { echo "FAILURES: $FAILS"; exit 1; }
