# Local development

## Prerequisites

- Node and npm (see `package.json`).
- Docker Desktop, running. The local Supabase stack runs in containers.

## First run

1. `npm install`
2. `npx supabase start` (first start downloads images and takes a few minutes).
3. Create `.env.local` from the local stack's values:
   - `npx supabase status -o env` prints them.
   - Copy the API URL into `NEXT_PUBLIC_SUPABASE_URL`, the publishable key (or the legacy anon key) into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the secret key (or the legacy service role key) into `SUPABASE_SECRET_KEY`.
   - Add `CRON_SECRET` (any local value) and `NEXT_PUBLIC_OAUTH_ENABLED=false`.
   - `.env.local` is ignored by git. Never commit it.
4. `npm run dev`, then open http://localhost:3000.

## Database

- Reset to the migrations: `npx supabase db reset`. Wait about 8 seconds afterward before running the database tests.
- Database tests (pgTAP): `npx supabase test db`. The demo seed breaks some tests, so reset first and re-seed after.
- Demo data: `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/dev-seed.sql`
- Concurrency checks: `bash supabase/tests/submit_concurrency.sh` (also `concurrency.sh`, `watchlist_concurrency.sh`, `artist_tools_concurrency.sh`).

## Sign-in emails

Magic links are caught locally by Mailpit at http://127.0.0.1:54324. Request a link on `/login`, open Mailpit and click it.

## Tests and checks

- `npm test` runs the Vitest suite.
- `npm run lint` runs ESLint.
- `npx tsc --noEmit` type-checks.

## Test accounts

Use names like `Test 1` and handles like `test_1` so test data is easy to spot and remove.

## Stopping

`npx supabase stop` stops the stack.
