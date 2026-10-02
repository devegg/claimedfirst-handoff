# UX fixes review (branch ux-fixes, 6cf6259 + cfcbf12)

Verdict: CHANGES NEEDED (no blockers; 1 accessibility fix and 2 small consistency or layout fixes recommended).

## Scope checks
- All 9 fixes present. Copy and CSS only; no logic, SQL or RLS changes (diff touches no migrations or lib code). Tests are meaningful (order checks, count of Discover note, guide number guard), except where noted in finding 1.
- Drop dialog (DropButton.tsx:33-36) matches code: drop_claim sets status historical and dropped_at (0002:39-47), active count drives slots, cooldown is 30 days from dropped_at (0002:21-22), reclaim gets next_claim_number. "Stops earning points" matches 0014 (dropped claims excluded from current season) and the existing leaderboard line "Only claims you currently hold earn points."
- Leaderboard definition (leaderboard/page.tsx:89): qualified = distinct scout, account at least 7 days old (0023, 0014); "different scout" is right because qualified_claimers_excluding drops your own rows. "A season is one month" matches refresh_season_scores (calendar month).
- /submit copy: accurate per ux-report (Suno, YouTube, any other site as "web"); Discover has the Needs scouts section with 3 Scouts.
- Copy rules: no exclamation marks, no banned or finance words, no slot ladder thresholds or maximum stated, markers unexplained. Roster line "Each active artist uses one slot." is fine.

## Findings
1. MEDIUM (accessibility, WCAG 2.5.3 Label in Name) - src/components/TopSongsEditor.tsx:52-54 and the matching link input. The visible labels "Song title" and "Song link" are overridden by aria-label "Song 1 title" / "Song 1 link", so the accessible name does not contain the visible text as a phrase. The test at ux-copy.test.tsx (getAllByLabelText("Song title")) passes because testing-library also matches the label element, so it hides the problem. Smallest fix: delete the aria-label on both inputs and make the label `Song title<span className="sr-only"> {n}</span>` (name becomes "Song title 1", contains the visible text; keep the Remove button's aria-label "Remove song n", which has a visible "Remove" at its start so it passes). Update the test to assert the accessible name via getByRole("textbox", { name: /Song title/ }).
2. LOW (consistency) - Nav now says "Add an artist" but the buttons still say "Submit an artist": src/app/page.tsx:17, src/app/discover/page.tsx:48 and :78, and the page h1 and form button on /submit ("Submit an Artist"). Align one way (suggest "Add an artist" everywhere, or at least the three buttons).
3. LOW (layout regression) - src/app/globals.css:279 `.list > li { padding-left/right: 12px }` applies to every `.list`. On the home page quick links (src/app/page.tsx:19) the links are now indented 12px and no longer align with the buttons above (seen at 375px). Roster lists (`.list.panel`, roster/page.tsx:118,148,162) and the leaderboard board (`.board > li`, nowrap) get an extra 12px inset inside an already padded panel; I could not render populated roster or board rows (see Limits), so check those. Safer scope: apply the padding only where the roster needs it, for example `.panel.list > li`, or only to the roster lists.
4. LOW (a11y, minor) - `.help-tip::after` (globals.css:278) enlarges the hit area to 44x44 but `.help-tip` itself stays small, so the focus ring is still the small circle, and the 44px areas of adjacent tips can overlap neighbouring links such as "Claim as #7" + tip. Acceptable; just confirm overlapping hit areas do not steal taps from the adjacent buttons.
5. INFO (pre-existing, not from this branch) - /roster renders the full 50-cell slot grid with five unexplained dots (seen in browser), which effectively shows the slot maximum the style guide says to keep secret. Not introduced here, but worth a separate decision since the new line "Each active artist uses one slot." sits right under it.
6. INFO - ClaimButton note (ClaimButton.tsx:52) is accurate. The claim dialog (existing) says "You keep your number, your points and your slot either way", which is about visibility; fine.

## Visual (browser, localhost:3000 dev; local Supabase running)
- Phone at 375x812: bottom nav links 48px tall, 12.8px font, "Add an artist" wraps to two lines and stays inside its 70px cell; no horizontal scroll (scrollWidth 375) on /submit, /leaderboard, /discover, home; footer bottom 738 vs nav top 755 (17px clear), no overlap when scrolled to the end. Leaderboard "How points work" panel reads well; all new lines wrap cleanly.
- Discover cards: "Fans can claim this page before the artist verifies it." shows only on the two Fan-created cards, not on the Verified one; wraps to two lines, not cramped.
- /submit: three short lines read clearly at 601px and 375px.
- Artist page: claim line sits under the Claim button, legible, no overlap.
- Roster page (signed in, 0 claims) renders the new slot line correctly.
- Dev-only note: the Next.js "N" badge overlaps the first nav item in dev; not a product issue.

## Limits (not verified visually)
- Could not complete a claim: the browser Supabase client reported "Sign in to claim" when the session was set through the localhost callback (cookie or origin mismatch with the 127.0.0.1 Supabase URL). I tried to insert a claim directly with SQL and the permission system denied it, so I did not pursue that. Not seen in the browser: the Drop dialog, the roster active-claim rows with padding, the Share panel, Top Songs editor (needs an owner login), and populated leaderboard rows. Those were checked from code and tests only.
- Desktop: the pane was 601px wide for the first checks; I reset the viewport to desktop at the end. Wide-desktop layout was not separately inspected.

Dev server was started by me (npm run dev) and stopped at the end. Local test user uxrev2@example.com remains in the local database.
