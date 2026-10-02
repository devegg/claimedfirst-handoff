#!/usr/bin/env bash
# Concurrency checks for the artist tools (migration 0017). Run separately from `supabase test db`.
# (a) 5 concurrent set_top_songs calls by the owner with different lists -> exactly one coherent list.
# (b) a concurrent report_artist and the verify route's owner upsert + status update -> verified wins, status live.
# Self-cleaning, unique ids per run.
set -uo pipefail
DB="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
RUN=$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
TMP=$(mktemp -d)
FAILS=0
q() { psql "$DB" -v ON_ERROR_STOP=1 -qAt "$@"; }
uid() { uuidgen | tr 'A-Z' 'a-z'; }
check() {
  if [ "$2" = "$3" ]; then echo "PASS $1 (got $3)"; else echo "FAIL $1 (expected $2, got $3)"; FAILS=$((FAILS+1)); fi
}
cleanup() {
  q -c "delete from artists where slug like 'test-at-${RUN}-%';
        delete from profiles where handle like 'at_${RUN}_%';
        delete from auth.users where email like 'at_${RUN}_%@example.test';" >/dev/null
  rm -rf "$TMP"
}
trap cleanup EXIT
new_user() { local u; u=$(uid); q -c "insert into auth.users(id,email) values ('$u','at_${RUN}_$u@example.test');
  insert into profiles(id,handle,created_at) values ('$u','at_${RUN}_${u:0:8}', now() - interval '8 days');" >/dev/null; echo "$u"; }
new_artist() { # slug status -> id
  q -c "insert into artists(name,slug,status) values ('Test AT $RUN','$1','$2') returning id;" | head -1; }

# (a) songs
for r in 1 2 3; do
  OWN=$(new_user); A=$(new_artist "test-at-$RUN-s$r" live)
  q -c "insert into artist_owners(artist_id,owner_id) values ('$A','$OWN');" >/dev/null
  for n in 1 2 3 4 5; do
    LIST=$(q -c "select jsonb_agg(jsonb_build_object('title','L${n}-'||g,'url','https://m.example/L${n}/'||g))::text from generate_series(1,$((n+2))) g;")
    ( q -c "select set_config('request.jwt.claims','{\"sub\":\"$OWN\"}',false); select set_top_songs('$A','$LIST'::jsonb);" >/dev/null 2>"$TMP/s$r.$n" || true ) &
  done
  wait
  CNT=$(q -c "select count(*) from top_songs where artist_id='$A';")
  check "a$r contiguous positions 1..n" "$CNT" "$(q -c "select count(*) from top_songs where artist_id='$A' and position between 1 and $CNT;")"
  check "a$r max position = count" "$CNT" "$(q -c "select max(position) from top_songs where artist_id='$A';")"
  check "a$r all rows from one list" 1 "$(q -c "select count(distinct split_part(title,'-',1)) from top_songs where artist_id='$A';")"
  check "a$r count matches that list" "$(q -c "select max(split_part(title,'-',1)) from top_songs where artist_id='$A';" | sed 's/L//' | awk '{print $1+2}')" "$CNT"
  check "a$r in order" "$CNT" "$(q -c "select count(*) from top_songs where artist_id='$A' and title = split_part(title,'-',1)||'-'||position;")"
done

# (b) report vs verify-style owner upsert
for r in 1 2 3 4 5; do
  OWN=$(new_user); REP=$(new_user); A=$(new_artist "test-at-$RUN-v$r" live)
  ( q -c "select set_config('request.jwt.claims','{\"sub\":\"$REP\"}',false); select report_artist('$A','Test report');" >/dev/null 2>"$TMP/v$r.rep" || true ) &
  ( q -c "insert into artist_owners(artist_id,owner_id) values ('$A','$OWN') on conflict (artist_id) do update set owner_id=excluded.owner_id, verified_at=now();
          update artists set verified_at=now(), status='live' where id='$A';" >/dev/null 2>"$TMP/v$r.ver" || true ) &
  wait
  check "b$r owner stored" "$OWN" "$(q -c "select owner_id from artist_owners where artist_id='$A';")"
  check "b$r verified page is live" live "$(q -c "select status from artists where id='$A';")"
  check "b$r report stored" 1 "$(q -c "select count(*) from artist_reports where artist_id='$A';")"
done
# (c) two verifiers + a report at once -> verified_at set, exactly one owner (one of the two), status live, no partial rows
for r in 1 2 3 4 5; do
  U1=$(new_user); U2=$(new_user); REP=$(new_user); A=$(new_artist "test-at-$RUN-m$r" live)
  ( q -c "select mark_artist_verified('$A','$U1');" >/dev/null 2>"$TMP/m$r.1" || true ) &
  ( q -c "select mark_artist_verified('$A','$U2');" >/dev/null 2>"$TMP/m$r.2" || true ) &
  ( q -c "select set_config('request.jwt.claims','{\"sub\":\"$REP\"}',false); select report_artist('$A','Test report');" >/dev/null 2>"$TMP/m$r.3" || true ) &
  wait
  check "c$r verified_at set" t "$(q -c "select verified_at is not null from artists where id='$A';")"
  check "c$r exactly one owner" 1 "$(q -c "select count(*) from artist_owners where artist_id='$A';")"
  check "c$r owner is one of the verifiers" t "$(q -c "select owner_id in ('$U1','$U2') from artist_owners where artist_id='$A';")"
  check "c$r status live" live "$(q -c "select status from artists where id='$A';")"
  check "c$r report stored" 1 "$(q -c "select count(*) from artist_reports where artist_id='$A';")"
done
check "no errors" 0 "$(cat "$TMP"/* 2>/dev/null | grep -c ERROR || true)"

[ "$FAILS" -eq 0 ] && echo "ALL PASS" || { echo "FAILURES: $FAILS"; exit 1; }
