#!/usr/bin/env bash
# Concurrency checks for claim_artist. Run separately from `supabase test db`.
# Scenarios: (1) 20 scouts, one artist; (2) one scout at 4/5 slots, 3 artists at once;
# (3) one scout, 5 simultaneous claims on the same artist. Self-cleaning, unique ids per run.
set -uo pipefail
DB="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
RUN=$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
TMP=$(mktemp -d)
FAILS=0
q() { psql "$DB" -v ON_ERROR_STOP=1 -qAt "$@"; }
uid() { uuidgen | tr 'A-Z' 'a-z'; }
check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "PASS $1 (got $3)"; else echo "FAIL $1 (expected $2, got $3)"; FAILS=$((FAILS+1)); fi
}
cleanup() {
  q -c "delete from claims where user_id in (select id from profiles where handle like 'cc_${RUN}_%');
        delete from artists where slug like 'cc-${RUN}-%';
        delete from profiles where handle like 'cc_${RUN}_%';
        delete from auth.users where email like 'cc_${RUN}_%@example.test';" >/dev/null
  rm -rf "$TMP"
}
trap cleanup EXIT

new_artist() { local a; a=$(uid); q -c "insert into artists(id,name,slug,status) values ('$a','CC $RUN','cc-$RUN-$a','live');" >/dev/null; echo "$a"; }
new_user() { local u; u=$(uid); q -c "insert into auth.users(id,email) values ('$u','cc_${RUN}_$u@example.test');
  insert into profiles(id,handle) values ('$u','cc_${RUN}_${u:0:8}');" >/dev/null; echo "$u"; }
fire() { # user artist outfile ; runs in background
  ( q -c "select set_config('request.jwt.claims','{\"sub\":\"$1\"}',false);" -c "select claim_artist('$2');" >/dev/null 2>"$3" || true ) &
}
errs() { cat "$TMP"/$1.* 2>/dev/null | grep -c "$2" || true; }

# 1: 20 distinct scouts, one artist
A=$(new_artist); i=0
for n in $(seq 1 20); do u=$(new_user); fire "$u" "$A" "$TMP/s1.$n"; done
wait
check "1 distinct claim numbers = claims" "20|20" "$(q -c "select count(distinct claim_number)||'|'||count(*) from claims where artist_id='$A';")"

# 2: one scout at 4/5 slots, claims 3 different artists at once
S=$(new_user)
for n in 1 2 3 4; do B=$(new_artist); q -c "select set_config('request.jwt.claims','{\"sub\":\"$S\"}',false);" -c "select claim_artist('$B');" >/dev/null; done
for n in 1 2 3; do B=$(new_artist); fire "$S" "$B" "$TMP/s2.$n"; done
wait
check "2 active claims never exceed slots" 5 "$(q -c "select count(*) from claims where user_id='$S' and status='active';")"
check "2 roster_full errors" 2 "$(errs s2 roster_full)"

# 3: one scout, 5 simultaneous claims on one artist
S=$(new_user); A=$(new_artist)
for n in 1 2 3 4 5; do fire "$S" "$A" "$TMP/s3.$n"; done
wait
check "3 active claims on artist" 1 "$(q -c "select count(*) from claims where user_id='$S' and artist_id='$A' and status='active';")"
check "3 already_claimed errors" 4 "$(errs s3 already_claimed)"
check "3 next_claim_number advanced by 1" 2 "$(q -c "select next_claim_number from artists where id='$A';")"

[ "$FAILS" -eq 0 ] && echo "ALL PASS" || { echo "FAILURES: $FAILS"; exit 1; }
