# B2 review (commits 4043526, 5d8a027, f08dcac, ad93977 on show-dont-hide)

Verdict: CHANGES NEEDED (2 major, rest minor). Vitest 469 passed and tsc clean when I ran them. Database design is sound; the problems are in the screens.

## Findings

1. MAJOR. InfoTip (`<details>`) is placed inside `<p>`. React reports a hydration error and regenerates the tree on the client for /artist/[slug] (Founders board), /scout/[handle] and /leaderboard (when the "Growth points start" or "Your standing" notice shows). The browser closes the `<p>` at `<details>`, so server HTML and client tree differ. I saw the Next dev overlay "5 Issues" and the console errors "In HTML, <details> cannot be a descendant of <p>" on all three pages. Places: src/components/FoundersBoard.tsx:28, src/app/scout/[handle]/page.tsx:65, src/app/leaderboard/page.tsx:103 and :108, src/components/ReportButton.tsx:57 (also invalid there; client-only so no hydration failure). Fix: use `<div>` (or a `<span>`-only InfoTip variant) for those containers. Tests missed it because they use renderToStaticMarkup, which does not validate nesting; add a test that renders the page client-side and fails on console.error.

2. MAJOR. Leaderboard column header is broken (desktop and 375px). src/app/globals.css:423 `.board-head span:not(.grow)` also matches the spans inside each InfoTip, so the "i" glyph inherits `min-width:4.5ch; text-align:right` and drops out of its circle (empty ring with a detached italic "i" beside it). The opened tip text gets squeezed: the first tip measured 44px wide and 1093px tall. At 375px "Total points" wraps to three lines and the header columns do not line up with the numbers below (header ends about 245px, numbers at 291px). Fix: `.board-head > span:not(.grow)` and give the header cells the same width and alignment as `.num`; consider putting the tips in a line under the table rather than in the flex header.

3. MINOR. Two icons side by side ("?" HelpTip and "i" InfoTip) on every leaderboard header cell, the roster lock note and the provisional note. Visible icon is 18px with only a few px between them, and the InfoTip's 44px `::after` hit area (globals.css:406) overlaps the neighbouring HelpTip, so taps can land on the wrong one. Confusing as well: two "help" icons per label. Pick one per label (the InfoTip is the better one and the Guide link can sit inside its text).

4. MINOR (copy). Banned word "unlock" (STYLE file line 22). Visible occurrences in src, all in non-test code:
   - src/components/FriendsAndSlots.tsx:16 "You have unlocked every slot."
   - src/components/FriendsAndSlots.tsx:17 "Next unlock: N friends who joined and made a claim: M slots."
   - src/components/FriendsAndSlots.tsx:22 "Next unlock at N friends." and "You have unlocked every slot."
   - src/lib/guide.ts:20 "Your Roster shows when each one unlocks."
   - src/lib/claim-errors.ts:2 (older) "Drop a claim or unlock more slots first."
   Not user-visible: identifiers (`slots_unlocked`, `nextUnlockLine`, `formatUnlockDate`, `claimUnlockIso`, the `unlocked` prop) and code comments; also the test in src/app/page.test.tsx:38 lists "unlock" as banned and only scans the home page, which is why this slipped through. Suggested wording: roster line "Next step: 2 friends open 10 slots." (second line "A friend counts once they have joined, their account is 3 days old and they have made a claim."); top of ladder "You have all 50 slots."; lock: "Your Roster shows the date and time each one can be dropped."; roster_full: "Your Roster is full. Drop a claim or bring friends to open more slots." Note the STYLE file itself (line 67) says "unlock more slots"; fix that sentence to "open more slots" so the file does not contradict its own ban.

5. MINOR (roster copy and layout). The roster says the next step twice: "Next unlock at 2 friends." in the slots block and again as a longer line in the Friends and slots panel. Drop the short one. "Next unlock: 2 friends who joined and made a claim: 10 slots." has two colons and reads badly. Also a friend can show as "counted" while slots stay at 5 because slots are recomputed by the nightly cron (src/app/api/cron/score, recompute_all_slots in 0007); add "Slots update overnight." to the panel.

6. MINOR. The Guide "Roster" entry says the steps are "on this page under Slot ladder", but that entry is the second from last of 24 and has no link. Link it with `#referral-ladder` or move the entry up next to Slot.

7. MINOR. Provisional rows (`.row-provisional`, globals.css:424: colour `--dim` at opacity 0.8) measure about 4.4:1 against the panel, just under 4.5:1. Greyed is intended, but "counts in N days" is real information; keep the meta text at full opacity or darken the grey.

8. MINOR. Discover. (a) With "Needs scouts" selected, a pasted link search returns nothing because pending rows are filtered by `name.includes(term)`, where term is the link (src/app/discover/page.tsx, `needsOnly && searching`). (b) The "Needs scouts" view fetches 50 at most with no paging or sort nav. (c) Pending fan pages appear only under Needs scouts, not under Fan-created; fine if intended, say so on the pill view ("Pages waiting for scouts are under Needs scouts"). Pills are links, keep q and sort, reset page to 1, work without JS, and wrap to two rows at 375px (each 44px high); no horizontal scroll.

9. MINOR. Time formats differ: roster lock shows UTC ("5 October 2026, 07:40 UTC") while the verification expiry shows local time (VerifyPanel.tsx). Pick one or label both. The Drop button is only enabled after a reload once the lock passes (server render); acceptable since the server enforces, but the note can say "refresh".

10. LOW. Reports: no pre-check note for accounts under 3 days (acknowledged in the report as not done); the error plus InfoTip after sending is acceptable.

