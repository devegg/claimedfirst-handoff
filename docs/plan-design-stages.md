# ClaimedFirst design pass: stages 1 to 3

Source of the look: `mockups/chatgpt/ClaimedFirst.html` (ChatGPT's mockup, the chosen base) and `mockups/pages/index.html` (ours; use its sheets, share card and privacy-sheet layouts where better). Mockups use fictional data. Spec: `docs/spec-v1-design.md`.

## Global constraints (all tasks)

1. Restyle and restructure markup only. Do NOT change business rules, SQL, RLS, server actions, or the text of guide/terms/privacy copy (the guide guard test enforces wording). Do not weaken or delete tests; update a test only when markup changed on purpose, and keep its intent.
2. Design tokens (from the ChatGPT mockup): `--bg:#121613; --panel:#1b211c; --panel2:#252d26; --line:#3e4a40; --text:#f3efe5; --muted:#bac4b8; --dim:#93a092; --accent:#e48c72; --accentdark:#3c2925`. Fonts via `next/font/google`: Fraunces (display, headings and brand) and DM Sans (body). Remove Geist. Dark theme only.
3. Plain CSS in `src/app/globals.css` plus small CSS modules or classes; no new UI libraries, no Tailwind. Mobile first; no horizontal scroll at 390px; visible focus (`:focus-visible` accent outline); respect `prefers-reduced-motion`; real buttons and links; contrast at least AA; no information by color alone.
4. Slot markers on the roster stay unexplained (no labels or tooltips). Never use stock-market or finance imagery. Placeholder artwork only (the existing `Record` component draws it).
5. `npx tsc --noEmit`, `npx eslint .` (if configured) and `npx vitest run` must pass before each commit. Commit per logical step. Each task ends with a short note appended to `docs/build-ledger.md`.
6. Work on branch `design-v1`. Do not push to main. Pushing the branch is fine.

## Task D1: look, shell and navigation

- Replace the root layout nav with a real site header: brand "Claimed" + accent "First" linking to `/`; links Discover (`/discover`), Submit (`/submit`), Roster (`/roster`), Leaderboard (`/leaderboard`), Guide (`/guide`); a Sign in link when signed out, or the viewer's handle/settings link when signed in. On narrow screens collapse to a compact bar with a bottom or menu nav that works without JavaScript where possible. Footer: Terms, Privacy, Guide, plus a one-line independence note ("Independent. No affiliation with Suno, YouTube or any other service.").
2. Global base styles in `globals.css`: tokens, typography scale, links, buttons (primary accent, secondary outline, plain), form fields, cards/panels, tables/lists, badges, focus, reduced motion, container width (max 1180px) with a `main` wrapper class.
3. Restyle: home (`/`, with a hero in the mockup's spirit and signed-in/out states; link to Discover and Submit), `/login`, `/onboarding`, `/roster` (keep the 50-cell grid and unexplained markers; style slots, active/historical/watch lists, pagination controls), `/guide`, `/terms`, `/privacy`, `/leaderboard`, `/settings`. Keep all existing text and test hooks.
4. Create `/discover` as a stub linking nowhere new yet: a styled page saying artists to find will be listed here, with a Submit link. (Task D2 fills it in.)
5. Verify by running the dev server or `next build` and checking pages render; run all checks.

## Task D2: Discover page

- `/discover`: lists live artists (name, record artwork via `Record`, "Claimed by N" count, "Be #N" = next claim number, Verified or "Fan-created page" label), newest first and a "most claimed" sort via a query param, paged with the existing `pageWindow`/`PageControls` (10 per page). Also shows pending artists needing scouts ("2 of 3 scouts submitted") in a separate section. Empty state: a friendly message and a Submit link.
- Data comes from the same readable sources the artist page already uses (check RLS in `supabase/migrations`; if a public read is missing, add a safe view or RPC in a NEW migration, with pgTAP tests, exposing only public columns; never expose scouts or watchers). Anonymous visitors must see the page.
- Link each card to `/artist/[slug]`. Add tests (rendering, empty state, paging, sort).
- The home page's featured list may reuse a small version of the same component (top 3 by newest).

## Task D3: artist, claim, share and manage pages

- Restyle `/artist/[slug]` (states: unverified label, verified badge, pending, disputed, frozen; stats; Claim and Watch; Founders board with 14-day greyed rows; Top Songs; donation link), the claim and watch privacy sheets (`VisibilitySheet`, `Modal`), the claim success moment and share card studio (`ShareCard`, `ShareAction`; story 9:16 and square 1:1 as in the mockups), `/c/[artistSlug]/[number]` (friend's view: "Maya was #7 on Ember Vale. Be #8." style), `/scout/[handle]` (Historical 100, badges), `/submit`, and `/artist/[slug]/manage` (VerifyPanel, TopSongsEditor, DonationEditor, AudiencePanel, freeze, remove).
- Keep every existing label, role and test id; update snapshots only for intended markup changes.
- Add the record-groove artwork polish to `Record` only if it keeps `Record.test.tsx` passing.
