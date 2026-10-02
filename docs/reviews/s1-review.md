# Review: safety-s1 (S1 trial safety pass)

Diff: `git diff main...safety-s1` (5d26be0, 8fa536c, 19d0e93, 5ad5936, 98c611a, 47880cb). Read-only review; no files changed apart from this one.

## Verdict: APPROVED (no blockers; follow-ups below, 2 worth doing before the trial)

## 1. Security of migrations 0030 to 0033

- search_path: every security definer function in 0030 to 0033 (submit_artist, artist_slug_status, search_live_artists, report_artist, verify_artist_with_code, public_claim) sets `search_path = public, pg_temp`. OK.
- Grants: submit_artist stays service_role only (same 6-arg signature as 0028, so there is no stale overload). report_artist stays authenticated only. verify_artist_with_code is service_role only, and pgTAP checks anon, authenticated and public. public_claim is dropped and recreated with the same arguments and the same anon/authenticated grant, so the old overload is gone. artist_slug_status and search_live_artists are byte-identical to 0028 apart from a comment, so redefining them is harmless noise.
- Verification bypass: mark_artist_verified (0022) is still EXECUTE to service_role only, so only server code can call it. Nothing new is exposed, but the new code path has no DB-level guarantee that expiry was checked. Any future service-role caller of mark_artist_verified skips the 24h and single-use rules (see finding 6).
- Concurrency: verify_artist_with_code locks the artist row first (`for update`), so two concurrent verifies of the same artist serialize. The second one sees the `found` row and gets code_used. Single use is checked across all artists (`where code = p_code`), which is stricter than needed and fine. The issued-code lookup is keyed by (artist, user, code), so a code cannot be reused across users or artists (tested). Expiry uses `min(checked_at)`, the issue row, so later failed attempts do not extend it. The boundary is consistent: SQL `<= now() - 24h` and TS `>= TTL` both expire at exactly 24h.
- Rate limit (E): `rate_limit_hit('report:'||uid, 5, '24 hours')` is a fixed window aligned to the UTC epoch day (floor(epoch/86400)), not a rolling 24 hours. A refused call raises, which rolls back the increment (tested). It is per account, so several accounts multiply it. That matches the spec ("per-account limit"), and new accounts cannot start disputes anyway. Using several artists does not dodge it because the key has no artist. Re-reporting the same artist also counts.
- Pending reports (B): on a non-live page the report only inserts or updates artist_reports. There is no status, disputed_at or claims change, and the reports table is not exposed. It cannot hide, delist or reveal anything. Live-page behaviour is unchanged: a 7-day-old account on a live, unverified page still starts a dispute (report_rules test r2). One side effect remains: report_artist still accepts any artist uuid, so `artist_not_found` against `ok` reveals whether a uuid exists. Uuids are not guessable, and this was already true before.
- public_claim (F): it adds status and claimed_at. There is still no user id, and the handle is masked unless visibility = 'public', so anonymous and artist-only claims stay masked. claimed_at is returned as a full timestamp to anon (finding 2).
- Name check: the SQL enforces the structural rules (symbols only, URL, email, phone, 8+ repeats) inside submit_artist. The word list is TS-only. submit_artist is service_role only and its only caller is the server action, which runs checkArtistName first, so the list cannot be skipped from a client. A future service-role caller (seed, admin script) would skip it. That is acceptable and documented in the migration comment.

## 2. Correctness

- Name check: Assassin, Cocktail Hour, Scunthorpe, Bjork, emoji-with-letters, A$AP Rocky, P!nk, Blink 182 and Maroon 5 all pass, and the tests cover them. Pure-emoji names are refused, but that already happened before through invalid_name / `[[:alnum:]]`. Messages never echo the word.
- RosterSlots draws `min(50, max(0, unlocked))` cells, keeps markers at indexes 4, 9, 19, 29 and 49 (5, 10, 20, 30, 50) with no explanation, and the locked state and CSS are removed. OK.
- ShareCard: the date is now `Claimed Oct 1, 2026`, in inline styles only, with no new CSS features. The roster passes `YYYY-MM-DD`, which parses as UTC. OK.

## 3. Tests