11. INFO. Pending page noindex: the whole site is noindex until launch (src/app/layout.tsx:19). When that is removed, pending and disputed pages (user-supplied name and source link) become indexable. Consider keeping `robots: noindex` for non-live status in `generateMetadata`.

12. INFO. Test data left in the local database: auth user test2-b2review@example.test, handle b2review_1, one claim on Test Artist 3 (claim #2, next claim number is now 3). Re-run the dev seed to reset.

## Spec check (items 1 to 10)

1. InfoTip: details/summary, text in static markup, `role="status"`, aria-label, native keyboard toggle, Escape closes and returns focus to the summary, outside click closes, no tabindex trap. Verified in the browser. Matches, except findings 1 to 3.
2. Pending, disputed, removed pages via public_artist_status: matches. Source link is `rel="nofollow ugc noopener" target="_blank"` with host shown as text and in "(opens host in a new tab)"; https only; claim button disabled with `aria-describedby` reason; "Add my support" goes to `/submit?name=&url=` and /submit accepts an https prefill only. Unknown slug keeps "Not live yet".
3. Discover pills (All, Verified, Fan-created, Needs scouts): matches, see finding 8.
4. Leaderboard Total points and At risk: present. Copy (AT_RISK_TIP and the how-points section) says "Dropping any claim this season removes its points, so these are the ones most likely to go", which does not claim at-risk points are the only ones lost. Header broken (finding 2).
5. Roster claim lock: "Locked until 5 October 2026, 07:40 UTC", Drop disabled with `aria-describedby`; server still enforces (migration 0035). Matches.
6. Founders board and scout history: provisional greyed with "counts in N days"; "dropped after N days"; masked rows still show "Anonymous scout" (rows pass through `boardRowState`). Matches (finding 7 on contrast).
7. Friends and slots panel: works (counted, pending with days left, invite link, ladder, count). Issues: findings 4 and 5.
8. Ladder public in the Guide: "2 friends open 10 slots, 5 friends open 20 slots, 10 friends open 30 slots and 20 friends open 50 slots, which is the most" matches `recompute_slots` in 0003 (2/5/10/20 to 10/20/30/50, max 50) and the 5 starting slots. Guide-guard: the ladder is allowed only as the single exact sentence (`LADDER_TEXT`); any other friend count or slot figure is still flagged and tests cover 15 slots, partial ladder and a changed number. Not weakened.
9. Report message: "Reports open when your account is 3 days old." mapped from `account_too_new` with InfoTip. Matches.
10. Verification expiry: "Expires <local date and time>" next to the code, flips to expired with "Get a new code". Matches.

Other numbers checked against the migrations: account age 3 days (0034 `interval '3 days'`, TS `ACCOUNT_MIN_AGE_DAYS = 3`), lock 72 hours (0035, TS `CLAIM_LOCK_HOURS = 72`), provisional and at-risk 14 days (0036, 0037), base point of 1 (0037). Guide and info-copy statements agree. "Growth points start when your account is 3 days old" correctly avoids saying the account cannot earn at all (B1 note).

## Security (migrations 0042, 0043)

- 0042 `my_referral_progress()`: security definer, `search_path = public, pg_temp`, uses `auth.uid()` only (returns no rows when null), revoked from public and anon, granted to authenticated; pgTAP checks anon cannot run it, a referred friend sees none of the referrer's data, and a stranger gets only the summary row. It returns only the caller's own referred friends: handle, join date (`created_at::date`), counted or pending, days left, and whether the friend has any claim. Nothing about any other user, artist or claim.
- Privacy recommendation on showing referred friends' handles to the referrer: acceptable. The handle is already public on /scout/[handle], the friend joined through the referrer's own link, and the referrer needs the list to understand the ladder (which friends still need a claim or more days). The join date and "no claim yet" add a small amount of information about the friend (they have made no claim) but not which artists or the anonymity choice; counted already implies at least one claim. Keep, and say in the privacy text that people who join with your link are shown to you by handle, with join date and status.
- 0043 `pending_artists_public`: dropped and recreated with `slug` appended. Same body otherwise, pinned search_path, revoked from public, granted to anon and authenticated; pgTAP asserts the exact column list ("no submitter ids"). The slug is already public (pending page by address via 0038), so nothing else leaks. Note the pending list already returns artist ids; unchanged.
- Pending page source link: the stored URL comes from a user, but submission canonicalises to supported platform hosts (src/lib/artist-url.ts), only `https://` is rendered, `nofollow ugc noopener`, host shown. `noreferrer` is not set; add it if you do not want the referrer sent to Suno or YouTube.

## Upgrade order

Migrations 0034 to 0043 before code is safe: 0042 and 0043 are additive (new function, appended column); new code tolerates a missing `my_referral_progress` or `public_artist_status` (error data becomes empty, roster shows no friends, page falls back to "Not live yet"). Old code against the new database: columns are only added, but old pages will list provisional claims unlabelled and still say "7 days" until the code ships, so push the code straight after the migrations. Brief window only.

## Tests

Mostly meaningful (guide-guard, boards, claim lock, pgTAP referral and pending tests). Gap: component tests use `renderToStaticMarkup` and string checks, so invalid nesting (finding 1) and CSS layout (finding 2) are not caught; also "InfoTip open/Escape" was verified in jsdom only. Add one test that hydrates the leaderboard notice and Founders board and fails on console errors.

## Visual check

Local dev server on :3000 (this repo), fresh local user signed up through /login and the mail catcher. Desktop and 375px for /discover, a pending page, /leaderboard, /roster (with a locked claim), /guide and /scout. No horizontal scroll on any page at 375px. Problems found: findings 1 to 3, 5 to 7. Viewport reset to desktop afterwards.
