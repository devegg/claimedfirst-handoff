# ClaimedFirst: handoff

Status date: 2026-10-02. Author of the idea: Brian Boyd. This page is the front door for a developer who might take the project over. It is written to be read in ten minutes.

## In one paragraph

ClaimedFirst records the order in which people back an AI music artist, and gives each backer a lasting claim number ("I was #7"). It is recognition only: no prizes, no cash. The audience is AI music creators, who are mostly each other's fans. A working version exists and is live, but **nobody outside Brian and the AI reviewers has seen it yet, so there is no evidence either way about whether people want it**. Brian is not going to run it. He is offering the idea, the design work and the working but unfinished code to a developer who wants to adapt it to their own view and build it.

## What exists

- **A working web app**, live at https://www.claimedfirst.com (kept out of search engines; link only). Next.js 16, React 19, TypeScript, Supabase (Postgres, row-level security, magic-link sign-in), Vercel, Vitest and pgTAP. About 470 app tests and a full database test suite. Source: the private repository `devegg/claimedfirst-app`.
- **A written design and the reasoning behind it**: this repository (`devegg/claimedfirst`), including the binding spec (`docs/spec-v1-design.md`), later decisions (`docs/design-show-dont-hide.md` in the app repo), and a build ledger recording every ruling and review (`docs/build-ledger.md` in the app repo).
- **A look**: a dark record-shop design (Fraunces and DM Sans, one coral accent), brand artwork, a marketing page and mockups.
- **Honest critiques**: a ChatGPT product review, a long UX review of the live site, and a list of known ways to cheat the rules (`docs/trial-safety.md`). They are included so you do not have to rediscover them.

## What the product does today

- Sign in by emailed link. Pick a handle.
- **Artist pages** keyed to a public profile link (Suno, YouTube or a website). A page is labelled "fan-created, not verified" until the artist proves control by putting a one-time code in their own public bio.
- **Claim an artist**: a server-assigned, sequential, permanent number. A claim is locked for 3 days; after that it can be dropped and stays as a Historical claim with its number. Re-claiming the same artist waits 30 days and gets a new number.
- A **roster** of limited slots (5 to start; friends who join and make a claim open more, up to 50).
- A **watchlist**, **privacy choices** per claim (show my name, artist only, anonymous) and per watch.
- **Boards**: an artist's Founders list (first 100 claims, newest claims shown greyed until 14 days), a scout's Historical 100, and a monthly points leaderboard with a "total" and an "at risk" column.
- **Artist tools**: verify, up to ten Top Songs, a donation link, a record style, freeze or remove a page, and a private audience list that respects each scout's choice.
- Discover with search and filters, a Guide, share cards for claims, reports and a dispute window, rate limits, and a safe server-side check of the verification code on a public profile.

## What is not built

Email delivery for strangers (only the owner can sign in without setting up an email service), account deletion (designed in `design-account-deletion.md`, not built), a creator home screen, Google and Apple sign-in, an admin screen (a SQL runbook stands in), page merging, final Terms and Privacy text (drafts only, for a lawyer), and any ring or fraud detection.

## What was learned

1. The first outside reviews agree on one thing: the **number and the artist page are the valuable parts**. The game around them (points, leagues, referral-earned slots, locks) is the part most likely to be too much.
2. In a community where everyone is both fan and artist, the real value is probably **peers noticing each other**, not a fan scoring game.
3. Several rules hid things from users and confused them; those were rebuilt to show their state instead. More of that work remains.
4. A recommended first test: about 30 consenting creators, and count how many come back on another day and back a different artist. This has not been run: no one but Brian has used the site.
5. Open product contradictions to settle: whether trial numbers are wiped or permanent; whether selling extra slots is compatible with "nobody can pay to rank."

## What a new owner decides

Everything. The structure, the rules, the name and the look are all open. Brian's own preferences, for context only: he likes limited slots and the leaderboard because creators want to be noticed; he wants anonymous options kept; he is wary of the scoring complexity and would not use it as a promotion tool for his own music.

## Not included, on purpose

Any list of real artists, and any keys or passwords. The live demo site shows a single example page, the author's own (Heart Echoes). An earlier list of about a hundred real artist pages was removed and is not in this repository. The repositories contain no secrets. A new owner starts with a clean database.

## Terms of the handoff

- **Brian is not seeking anything.** No payment, no ownership of your version, no role. Recognition would be nice and is not required.
- Licence for code and documents: MIT (see the LICENSE file in the public repository).
- The domain claimedfirst.com is included if the new owner wants it. The name "ClaimedFirst" is yours to keep or change.
- No affiliation with Suno, YouTube or any other service is claimed or implied.

## Taking it over

Read in this order: this page; `docs/vision.md`; `docs/spec-v1-design.md`; the app repo's `docs/design-show-dont-hide.md`, `docs/trial-safety.md` and `docs/build-ledger.md`; then run it with `docs/local-development.md` (Docker Desktop and the Supabase CLI) and deploy it with `docs/deploy.md`.

Two practical notes: after `npm install`, run `npx next typegen` (or `npx next build`) once so `tsc` knows the generated route types; and the database tests (`npx supabase test db`) need Docker running.
