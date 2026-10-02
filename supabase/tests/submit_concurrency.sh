#!/usr/bin/env bash
# Concurrency checks for submit_artist. Run separately from `supabase test db`.
# (a) 2nd and 3rd distinct scouts submit the same new key at once -> live.
# (b) 6 distinct scouts submit the same brand-new key at once -> one artist, one link, live.
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
  q -c "delete from artists where id in (select artist_id from artist_links where canonical_key like 'web:sc-${RUN}-%');
        delete from profiles where handle like 'sc_${RUN}_%';
        delete from auth.users where email like 'sc_${RUN}_%@example.test';" >/dev/null
  rm -rf "$TMP"
}
trap cleanup EXIT
new_user() { local u; u=$(uid); q -c "insert into auth.users(id,email) values ('$u','sc_${RUN}_$u@example.test');
  insert into profiles(id,handle) values ('$u','sc_${RUN}_${u:0:8}');" >/dev/null; echo "$u"; }
fire() { # user key outfile
  ( q -c "select submit_artist('$1','Test SC $RUN','web','$2','https://$2.example');" >/dev/null 2>"$3" || true ) &
}
status_of() { q -c "select status from artists where id in (select artist_id from artist_links where canonical_key='$1');"; }

# (a) repeated so the interleaving has several chances to occur
for r in 1 2 3 4 5; do
  K="web:sc-$RUN-a$r"
  U1=$(new_user); U2=$(new_user); U3=$(new_user)
  q -c "select submit_artist('$U1','Test SC $RUN','web','$K','https://$K.example');" >/dev/null
  fire "$U2" "$K" "$TMP/a$r.2"; fire "$U3" "$K" "$TMP/a$r.3"
  wait
  check "a$r 2nd+3rd concurrent -> live" live "$(status_of "$K")"
done

# (b)
K="web:sc-$RUN-b"
for n in 1 2 3 4 5 6; do u=$(new_user); fire "$u" "$K" "$TMP/b.$n"; done
wait
check "b one artist row" 1 "$(q -c "select count(distinct artist_id) from artist_links where canonical_key='$K';")"
check "b one link row" 1 "$(q -c "select count(*) from artist_links where canonical_key='$K';")"
check "b status live" live "$(status_of "$K")"
check "b six submissions" 6 "$(q -c "select count(*) from artist_submissions where artist_id in (select artist_id from artist_links where canonical_key='$K');")"
check "b no orphan artists" 0 "$(q -c "select count(*) from artists where name='Test SC $RUN' and id not in (select artist_id from artist_links);")"
check "b no errors" 0 "$(cat "$TMP"/b.* "$TMP"/a*.* 2>/dev/null | grep -c ERROR || true)"

[ "$FAILS" -eq 0 ] && echo "ALL PASS" || { echo "FAILURES: $FAILS"; exit 1; }