The disputes and artist_tools pgTAP changes (a pending report is now record-only and stays pending) are intended. trial-safety.md section 4 item 1 asks for "a report path for pending pages", and 0031's header gives the reason (a few new accounts could hide a page). The live-page dispute behaviour is unchanged and still covered. New pgTAP files report_rules and verification_codes are meaningful. Gaps: there is no concurrent-verify test (only sequential reuse), no pgTAP test for name_not_allowed through submit_artist was checked beyond name_check.test.sql, and there is no test of the TS 200-row read limit (finding 7).

## 4. Copy

No exclamation marks, no thresholds or slot maximum stated. "5 reports in a day" is a rate limit, not a ladder threshold, so it is acceptable. Terms line: "cannot be sold, traded or transferred" uses "traded", which is on the banned list. The existing Terms paragraph already says "bought, sold or traded" in a negating legal sense (finding 5).

## 5. Upgrade order (migrations first, then code)

What the old main code calls, against the new database:
- `mark_artist_verified`: unchanged and still service_role. The old code keeps verifying, but it ignores expiry and single use until the new code deploys. This is a short, acceptable window.
- `verification_attempts` direct insert and select: the table is unchanged. OK.
- `submit_artist`: same signature. It can now raise `name_not_allowed`, which old code shows as its generic error. OK.
- `report_artist`: same signature. The limit drops from 10 per hour to 5 per UTC day, and the error renames from `rate_limited` to `report_limit_reached`. Old code shows a generic message. A pending report now does not dispute the page. OK.
- `public_claim`: drop and recreate with 2 extra output columns, which old code ignores. OK. The drop and create run in the migration transaction, so callers do not see a gap.
Order is safe.

## Findings

1. **Medium**. src/lib/name-check.ts:22-40. Spacing and punctuation evasion: `words()` splits on every non-letter, so "N I G G E R", "n.i.g.g.e.r" and "k-y-s" become single letters and pass. Plurals and suffixes also pass ("faggots", "niggaz") because matching is whole-word. Suggestion: also test the name with all non-letters removed (letters only, after folding) against the single-word entries of at least 5 characters, and allow an optional trailing s or z.
2. **Low/Medium (privacy)**. supabase/migrations/0033_public_claim_status.sql:9. public_claim returns `claimed_at` to the second for anonymous claims as well. The page only shows the day, but the full timestamp is readable from the RPC, which helps match an "Anonymous scout" with a public post made at the same minute. Return `claimed_at::date` (or `date_trunc('day', ...)`) instead.
3. **Low**. supabase/migrations/0031_report_rules.sql:14. The "24 hours" window is a UTC calendar day (fixed window), so up to 10 reports can land around midnight UTC. This is documented in s1-report. Say "a day" consistently. The copy already does.
4. **Low (spec gap)**. src/components/ShareCard.tsx:54. The card shows the date but not Active or Historical. trial-safety.md asks for both. Cards are only offered on active claims (roster page), so the label would always read Active, and the /c page shows the live status. Either add "Active" to the card, or note in trial-safety.md that the /c link carries the status.
5. **Low (copy)**. src/app/terms/page.tsx:16. "traded" is on the banned word list. Suggest "cannot be sold, swapped or transferred". The same word already appears in the Terms on main (line 19), so fix both or record a Terms exception.
6. **Low**. supabase/migrations/0032_verification_code_rules.sql. mark_artist_verified is still callable by service_role directly, so expiry is enforced only if callers use verify_artist_with_code. Consider a later migration that makes it internal (revoke from service_role, since the definer function already runs as owner) once old code is gone.
7. **Low**. src/lib/verify-artist.ts:17-19. currentCodeState reads at most 200 rows. With more than 200 failed attempts on one code, the issue time computed in TS comes out too late, so the app keeps showing an expired code. The SQL still refuses it, but the UI loops on code_expired without making a new code. This is unlikely given the rate limits. A min(checked_at) query would fix it.
8. **Info**. supabase/migrations/0030_name_check.sql:74-102 redefines artist_slug_status and search_live_artists unchanged. This is harmless and can be dropped from the file.
9. **Info**. SQL URL rule false positives: names such as "Mr.Me" or "Dot.Com" are refused, and so are numbers like "Area 51 1984 2001" (7+ digits). This is acceptable for the trial.
