# Deploying ClaimedFirst

A checklist for the owner. Nothing here has been done yet: no hosted project, domain or secret exists. Work top to bottom. Never paste a secret into the repository or into chat.

## 1. Hosted Supabase project

1. Create a project at supabase.com. Pick a region near your users and save the database password in a password manager.
2. In the project, open Settings, then API. Note the project URL, the Publishable key (`sb_publishable_...`) and the Secret key (`sb_secret_...`), both under API Keys. The secret key bypasses all row-level security: it goes only in Vercel environment variables, never in the browser or the repo.
3. From the repo, on your machine:
   - `npx supabase login`
   - `npx supabase link --project-ref <your project ref>`
   - `npx supabase db push` (applies every migration in `supabase/migrations`, including `0021_rate_limits.sql`)
4. Do not run the demo seed (`supabase/dev-seed.sql`) against the hosted project.

## 2. Environment variables

Set these in Vercel (Project Settings, Environment Variables) for Production. Values come from where noted.

| Name | Where the value comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Settings, API: project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Settings, API Keys: Publishable key |
| `SUPABASE_SECRET_KEY` | Supabase Settings, API Keys: Secret key (server only). The legacy names `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` still work as fallbacks |
| `CRON_SECRET` | You generate a long random string (for example `openssl rand -hex 32`). Vercel sends it as a Bearer token to the cron route |
| `NEXT_PUBLIC_SITE_URL` | The public address, for example `https://claimedfirst.com` (used for share links and previews) |
| `NEXT_PUBLIC_OAUTH_ENABLED` | `true` only after Google or Apple sign-in is set up in step 5, otherwise `false` or unset |

These are the only variables the code reads. `.env.example` lists them with empty values.

## 3. Vercel project

1. In Vercel, add a new project from the GitHub repository and keep the Next.js defaults.
2. Add the variables from step 2, then deploy.
3. The nightly cron is already declared in `vercel.json` (`/api/cron/score` at 04:00 UTC). It refreshes season scores, recomputes roster slots and purges old rate-limit rows. Confirm it appears under Settings, Cron Jobs. Check Vercel's current plan limits for cron jobs.

## 4. Domain

Add `claimedfirst.com` under the Vercel project's Domains, then set the DNS records Vercel shows at your registrar. Set `NEXT_PUBLIC_SITE_URL` to the final address and redeploy.

## 5. Supabase Auth

Under Authentication:

- URL Configuration: Site URL is `https://claimedfirst.com`. Add `https://claimedfirst.com/auth/callback` (and your Vercel preview address, if you want previews to sign in) to Redirect URLs.
- Email: the built-in sender is only for testing and is heavily limited. Set up custom SMTP (Authentication, SMTP Settings) with a provider such as Resend: verify your domain there, create a sending credential, and enter the host, port, user and password in the Supabase form. Magic links will not reach real users without this.
- Optional Google or Apple: enable the provider, paste its client ID and secret, add the callback URL Supabase shows to the provider's console, then set `NEXT_PUBLIC_OAUTH_ENABLED=true`.

## 6. Smoke test after deploying

Use two throwaway accounts named Test 1 and Test 2 (handles `test_1`, `test_2`).

1. Sign up as Test 1 from the live site and finish onboarding.
2. Submit an artist, then submit it again as Test 2 and a third account until it goes live (it needs 3 distinct submitters).
3. Claim the artist and see a claim number on the roster.
4. Drop the claim and check it shows as a historical claim with the same number.
5. Cron without the secret: `curl -i https://claimedfirst.com/api/cron/score` should return 401.
6. Cron with the secret: `curl -i -H "Authorization: Bearer $CRON_SECRET" https://claimedfirst.com/api/cron/score` should return 200 with `{"ok":true}`.
7. Delete the test accounts and test artists from the Supabase dashboard afterward.

## 7. Costs

Supabase, Vercel, Resend and the domain registrar each have free tiers or entry plans that may cover a small launch. Limits and prices change, so check each provider's pricing page yourself before launch. Things that grow with use: database size, monthly active users, emails sent and function invocations.

## 8. Backups

Check what your Supabase plan includes for automatic backups and point-in-time recovery. Before any risky change, take a manual dump: `npx supabase db dump -f backup.sql` (keep it out of the repo, it contains user emails). Test a restore once.

## 9. Launch safety checklist

- [ ] LLC formed and an EIN obtained; terms and privacy owned by that entity.
- [ ] A lawyer has reviewed `/terms` and `/privacy`; the "Draft" notices are removed only after that.
- [ ] Rate limits are live (migration 0021 applied; the verify route and submit action return the "too quickly" messages when exceeded).
- [ ] No prizes, payouts or paid placements anywhere in the product or in messages to users.
- [ ] Custom SMTP is working and a real magic link arrived.
- [ ] The cron route answers 401 without the secret.
- [ ] 20 to 50 creators are seeded so a first visitor does not land on an empty site.
- [ ] A way to reach you for removal requests is monitored.

## Known limits

- Lock order: claiming locks the scout's profile and then the artist. Submit, report and verify lock the artist and then touch a profile through a foreign key. A scout who claims and submits or reports the same artist at the very same instant can rarely hit a deadlock. Postgres resolves it by aborting one transaction, and the scout can simply retry.
- The verify check resolves a page address and then fetches it, so a DNS rebinding attack has a small residual window. Only public https pages are fetched, with size and time limits.
- Reports and disputes: a report on an unverified page pauses new claims for 72 hours, and only reports from accounts at least 3 days old start a dispute. The page stays readable meanwhile, if it was live. The nightly cron restores it afterward unless the artist verified it. Younger accounts' reports are stored only.
- Season catch-up: if the nightly cron misses the 1st of a month, run the previous month's score refresh by hand (call `refresh_season_scores` with that month's start from the Supabase SQL editor).
- Claim links (`/c/<artist>/<number>`) are public by design, so someone can enumerate numbers for a page. They show only what the claim's owner made public, and the pages are marked noindex.
- Artist links can have alias duplicates: two different addresses for the same artist may create two pages until they are merged by hand.
