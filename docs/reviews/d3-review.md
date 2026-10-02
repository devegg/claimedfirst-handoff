# D3 review (131aa82, design-v1)

Verdict: CHANGES NEEDED (1 blocking)

## Findings
1. BLOCKING - src/app/globals.css:240 `.friend-view { padding: 32px 0; }` overrides `main`'s `padding: 28px 20px 56px` (line 56), zeroing the side gutter. On /c/test-artist-1/7 at 375px the h1 spans x=0..375 and the text touches both screen edges (measured: main padding-left 0px). Fix: `padding-block: 32px` (or `padding: 32px 20px`).
2. minor - src/components/ShareAction.tsx:57 `className="secondary"` on the "Share" button matches no rule (only `.btn.secondary` / `a.btn.secondary` exist, globals.css:104). Harmless (falls back to the default button) but the class is dead; use `btn secondary` or add `button.secondary`.
3. minor - Share studio shows no visible card preview; the card is only rendered offscreen (`.share-offscreen`). The spec asks for a studio "as in the mockups" (story 9:16 / square 1:1). In the roster row the studio box also wraps awkwardly between the Privacy and Drop buttons at narrow widths. Consider a scaled preview and full-width studio row.
4. minor - Claim success is only a restyled "You are Claim #N." with no share call to action next to it (implementer flagged). No copy change was allowed, so acceptable, but the "moment" from the mockups is thin.
5. minor - Dead CSS added: `.main-narrow-page` (globals.css:194) and `.share-feature` (:239) are not used anywhere.
6. minor - src/app/submit/page.tsx:352 adds a new "Scout" eyebrow: new visible copy (not guide/terms/privacy, so allowed, but note it).
7. minor - Desktop artist page is a single 680px column (implementer flagged); acceptable per `main.narrow`, but the mockup's wider layout is not attempted.
8. note (not D3) - /artist/[slug]/manage VerifyPanel shows "Something went wrong on our side. Try again." for test-artist-1 and -2 locally. VerifyPanel diff is className-only, so this is environment/backend (verification start), not a D3 regression. Worth a separate check.
9. note (not D3) - Seeded users (supabase/dev-seed.sql) cannot sign in by magic link: GoTrue fails with `duplicate key ... users_email_partial_key` because the seed inserts auth.users rows without instance_id/aud, so GoTrue does not find them and tries to create them. Also site_url is 127.0.0.1:3000 and localhost is not in additional_redirect_urls, so links from a localhost session redirect to 127.0.0.1 (PKCE cookie mismatch). Worked around by signing up a fresh local test user (d3review@example.test) and replaying the code on localhost/auth/callback.

## Spec compliance
- All D3 surfaces restyled: artist page (verified/unverified badge, disputed/frozen `.state-note`, stats line, Claim and Watch, Founders board, Top Songs, donation as `btn secondary`), VisibilitySheet and Modal (`.modal`), claim success, ShareCard/ShareAction, /c, /scout (Founding Scout badge, Historical 100), /submit, manage (all editors as `.manage-section`). Pending state is unchanged route logic ("Not live yet").
- No changes to logic, SQL, RLS, server actions, supabase/, or test files (diff stat). Labels, roles, aria attributes and test ids preserved; guide/terms/privacy text untouched.
- Slot markers unchanged and unexplained (roster not touched).
- Tests: vitest 42 files / 302 tests pass, tsc clean (re-run by reviewer). No test weakened.
- Record artwork polish not attempted (optional).

## Code quality and accessibility
- Inline styles removed everywhere cheap; remaining only in Record and ShareCard (needed for html-to-image). Good.
- Focus: global `:focus-visible` accent outline applies; modal focus lands on the selected radio on open (verified); Escape/trap logic untouched.
- Contrast: badge #f6b5a2 on #3c2925, --dim/--muted meta text on --panel all pass AA. `.state-note` carries meaning in text, not color.
- Reduced motion: no new animations.
- `.modal` has max-height 90vh + overflow, good on small screens.

## Share card / html-to-image
- Verified in a real browser: stubbed navigator.share to capture the File, Make card produced a 1080x1920 PNG (~800 KB). Fraunces (number, artist name) and DM Sans (brand, "I CLAIMED", footer) both embedded correctly; radial-gradient background, groove rings and label disc rendered. No backdrop-filter or unsupported CSS in the card. Square ratio not exported (same code path).

## Visual (browser)
- Signed in as a fresh local test user (seed users cannot sign in, see #9). Claimed Test Artist 1 as #7.
- Checked at 375px and 1280px: artist page, claim sheet with privacy choices, claim success, roster with share studio, share card PNG, manage (non-owner VerifyPanel view only; seed has no owner, so TopSongs/Donation/Audience/PageControls/RecordStyle judged from code), settings, /c, /scout, /submit. No horizontal scroll (scrollWidth 375) on any page; only defect is #1.
- Viewport reset to desktop.
