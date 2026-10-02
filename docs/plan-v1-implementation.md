# ClaimedFirst v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 web app where scouts claim AI music artists, get permanent claim numbers, share a card, unlock slots by referral, and compete on recognition-only boards.

**Architecture:** Next.js (App Router, TypeScript) on Vercel, Supabase Postgres/Auth/RLS. All game rules that must be atomic or tamper-proof (claim numbers, slots, cooldown, boards, scoring) live in Postgres functions and are tested with pgTAP. Pure helpers (URL canonicalization, bio-code verification, multiplier) are TypeScript with Vitest. Share cards render in the browser; no per-claim server images.

**Tech Stack:** Next.js 15, TypeScript, Supabase (CLI for local dev), pgTAP (`supabase test db`), Vitest, `html-to-image`, Resend. Work in a new repo `claimedfirst-app`, branch + PR per change, never direct to main.

**Spec:** `docs/spec-v1-design.md`

## Global Constraints

- Start slots: 5. Referral unlocks: 2 qualified referrals -> 10 slots, 5 -> 20, 10 -> 30, 20 -> 50. Slots never decrease once unlocked.
- Qualified referral: referred account at least 7 days old and has made at least 1 claim. Self-referrals and duplicate emails never count.
- Claim numbers: assigned by the server, sequential per artist, unique per artist, permanent.
- A dropped claim becomes `historical`, keeps its number and date. Re-add blocked for 30 days, then creates a new claim with a new, later number.
- Watchlist: up to 100 artists, no number, no slot (a larger one is a possible paid perk later, not in v1).
- Artist goes live when 3 independent accounts submitted it, or immediately when the artist verifies.
- Verification code format: `cf-` plus 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`.
- Multipliers by claim number: 1-10 = 5x, 11-50 = 3x, 51-200 = 2x, 201+ = 1x.
- Boards: artist Founders = 100 earliest claims (active and historical, labeled); scout Historical 100 = their 100 earliest claims. A claim appears on boards only after being held 14 days.
- Top Songs: up to 10 links (title plus https URL), verified artists only. Donation links are plain outbound URLs; the app never handles money.
- No copying of artwork, audio or bios from other sites; generated placeholder records only. No image uploads, no upload fields, no image storage in v1 (spec section 14). Verified artists can pick one of six record styles.
- Recognition only: no prizes, no payments in v1.
- Roster lists (Active claims, Historical claims, Watchlist) show 10 per page, each paged independently; a page past the end shows the last page.
- Season board: v1 is one league. Leagues split by slot count when the settings table says so (placeholder: at 1,000 scouts with a claim, boundary at 20 slots), are fixed at season start, and are shown by name, never by slot number. Points are stored per claim; v1 shows totals only.
- In-app guide: plain-English entries for every term; never spells out the friend counts or slot levels.
- Terms: Scout (fan), Artist (creator), Claim, Roster, Historical claim. Artist-side action is "Verify", never "claim".

## Review Focus

1. Two scouts claim the same artist at the same instant: both succeed with different numbers, never a duplicate (Task 3).
2. Drop then re-add at 29 days is refused; at 30 days it succeeds with a new, later number and the old historical claim remains (Task 3).
3. The same artist submitted as `https://www.Suno.com/@Name/?utm=x`, `http://suno.com/@name`, and `suno.com/@name/` resolves to one artist; a YouTube channel ID keeps its case (Task 4).
4. Verification against a page that is 403, times out, is huge, JS-only, points at localhost or a private IP, or is not https never grants the badge and never crashes or reaches internal hosts (Task 5).
5. A referred account under 7 days old, with no claim, a duplicate email, or the referrer themself never unlocks slots; unlocked slots never go down (Task 6).
6. Claiming a pending, disputed, delisted or frozen artist is refused (Task 3).
7. A roster page number past the last page (for example after dropping the only item on the last page, or a hand-edited URL like `?active=999` or `?watch=-3`) shows the last page, never an empty list or an error (Task 9).
8. A scout who unlocks more slots mid-season stays in their season-start league until the next season; leagues turning on mid-season do not reshuffle the current season (Task 11b).
9. The guide never states the friend counts or slot levels (Task 14b).

## File Structure

```
claimedfirst-app/
  supabase/migrations/0001_schema.sql        tables, indexes, RLS
  supabase/migrations/0002_claims.sql        claim_artist, drop_claim, recompute_slots
  supabase/migrations/0003_boards_scoring.sql  board views, scoring functions
  supabase/tests/claims.test.sql  slots.test.sql  boards.test.sql  scoring.test.sql
  src/lib/artist-url.ts          canonical artist key (+ .test.ts)
  src/lib/verify.ts              code generation, safe page check (+ .test.ts)
  src/lib/scoring.ts             multiplier, points (+ .test.ts)
  src/lib/pagination.ts          pageWindow for roster lists (+ .test.ts)
  src/lib/leagues.ts             leagueFor, leagueName (+ .test.ts)
  src/lib/guide.ts               guide entries (+ .test.ts)
  src/lib/share.ts               claim share text, OG metadata (+ .test.ts)
  src/app/                       pages and route handlers
  src/lib/record-styles.ts       six placeholder record styles, deterministic default (+ .test.ts)
  src/components/                ShareCard, RosterSlots, ArtistHeader, Record
```

---

### Task 1: Project scaffold and local database

**Files:**
- Create: repo `claimedfirst-app` via `create-next-app`, `vitest.config.ts`, `supabase/config.toml`

**Interfaces:**
- Produces: `npm test` (Vitest), `supabase test db` (pgTAP), local Postgres on `supabase start`.

- [ ] **Step 1: Scaffold**

```bash
npx create-next-app@latest claimedfirst-app --ts --app --eslint --src-dir --no-tailwind --import-alias "@/*"
cd claimedfirst-app && npm i @supabase/supabase-js @supabase/ssr html-to-image && npm i -D vitest
npx supabase init
```

- [ ] **Step 2: Add test script and a smoke test**

`package.json` scripts: `"test": "vitest run"`. Create `src/lib/smoke.test.ts`:

```ts
import { expect, test } from "vitest";
test("runs", () => expect(1 + 1).toBe(2));
```

- [ ] **Step 3: Run**

Run: `npm test` Expected: 1 passed. Run: `npx supabase start` Expected: local API and DB URLs printed.

- [ ] **Step 4: Delete the smoke test and commit**

```bash
git rm -f src/lib/smoke.test.ts 2>/dev/null || rm src/lib/smoke.test.ts
git add -A && git commit -m "chore: scaffold Next.js, Vitest, Supabase"
```

---

### Task 2: Schema and access rules

**Files:**
- Create: `supabase/migrations/0001_schema.sql`, `supabase/tests/schema.test.sql`

**Interfaces:**
- Produces tables: `profiles(id, handle unique, referral_code unique, referred_by, slots_unlocked default 5, founding_scout, default_claim_visibility default 'public', default_watch_named default false, created_at)`, `artists(id, name, slug unique, status, verified_at, claims_frozen, next_claim_number default 1, donation_url, created_at)`, `artist_links(id, artist_id, platform, canonical_key unique, url, is_primary)`, `artist_submissions(artist_id, user_id, primary key(artist_id,user_id))`, `claims(id, artist_id, user_id, claim_number, claimed_at, dropped_at, status, base_qualified int, visibility text default 'public' check in ('public','artist','anonymous'))`, `watchlist(user_id, artist_id, named_to_artist bool default false, created_at)`, `referrals(referrer, referred unique)`, `verification_attempts`, `top_songs(artist_id, position 1-10, title, url)`.

- [ ] **Step 1: Write the failing test** `supabase/tests/schema.test.sql`

```sql
begin;
select plan(3);
select has_table('public','claims','claims table exists');
select col_is_unique('public','artist_links',array['canonical_key'],'one row per canonical artist link');
select throws_ok($$insert into claims(artist_id,user_id,claim_number,status) values (gen_random_uuid(),gen_random_uuid(),1,'bogus')$$,'23514',null,'status is constrained');
select * from finish();
rollback;
```

- [ ] **Step 2: Run to verify failure**

Run: `npx supabase test db` Expected: FAIL (no such table).

- [ ] **Step 3: Write the migration**

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,20}$'),
  referral_code text unique not null default substr(md5(random()::text),1,8),
  referred_by uuid references profiles(id),
  slots_unlocked int not null default 5 check (slots_unlocked between 5 and 50),
  founding_scout boolean not null default false,
  default_claim_visibility text not null default 'public' check (default_claim_visibility in ('public','artist','anonymous')),
  default_watch_named boolean not null default false,
  created_at timestamptz not null default now(),
  check (referred_by is distinct from id)
);
create table artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  status text not null default 'pending' check (status in ('pending','live','disputed','delisted')),
  verified_at timestamptz,
  claims_frozen boolean not null default false,
  next_claim_number int not null default 1,
  donation_url text check (donation_url is null or donation_url ~ '^https://'),
  created_at timestamptz not null default now()
);
create table artist_links (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists on delete cascade,
  platform text not null, canonical_key text unique not null, url text not null,
  is_primary boolean not null default false
);
create table artist_submissions (
  artist_id uuid references artists on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (artist_id, user_id)
);
create table claims (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists,
  user_id uuid not null references profiles,
  claim_number int not null,
  claimed_at timestamptz not null default now(),
  dropped_at timestamptz,
  status text not null default 'active' check (status in ('active','historical')),
  base_qualified int not null default 0,
  visibility text not null default 'public' check (visibility in ('public','artist','anonymous')),
  unique (artist_id, claim_number)
);
create unique index one_active_claim on claims(artist_id, user_id) where status='active';
create table watchlist (
  user_id uuid references profiles on delete cascade,
  artist_id uuid references artists on delete cascade,
  named_to_artist boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);
create table referrals (
  referrer uuid not null references profiles,
  referred uuid unique not null references profiles,
  check (referrer <> referred)
);
create table verification_attempts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists, code text not null, url text,
  result text, checked_at timestamptz not null default now()
);
create table top_songs (
  artist_id uuid references artists on delete cascade,
  position int check (position between 1 and 10),
  title text not null, url text not null check (url ~ '^https://'),
  primary key (artist_id, position)
);
-- Row-level security: enabled on EVERY table. No policy means no access through the public API.
alter table profiles enable row level security;
alter table artists enable row level security;
alter table artist_links enable row level security;
alter table artist_submissions enable row level security;
alter table claims enable row level security;
alter table watchlist enable row level security;
alter table referrals enable row level security;
alter table verification_attempts enable row level security;
alter table top_songs enable row level security;

create policy "live artists are public" on artists for select using (status='live');
create policy "links of live artists are public" on artist_links for select
  using (exists (select 1 from artists a where a.id = artist_id and a.status = 'live'));
create policy "top songs of live artists are public" on top_songs for select
  using (exists (select 1 from artists a where a.id = artist_id and a.status = 'live'));
create policy "scouts read their own profile" on profiles for select using (auth.uid() = id);
create policy "scouts read their own claims" on claims for select using (auth.uid() = user_id);
create policy "own watchlist" on watchlist for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
-- artist_submissions, referrals, verification_attempts: no policies (server functions only)

-- Public handles only; never the referral code, referral graph, defaults or slot counts.
create view public_profiles as select id, handle, founding_scout, created_at from profiles;
grant select on public_profiles to anon, authenticated;

create index on claims(user_id);
create index on claims(artist_id, status);
create index on artist_links(artist_id);
create index on profiles(referred_by);
create index on referrals(referrer);
create index on verification_attempts(artist_id);
```

(Writes to `claims`, `artists.next_claim_number`, `profiles.slots_unlocked` happen only through the security-definer functions in later tasks; no insert/update policies exist for them. Anonymous and artist-only claims must never be linkable to a handle by an anonymous API caller: `claims` and `profiles` are readable only by their owner, and everything public goes through masking functions or the `public_profiles` view. Add RLS-posture tests in `schema.test.sql`: as `anon`, `claims`, `referrals`, `verification_attempts`, `artist_submissions` and `profiles` return nothing, `public_profiles` shows handles, `artist_links` shows only live artists, `top_songs` is read-only, and an authenticated scout sees only their own profile and claims.)

- [ ] **Step 4: Run to verify pass**

Run: `npx supabase db reset && npx supabase test db` Expected: PASS (3 tests).

- [ ] **Step 5: Commit** `git add supabase && git commit -m "feat: core schema and RLS"`

---

### Task 3: Claim, drop, cooldown, slots in the database

**Files:**
- Create: `supabase/migrations/0002_claims.sql`, `supabase/tests/claims.test.sql`

**Interfaces:**
- Consumes: tables from Task 2.
- Produces: `claim_artist(p_artist uuid, p_visibility text default null) returns claims` (uses `auth.uid()`; null means use the scout's `default_claim_visibility`; any value other than `public`, `artist` or `anonymous` fails the check constraint), `drop_claim(p_claim uuid) returns claims`. Errors (raised exception messages): `not_authenticated`, `artist_not_claimable`, `already_claimed`, `cooldown`, `roster_full`, `not_your_claim`.

- [ ] **Step 1: Write the failing tests** `supabase/tests/claims.test.sql`

```sql
begin;
select plan(8);
-- fixtures: two scouts, one live artist
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','t1@example.test'),
 ('00000000-0000-0000-0000-0000000000a2','t2@example.test');
insert into profiles(id,handle) values
 ('00000000-0000-0000-0000-0000000000a1','test_1'),
 ('00000000-0000-0000-0000-0000000000a2','test_2');
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000b1','Test Artist 1','test-artist-1','live'),
 ('00000000-0000-0000-0000-0000000000b2','Test Artist 2','test-artist-2','pending');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select is((claim_artist('00000000-0000-0000-0000-0000000000b1')).claim_number,1,'first claim is #1');
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b1')$$,'P0001','already_claimed');
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b2')$$,'P0001','artist_not_claimable');

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2"}',true);
select is((claim_artist('00000000-0000-0000-0000-0000000000b1')).claim_number,2,'second scout gets #2');

-- drop keeps the number as historical
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select is((drop_claim((select id from claims where user_id='00000000-0000-0000-0000-0000000000a1'))).status,'historical','drop -> historical');
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b1')$$,'P0001','cooldown');

-- 29 days: still blocked; 30 days: allowed with new number, old claim kept
reset role;
update claims set dropped_at = now() - interval '29 days' where user_id='00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select throws_ok($$select claim_artist('00000000-0000-0000-0000-0000000000b1')$$,'P0001','cooldown','day 29 blocked');
reset role;
update claims set dropped_at = now() - interval '30 days' where user_id='00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}',true);
select is((claim_artist('00000000-0000-0000-0000-0000000000b1')).claim_number,3,'day 30: new number #3');
select * from finish();
rollback;
```

(Add to the same file, before `finish`, increase `plan`, and cover: `roster_full` after 5 active claims; a frozen artist refused. Concurrency is covered by Step 5.)

- [ ] **Step 2: Run to verify failure**

Run: `npx supabase test db` Expected: FAIL (function claim_artist does not exist).

- [ ] **Step 3: Write the migration**

```sql
create or replace function qualified_claimers(p_artist uuid, p_at timestamptz)
returns int language sql stable as $$
  select count(*)::int from claims c join profiles p on p.id=c.user_id
  where c.artist_id=p_artist and c.claimed_at<=p_at and p.created_at + interval '7 days' <= p_at
$$;

create or replace function claim_artist(p_artist uuid, p_visibility text default null) returns claims
language plpgsql security definer set search_path=public, pg_temp as $$
declare v_user uuid := auth.uid(); v_status text; v_frozen boolean;
        v_slots int; v_active int; v_num int; v_row claims;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select status, claims_frozen into v_status, v_frozen from artists where id=p_artist;
  if v_status is distinct from 'live' or v_frozen then raise exception 'artist_not_claimable'; end if;
  if exists(select 1 from claims where artist_id=p_artist and user_id=v_user and status='active')
    then raise exception 'already_claimed'; end if;
  if exists(select 1 from claims where artist_id=p_artist and user_id=v_user and status='historical'
            and dropped_at > now() - interval '30 days')
    then raise exception 'cooldown'; end if;
  select slots_unlocked into v_slots from profiles where id=v_user;
  select count(*) into v_active from claims where user_id=v_user and status='active';
  if v_active >= v_slots then raise exception 'roster_full'; end if;
  -- the UPDATE row-locks the artist, so concurrent claims take numbers one at a time
  update artists set next_claim_number = next_claim_number + 1
   where id=p_artist returning next_claim_number - 1 into v_num;
  insert into claims(artist_id,user_id,claim_number,base_qualified,visibility)
   values (p_artist,v_user,v_num,qualified_claimers(p_artist,now()),
           coalesce(p_visibility,(select default_claim_visibility from profiles where id=v_user))) returning * into v_row;
  return v_row;
end $$;

create or replace function drop_claim(p_claim uuid) returns claims
language plpgsql security definer set search_path=public, pg_temp as $$
declare v_row claims;
begin
  update claims set status='historical', dropped_at=now()
   where id=p_claim and user_id=auth.uid() and status='active' returning * into v_row;
  if v_row.id is null then raise exception 'not_your_claim'; end if;
  return v_row;
end $$;
grant execute on function claim_artist(uuid,text), drop_claim(uuid) to authenticated;
```

- [ ] **Step 4: Run to verify pass**

Run: `npx supabase db reset && npx supabase test db` Expected: all claims tests PASS.

- [ ] **Step 5: Concurrency check (Review Focus 1)**

Create `supabase/tests/concurrency.sh`: start 20 background `psql` sessions each calling `claim_artist` for 20 different fixture users on one live artist, then assert `select count(distinct claim_number), count(*) from claims` returns equal values (20, 20). Run: `bash supabase/tests/concurrency.sh` Expected: `20|20`.

- [ ] **Step 6: Commit** `git add supabase && git commit -m "feat: atomic claim, drop, cooldown, slot limit"`

---

### Task 4: Canonical artist link key

**Files:**
- Create: `src/lib/artist-url.ts`, `src/lib/artist-url.test.ts`

**Interfaces:**
- Produces: `canonicalArtistKey(raw: string): { platform: string; key: string; url: string }` (throws `Error("invalid_artist_url")` for non-https-resolvable or empty input).

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "vitest";
import { canonicalArtistKey as k } from "./artist-url";

test("suno variants collapse to one key", () => {
  const a = k("https://www.Suno.com/@Embervale/?utm_source=x");
  expect(a.key).toBe("suno:@embervale");
  expect(k("http://suno.com/@embervale").key).toBe(a.key);
  expect(k("suno.com/@embervale/").key).toBe(a.key);
});
test("youtube channel id keeps case, handle does not", () => {
  expect(k("https://www.youtube.com/channel/UCabcDEF123456789ghiJKLm").key).toBe("youtube:channel/UCabcDEF123456789ghiJKLm");
  expect(k("https://youtube.com/@EmberVale").key).toBe("youtube:@embervale");
});
test("unknown sites key on host and path", () => {
  expect(k("https://Example.com/Band/").key).toBe("web:example.com/band");
});
test("rejects garbage", () => {
  expect(() => k("")).toThrow("invalid_artist_url");
  expect(() => k("not a url")).toThrow("invalid_artist_url");
});
```

- [ ] **Step 2: Run to verify failure** `npx vitest run src/lib/artist-url.test.ts` Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
export function canonicalArtistKey(raw: string) {
  const input = raw.trim();
  if (!input) throw new Error("invalid_artist_url");
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`); }
  catch { throw new Error("invalid_artist_url"); }
  if (!u.hostname.includes(".")) throw new Error("invalid_artist_url");
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const path = u.pathname.replace(/\/+$/, "");
  const url = `https://${host}${path}`;
  if (host === "suno.com" && /^\/@[^/]+$/.test(path)) return { platform: "suno", key: `suno:${path.slice(1).toLowerCase()}`, url };
  if (host === "youtube.com") {
    if (/^\/channel\/[^/]+$/.test(path)) return { platform: "youtube", key: `youtube:${path.slice(1)}`, url };
    if (/^\/@[^/]+$/.test(path)) return { platform: "youtube", key: `youtube:${path.slice(1).toLowerCase()}`, url };
  }
  return { platform: "web", key: `web:${host}${path.toLowerCase()}`, url };
}
```

- [ ] **Step 4: Run to verify pass** Expected: PASS (4 tests).

- [ ] **Step 5: Commit** `git add src/lib && git commit -m "feat: canonical artist link key"`

---

### Task 5: Verification code and safe page check

**Files:**
- Create: `src/lib/verify.ts`, `src/lib/verify.test.ts`, `src/app/api/verify/route.ts`

**Interfaces:**
- Produces: `newCode(rand?: (max: number) => number): string`, `type VerifyResult = { ok: boolean; reason: "found"|"not_found"|"blocked"|"timeout"|"too_large"|"fetch_error"|"unsafe_url"; status?: number }`, `checkPage(url: string, code: string, opts?: { fetchImpl?: typeof fetch; timeoutMs?: number; maxBytes?: number }): Promise<VerifyResult>`.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, test } from "vitest";
import { newCode, checkPage } from "./verify";

const page = (body: string, status = 200) => (async () => new Response(body, { status })) as unknown as typeof fetch;

test("code format", () => {
  for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^cf-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
});
test("found is case-insensitive", async () => {
  expect(await checkPage("https://suno.com/@x", "cf-ABC234", { fetchImpl: page("bio cf-abc234 here") })).toMatchObject({ ok: true, reason: "found" });
});
test("not found, blocked, error", async () => {
  expect((await checkPage("https://suno.com/@x", "cf-ABC234", { fetchImpl: page("nothing") })).reason).toBe("not_found");
  expect((await checkPage("https://suno.com/@x", "cf-ABC234", { fetchImpl: page("", 403) })).reason).toBe("blocked");
  const boom = (async () => { throw new Error("dns"); }) as unknown as typeof fetch;
  expect((await checkPage("https://suno.com/@x", "cf-ABC234", { fetchImpl: boom })).reason).toBe("fetch_error");
});
test("too large pages never grant the badge", async () => {
  const r = await checkPage("https://suno.com/@x", "cf-ABC234", { fetchImpl: page("x".repeat(50) + "cf-ABC234"), maxBytes: 20 });
  expect(r).toMatchObject({ ok: false, reason: "too_large" });
});
test("timeout", async () => {
  const slow = ((_u: string, init?: RequestInit) => new Promise((_, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted"))))) as unknown as typeof fetch;
  expect((await checkPage("https://suno.com/@x", "cf-ABC234", { fetchImpl: slow, timeoutMs: 20 })).reason).toBe("timeout");
});
test("unsafe urls are refused without fetching", async () => {
  let called = false;
  const spy = (async () => { called = true; return new Response("cf-ABC234"); }) as unknown as typeof fetch;
  for (const u of ["http://suno.com/@x", "https://localhost/x", "https://127.0.0.1/x", "https://10.0.0.5/x", "https://192.168.1.1/x", "https://169.254.169.254/x", "https://[::1]/x", "https://thing.local/x"]) {
    expect((await checkPage(u, "cf-ABC234", { fetchImpl: spy })).reason).toBe("unsafe_url");
  }
  expect(called).toBe(false);
});
```

- [ ] **Step 2: Run to verify failure** `npx vitest run src/lib/verify.test.ts` Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export type VerifyResult = { ok: boolean; reason: "found" | "not_found" | "blocked" | "timeout" | "too_large" | "fetch_error" | "unsafe_url"; status?: number };

export function newCode(rand: (max: number) => number = (m) => randomInt(m)) {
  return "cf-" + Array.from({ length: 6 }, () => ALPHABET[rand(ALPHABET.length)]).join("");
}

function isSafe(raw: string) {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (h.startsWith("[") || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return false; // no IP literals at all
  return true;
}

export async function checkPage(url: string, code: string, opts: { fetchImpl?: typeof fetch; timeoutMs?: number; maxBytes?: number } = {}): Promise<VerifyResult> {
  const { fetchImpl = fetch, timeoutMs = 15000, maxBytes = 2_000_000 } = opts;
  if (!isSafe(url)) return { ok: false, reason: "unsafe_url" };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: ctl.signal, redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; ClaimedFirstVerifier/1.0)", accept: "text/html,*/*" } });
    if (res.status >= 300 && res.status < 400) return { ok: false, reason: "blocked", status: res.status };
    if (res.status >= 400) return { ok: false, reason: "blocked", status: res.status };
    const text = await res.text();
    if (text.length > maxBytes) return { ok: false, reason: "too_large", status: res.status };
    return text.toLowerCase().includes(code.toLowerCase())
      ? { ok: true, reason: "found", status: res.status }
      : { ok: false, reason: "not_found", status: res.status };
  } catch (e) {
    return { ok: false, reason: ctl.signal.aborted ? "timeout" : "fetch_error" };
  } finally { clearTimeout(timer); }
}
```

Note: redirects are treated as `blocked` so a verified page cannot bounce the server to an internal host; the artist should list the final public URL.

- [ ] **Step 4: Run to verify pass** Expected: PASS (7 tests).

- [ ] **Step 5: Route handler** `src/app/api/verify/route.ts`: authenticated POST `{ artistId, url }`; load the artist's pending code from `verification_attempts` (create one with `newCode()` on first call), call `checkPage`, write the result row, and on `found` set `artists.verified_at=now()` and `status='live'` using the service-role client. Test by posting to the local server and confirming `verified_at` stays null for `not_found`.

- [ ] **Step 6: Commit** `git add src && git commit -m "feat: bio-code verification with SSRF guard"`

---

### Task 6: Referrals, qualified rule, slot unlocks

**Files:**
- Create: `supabase/migrations/0003_slots.sql`, `supabase/tests/slots.test.sql`

**Interfaces:**
- Produces: `qualified_referrals(p_user uuid) returns int`, `recompute_slots(p_user uuid) returns int` (also stores `profiles.slots_unlocked`, never lowering it), trigger `profiles_referral_guard` rejecting `referred_by` equal to self.

- [ ] **Step 1: Write the failing test** `supabase/tests/slots.test.sql` (fixtures with `Test 1`-style handles). Cases: referrer with 1 qualified referral -> 5 slots; 2 -> 10; referred account created 3 days ago -> not counted; referred account with no claim -> not counted; after `delete` of a referral, `recompute_slots` still returns the previously unlocked value.

```sql
begin;
select plan(5);
-- fixtures: referrer + 2 referred accounts, one old (10 days) with a claim, one new (3 days) with a claim
-- (insert auth.users, profiles with created_at overrides, a live artist, and claims rows directly as superuser)
select is(recompute_slots('00000000-0000-0000-0000-0000000000c1'), 5, '1 qualified referral keeps 5');
-- make the second referred account 8 days old
update profiles set created_at = now() - interval '8 days' where id='00000000-0000-0000-0000-0000000000c3';
select is(recompute_slots('00000000-0000-0000-0000-0000000000c1'), 10, '2 qualified -> 10');
select is((select count(*)::int from claims where user_id='00000000-0000-0000-0000-0000000000c4'), 0, 'account with no claim exists');
select is(qualified_referrals('00000000-0000-0000-0000-0000000000c1'), 2, 'no-claim and under-7-day accounts excluded');
delete from referrals where referred='00000000-0000-0000-0000-0000000000c3';
select is(recompute_slots('00000000-0000-0000-0000-0000000000c1'), 10, 'never decreases');
select * from finish();
rollback;
```

- [ ] **Step 2: Run to verify failure** `npx supabase test db` Expected: FAIL (function missing).

- [ ] **Step 3: Implement**

```sql
create or replace function qualified_referrals(p_user uuid) returns int
language sql stable as $$
  select count(*)::int from referrals r join profiles p on p.id=r.referred
  where r.referrer=p_user and r.referrer<>r.referred
    and p.created_at + interval '7 days' <= now()
    and exists (select 1 from claims c where c.user_id=p.id)
$$;

create or replace function recompute_slots(p_user uuid) returns int
language plpgsql security definer set search_path=public, pg_temp as $$
declare n int; target int; result int;
begin
  n := qualified_referrals(p_user);
  target := case when n>=20 then 50 when n>=10 then 30 when n>=5 then 20 when n>=2 then 10 else 5 end;
  update profiles set slots_unlocked = greatest(slots_unlocked, target)
   where id=p_user returning slots_unlocked into result;
  return result;
end $$;
```

Also add a nightly call: `select recompute_slots(id) from profiles where id in (select referrer from referrals)`.

- [ ] **Step 4: Run to verify pass** Expected: PASS (5 tests).

- [ ] **Step 5: Commit** `git add supabase && git commit -m "feat: referral-qualified slot unlocks"`

---

### Task 7: Accounts, profiles and referral capture

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/onboarding/page.tsx`, `src/lib/handle.ts`, `src/lib/handle.test.ts`

**Interfaces:**
- Produces: `isValidHandle(h: string): boolean` (3-20 chars of `a-z0-9_`, not in a reserved list), a `ref` cookie captured from `?ref=CODE`, and an onboarding step that creates the `profiles` row, sets `referred_by` from the `ref` cookie (ignored if it equals the new user), and sets `founding_scout` for the first 100 profiles.

- [ ] **Step 1: Failing test** `src/lib/handle.test.ts`

```ts
import { expect, test } from "vitest";
import { isValidHandle } from "./handle";
test("valid", () => { expect(isValidHandle("maya_1")).toBe(true); });
test("invalid", () => {
  for (const h of ["ab", "A_BC", "has space", "x".repeat(21), "admin", "claimedfirst"]) expect(isValidHandle(h)).toBe(false);
});
```

- [ ] **Step 2: Run to verify failure** Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
const RESERVED = new Set(["admin", "claimedfirst", "support", "root", "api", "login", "onboarding", "artist", "scout", "about"]);
export function isValidHandle(h: string) {
  return /^[a-z0-9_]{3,20}$/.test(h) && !RESERVED.has(h);
}
```

- [ ] **Step 4: Run to verify pass.** Then build the login (magic link + Google via Supabase Auth), callback, and onboarding pages. Onboarding inserts the profile through a security-definer SQL function `create_profile(p_handle text, p_ref text)` added to a new migration `0004_profile.sql` which: validates the handle, resolves `p_ref` to a referrer (null if unknown or self), sets `founding_scout := (select count(*) from profiles) < 100`.

- [ ] **Step 5: Manual check** `npm run dev`; sign up with two emails (names `Test 1`, `Test 2`), second via the first's `?ref=` link; confirm `referred_by` is set and a self-referral is ignored.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: accounts, handles, referral capture"`

---

### Task 8: Artist submission, live rule, artist page, claim UI

**Files:**
- Create: `supabase/migrations/0005_submit.sql`, `supabase/tests/submit.test.sql`, `src/app/submit/page.tsx`, `src/app/artist/[slug]/page.tsx`, `src/components/ArtistHeader.tsx`, `src/components/ClaimButton.tsx`

**Interfaces:**
- Consumes: `canonicalArtistKey` (Task 4), `claim_artist` (Task 3).
- Note: the artist page shows the claimer count and "Be #N" from `artists.next_claim_number` (readable for live artists) and the Founders board from `artist_founders`; it never queries `claims` or `profiles` directly for other people. The scout profile page (Task 10) finds a scout by handle through the `public_profiles` view.
- Produces: `submit_artist(p_name text, p_platform text, p_key text, p_url text) returns artists` — finds or creates the artist by `canonical_key`, records the submitter in `artist_submissions`, and sets `status='live'` once 3 distinct submitters exist.

- [ ] **Step 1: Failing test** `supabase/tests/submit.test.sql`: three different users submit the same key -> after 1st and 2nd the artist is `pending`, after the 3rd `live`; the same user submitting twice does not advance the count; two submissions with the same `canonical_key` produce one artist row.

- [ ] **Step 2: Run to verify failure** `npx supabase test db` Expected: FAIL.

- [ ] **Step 3: Implement**

```sql
create or replace function submit_artist(p_name text, p_platform text, p_key text, p_url text)
returns artists language plpgsql security definer set search_path=public, pg_temp as $$
declare v_user uuid := auth.uid(); v_artist artists; v_id uuid; n int;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select artist_id into v_id from artist_links where canonical_key=p_key;
  if v_id is null then
    insert into artists(name,slug) values (p_name, regexp_replace(lower(p_name),'[^a-z0-9]+','-','g') || '-' || substr(md5(p_key),1,4))
      returning id into v_id;
    insert into artist_links(artist_id,platform,canonical_key,url,is_primary) values (v_id,p_platform,p_key,p_url,true);
  end if;
  insert into artist_submissions(artist_id,user_id) values (v_id,v_user) on conflict do nothing;
  select count(*) into n from artist_submissions where artist_id=v_id;
  update artists set status='live' where id=v_id and status='pending' and n>=3;
  select * into v_artist from artists where id=v_id;
  return v_artist;
end $$;
grant execute on function submit_artist(text,text,text,text) to authenticated;
```

The `artists` RLS policy only shows `live` rows, so the submit page reads the returned row and shows "Waiting for 2 more scouts" for pending ones.

- [ ] **Step 4: Run to verify pass** Expected: PASS.

- [ ] **Step 5: Pages.** `/submit` takes a URL and a name, calls `canonicalArtistKey`, then `submit_artist`. `/artist/[slug]` shows `ArtistHeader` (name, source link, "Fan-created, not verified by the artist" label unless `verified_at`, count of qualified claimers, next number "Be #N"), the Founders list (Task 10), and `ClaimButton` which calls `claim_artist` and maps errors (`roster_full`, `cooldown`, `already_claimed`) to plain messages. Placeholder art is a generated CSS gradient seeded from the slug; no external images.

- [ ] **Step 6: Manual check** with three test accounts: submit one artist three times, confirm it goes live and each claim shows the right number.

- [ ] **Step 7: Commit** `git add -A && git commit -m "feat: artist submission, live rule, artist page, claim UI"`

---

### Task 9: Roster page, watchlist, drop, slot markers

**Files:**
- Create: `src/app/roster/page.tsx`, `src/components/RosterSlots.tsx`, `src/components/RosterSlots.test.tsx`, `src/lib/pagination.ts`, `src/lib/pagination.test.ts`

**Interfaces:**
- Consumes: `claim_artist`, `drop_claim`, `profiles.slots_unlocked`.
- Produces: `pageWindow(page: number, total: number, pageSize = 10): { page, pageCount, from, to, hasPrev, hasNext }` (clamps bad page numbers), and `RosterSlots({ used, unlocked })` rendering 50 slot cells: unlocked cells are usable, the rest are dimmed, and cells 5, 10, 20, 30 and 50 carry a small unexplained marker (no text, `aria-label="milestone"`). No tooltip or copy explains them.

- [ ] **Step 1: Failing test** (Vitest + React Testing Library: `npm i -D @testing-library/react jsdom`, set `environment: "jsdom"` in `vitest.config.ts`)

```tsx
import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { RosterSlots } from "./RosterSlots";

test("renders 50 cells, marks the five milestones, no explanatory text", () => {
  const { container } = render(<RosterSlots used={3} unlocked={5} />);
  expect(container.querySelectorAll("[data-slot]").length).toBe(50);
  expect(container.querySelectorAll("[aria-label='milestone']").length).toBe(5);
  expect(container.querySelectorAll("[data-state='open']").length).toBe(2);
  expect(container.querySelectorAll("[data-state='filled']").length).toBe(3);
  expect(container.textContent).not.toMatch(/referr|invite|unlock/i);
});
```

- [ ] **Step 2: Run to verify failure** Expected: FAIL.

- [ ] **Step 3: Implement** `RosterSlots` as a flex-wrap grid; `data-state` is `filled` for index < used, `open` for index < unlocked, otherwise `locked`; milestone cells are indices 4, 9, 19, 29, 49.

- [ ] **Step 4: Run to verify pass.** Add to account settings two bulk functions in a new migration `0009_visibility_bulk.sql`: `set_all_claim_visibility(p_visibility text)` and `set_all_watch_named(p_named boolean)` (security definer, each updates only `auth.uid()`'s existing rows, never future defaults), with a test that another scout's rows are untouched and an invalid value is rejected. Build `/roster`: active claims (artist, number, drop button calling `drop_claim` with a confirm dialog that states the 30-day cooldown), historical claims in a separate "Historical" section, and the watchlist (insert/delete on `watchlist`, capped at 100 by a trigger in a migration: inserting a 101st row raises `watchlist_full`; with a test that the 100th insert succeeds and the 101st fails; keep the limit in one SQL constant so a future paid tier can raise it to 500).

- [ ] **Step 5: Failing test for pagination** `src/lib/pagination.test.ts`

```ts
import { expect, test } from "vitest";
import { pageWindow } from "./pagination";

test("middle and last page", () => {
  expect(pageWindow(1, 25)).toEqual({ page: 1, pageCount: 3, from: 0, to: 9, hasPrev: false, hasNext: true });
  expect(pageWindow(3, 25)).toEqual({ page: 3, pageCount: 3, from: 20, to: 24, hasPrev: true, hasNext: false });
});
test("exact multiple has no empty trailing page", () => {
  expect(pageWindow(2, 20).pageCount).toBe(2);
  expect(pageWindow(2, 20)).toMatchObject({ from: 10, to: 19 });
});
test("empty list is one empty page", () => {
  expect(pageWindow(1, 0)).toEqual({ page: 1, pageCount: 1, from: 0, to: -1, hasPrev: false, hasNext: false });
});
test("bad page numbers clamp instead of failing", () => {
  expect(pageWindow(99, 25).page).toBe(3);
  for (const bad of [0, -3, NaN]) expect(pageWindow(bad, 25).page).toBe(1);
  expect(pageWindow(Infinity, 25).page).toBe(3);
  expect(pageWindow(2.7, 25).page).toBe(2);
});
test("page size must be positive", () => {
  expect(() => pageWindow(1, 25, 0)).toThrow(RangeError);
});
```

- [ ] **Step 6: Run to verify failure** `npx vitest run src/lib/pagination.test.ts` Expected: FAIL (module not found).

- [ ] **Step 7: Implement** `src/lib/pagination.ts`

```ts
export const PAGE_SIZE = 10;
export type PageWindow = { page: number; pageCount: number; from: number; to: number; hasPrev: boolean; hasNext: boolean };

export function pageWindow(page: number, total: number, pageSize = PAGE_SIZE): PageWindow {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError("pageSize must be a positive integer");
  const t = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const pageCount = Math.max(1, Math.ceil(t / pageSize));
  const wanted = Number.isNaN(page) ? 1 : page === Infinity ? pageCount : Math.floor(page);
  const p = Math.min(pageCount, Math.max(1, wanted));
  const from = (p - 1) * pageSize;
  const to = Math.min(t, from + pageSize) - 1;
  return { page: p, pageCount, from, to, hasPrev: p > 1, hasNext: p < pageCount };
}
```

- [ ] **Step 8: Run to verify pass, then wire the roster page.** `/roster` reads three query parameters, `?active=`, `?historical=` and `?watch=` (each defaults to 1). For each list: first a count query (`select ... count: 'exact', head: true`), then `pageWindow(page, count)`, then the rows with `.range(from, to)`. Show "Page 2 of 3" with Previous and Next links that change only that list's parameter. Manual check: create 25 claims and drop them to fill Historical, open `/roster?historical=3` (5 rows), `/roster?historical=99` (same last page), and `/roster?watch=-3` (first page).

- [ ] **Step 9: Commit** `git add -A && git commit -m "feat: roster, watchlist, slot markers, paginated lists"`

---

### Task 10: Founders and Historical 100 boards

**Files:**
- Create: `supabase/migrations/0006_boards.sql`, `supabase/tests/boards.test.sql`, `src/components/FoundersBoard.tsx`, `src/app/scout/[handle]/page.tsx`

**Interfaces:**
- Produces: SQL functions `artist_founders(p_artist uuid) returns table(claim_number int, handle text, status text, claimed_at timestamptz)` (100 earliest eligible claims) and `scout_historical(p_user uuid) returns table(artist_name text, slug text, claim_number int, status text, claimed_at timestamptz)` (100 earliest-numbered eligible claims). **Eligible** = still active for at least 14 days, or dropped after being held at least 14 days.

- [ ] **Step 1: Failing test** `supabase/tests/boards.test.sql`: a claim made 5 days ago does not appear; an `artist`-only claim shows as `Anonymous scout` on `artist_founders` and not in another scout's `scout_historical`, but its handle appears in `artist_audience` for the verified owner; an `anonymous` claim is masked everywhere except the claimant's own profile; a claim made 20 days ago appears; a claim dropped after 3 days (never held 14) does not appear; a claim held 20 days then dropped appears labeled `historical`; 101 eligible claims return exactly 100 rows ordered by number; an anonymous claim shows as `Anonymous scout` on `artist_founders` and does not appear in another scout's `scout_historical`, but does appear to its owner.

- [ ] **Step 2: Run to verify failure** Expected: FAIL.

- [ ] **Step 3: Implement**

```sql
create or replace function claim_eligible(c claims) returns boolean language sql immutable as $$
  select coalesce(c.dropped_at, now()) - c.claimed_at >= interval '14 days'
$$;

create or replace function artist_founders(p_artist uuid)
returns table(claim_number int, handle text, status text, claimed_at timestamptz)
language sql stable security definer set search_path=public, pg_temp as $$
  select c.claim_number, case when c.visibility='public' then p.handle else 'Anonymous scout' end, c.status, c.claimed_at
  from claims c join profiles p on p.id=c.user_id
  where c.artist_id=p_artist and claim_eligible(c)
  order by c.claim_number limit 100
$$;

create or replace function scout_historical(p_user uuid)
returns table(artist_name text, slug text, claim_number int, status text, claimed_at timestamptz)
language sql stable security definer set search_path=public, pg_temp as $$
  select a.name, a.slug, c.claim_number, c.status, c.claimed_at
  from claims c join artists a on a.id=c.artist_id
  where c.user_id=p_user and claim_eligible(c) and a.status='live'
    and (c.visibility='public' or p_user = auth.uid())
  order by c.claim_number limit 100
$$;
grant execute on function artist_founders(uuid), scout_historical(uuid) to anon, authenticated;
```

- [ ] **Step 4: Run to verify pass.** Build `FoundersBoard` (labels historical entries "Historical") and the scout profile page (Historical 100, Original Scout badge, verified-link mark placeholder).

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: founders and historical boards with 14-day hold"`

---

### Task 11: Scoring and season leaderboard

**Files:**
- Create: `src/lib/scoring.ts`, `src/lib/scoring.test.ts`, `supabase/migrations/0007_scoring.sql`, `supabase/tests/scoring.test.sql`, `src/app/api/cron/score/route.ts`, `src/app/leaderboard/page.tsx`, `vercel.json`

**Interfaces:**
- Produces: `multiplierFor(claimNumber: number): 1|2|3|5`, `claimPoints(baseQualified: number, nowQualified: number, claimNumber: number): number`, SQL tables `season_claim_points` (points per claim) and `season_scores` (totals, league, rank), refreshed by `refresh_season_scores(p_start timestamptz)`.

- [ ] **Step 1: Failing test** `src/lib/scoring.test.ts`

```ts
import { expect, test } from "vitest";
import { multiplierFor, claimPoints } from "./scoring";

test("band edges (fixes the original overlap at 200)", () => {
  const edges: [number, number][] = [[1,5],[10,5],[11,3],[50,3],[51,2],[200,2],[201,1],[5000,1]];
  for (const [n, m] of edges) expect(multiplierFor(n)).toBe(m);
});
test("rejects bad numbers", () => {
  for (const n of [0, -1, 1.5, NaN]) expect(() => multiplierFor(n)).toThrow(RangeError);
});
test("points = growth x multiplier, never negative", () => {
  expect(claimPoints(10, 40, 7)).toBe(150);
  expect(claimPoints(10, 10, 7)).toBe(0);
  expect(claimPoints(40, 10, 7)).toBe(0);
});
```

- [ ] **Step 2: Run to verify failure** Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
export function multiplierFor(n: number): 1 | 2 | 3 | 5 {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("claim number must be a positive integer");
  if (n <= 10) return 5;
  if (n <= 50) return 3;
  if (n <= 200) return 2;
  return 1;
}
export function claimPoints(baseQualified: number, nowQualified: number, claimNumber: number) {
  return Math.max(0, nowQualified - baseQualified) * multiplierFor(claimNumber);
}
```

- [ ] **Step 4: Run to verify pass.** Then mirror the same bands in SQL and test them.

`supabase/tests/scoring.test.sql`: asserts `multiplier_for(10)=5, (11)=3, (50)=3, (51)=2, (200)=2, (201)=1`, that a historical claim earns nothing in `refresh_season_scores`, and that each scout's per-claim rows in `season_claim_points` add up to their `season_scores.points` (the data a later score breakdown will read).

```sql
create or replace function multiplier_for(n int) returns int language sql immutable as $$
  select case when n<=10 then 5 when n<=50 then 3 when n<=200 then 2 else 1 end
$$;

-- league settings: the row with the highest active_from_scouts that is <= the scout count applies
create table league_rules (active_from_scouts int primary key, boundaries int[] not null);
insert into league_rules values (0, '{}');            -- one league (version 1)
-- later: insert into league_rules values (1000, '{20}');  two leagues at 1,000 scouts

create table seasons (season date primary key, boundaries int[] not null);
create table season_entrants (
  season date references seasons, user_id uuid references profiles,
  slots_at_start int not null, league int not null, primary key (season, user_id)
);
create or replace function league_for(p_slots int, p_bounds int[]) returns int language sql immutable as $$
  select 1 + (select count(*) from unnest(p_bounds) b where p_slots > b)::int
$$;

create table season_claim_points (
  season date not null, user_id uuid not null references profiles, claim_id uuid not null references claims,
  points int not null, primary key (season, claim_id)
);
create table season_scores (
  season date not null, user_id uuid not null references profiles,
  points int not null default 0, league int not null default 1, rank int,
  primary key (season, user_id)
);

create or replace function refresh_season_scores(p_start timestamptz) returns void
language plpgsql security definer set search_path=public, pg_temp as $$
declare v_season date := p_start::date;
begin
  -- the league structure and each scout's league are fixed the first time the season is refreshed
  insert into seasons(season,boundaries)
   select v_season, (select boundaries from league_rules
                      where active_from_scouts <= (select count(distinct user_id) from claims)
                      order by active_from_scouts desc limit 1)
   on conflict do nothing;
  insert into season_entrants(season,user_id,slots_at_start,league)
   select v_season, p.id, p.slots_unlocked,
          league_for(p.slots_unlocked, (select boundaries from seasons where season=v_season))
   from profiles p
   where exists (select 1 from claims c where c.user_id=p.id and c.status='active')
   on conflict do nothing;

  -- points per claim (only active claims earn), then totals
  delete from season_claim_points where season = v_season;
  insert into season_claim_points(season,user_id,claim_id,points)
   select v_season, c.user_id, c.id,
          (greatest(0, qualified_claimers(c.artist_id, now()) - qualified_claimers(c.artist_id, greatest(c.claimed_at, p_start)))
           * multiplier_for(c.claim_number))::int
   from claims c where c.status='active';
  insert into season_scores(season,user_id,points,league)
   select v_season, e.user_id, coalesce(sum(k.points),0)::int, e.league
   from season_entrants e left join season_claim_points k on k.season=e.season and k.user_id=e.user_id
   where e.season=v_season group by e.user_id, e.league
   on conflict (season,user_id) do update set points=excluded.points, league=excluded.league;
  update season_scores s set rank = r.rk from (
    select user_id, rank() over (partition by league order by points desc) rk
    from season_scores where season=v_season) r
   where s.season=v_season and s.user_id=r.user_id;
end $$;
```

- [ ] **Step 5: Cron + page.** `vercel.json` cron hits `/api/cron/score` nightly; the route requires `Authorization: Bearer $CRON_SECRET`, calls `refresh_season_scores(date_trunc('month', now()))` and `recompute_slots` for all referrers. `/leaderboard` reads `season_scores` top 100 (recognition only, no prize copy). Verify: call the route without the secret -> 401; with it -> 200 and rows appear.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: scoring, season leaderboard, nightly job"`

---

### Task 11b: Leagues (off in v1, ready to switch on)

Version 1 has one league because `league_rules` has a single row `(0, '{}')`. This task proves the league logic works and adds the board tabs, so turning leagues on later is a settings insert.

**Files:**
- Create: `src/lib/leagues.ts`, `src/lib/leagues.test.ts`, `supabase/tests/leagues.test.sql`
- Modify: `src/app/leaderboard/page.tsx`

**Interfaces:**
- Consumes: `league_for`, `refresh_season_scores`, `league_rules`, `season_entrants` from Task 11.
- Produces: `leagueFor(slots: number, boundaries: number[]): number` (1-based, mirrors the SQL), `leagueName(index: number, total: number): string | null` (null when there is only one league).

- [ ] **Step 1: Failing test** `src/lib/leagues.test.ts`

```ts
import { expect, test } from "vitest";
import { leagueFor, leagueName } from "./leagues";

test("one boundary at 20: 20 or fewer vs more than 20", () => {
  expect(leagueFor(5, [20])).toBe(1);
  expect(leagueFor(20, [20])).toBe(1);
  expect(leagueFor(21, [20])).toBe(2);
  expect(leagueFor(50, [20])).toBe(2);
});
test("no boundaries means a single league", () => {
  expect(leagueFor(50, [])).toBe(1);
});
test("one league per slot level", () => {
  const b = [5, 10, 20, 30];
  expect([5, 6, 10, 11, 20, 21, 30, 31, 50].map((n) => leagueFor(n, b))).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 5]);
});
test("unsorted boundaries are handled and the input is not mutated", () => {
  const b = [30, 10];
  expect(leagueFor(15, b)).toBe(2);
  expect(b).toEqual([30, 10]);
});
test("bad slot counts are rejected", () => {
  for (const n of [-1, 1.5, NaN]) expect(() => leagueFor(n, [20])).toThrow(RangeError);
});
test("names are never numbers and never reveal slot levels", () => {
  expect(leagueName(0, 1)).toBeNull();
  for (let total = 2; total <= 5; total++) {
    const names = Array.from({ length: total }, (_, i) => leagueName(i, total) as string);
    expect(new Set(names).size).toBe(total);
    for (const n of names) expect(n).not.toMatch(/\d/);
  }
});
```

- [ ] **Step 2: Run to verify failure** `npx vitest run src/lib/leagues.test.ts` Expected: FAIL.

- [ ] **Step 3: Implement** `src/lib/leagues.ts`

```ts
const NAMES = ["Opening", "Rising", "Seasoned", "Veteran", "Summit"];

export function leagueFor(slots: number, boundaries: number[]): number {
  if (!Number.isInteger(slots) || slots < 0) throw new RangeError("slots must be a non-negative integer");
  return 1 + [...boundaries].sort((a, b) => a - b).filter((b) => slots > b).length;
}

export function leagueName(index: number, total: number): string | null {
  if (total <= 1) return null;
  const pos = total === 2 ? [0, 4] : Array.from({ length: total }, (_, i) => Math.round((i * (NAMES.length - 1)) / (total - 1)));
  return `${NAMES[pos[index]]} League`;
}
```

- [ ] **Step 4: Run to verify pass** Expected: PASS (6 tests).

- [ ] **Step 5: Database test** `supabase/tests/leagues.test.sql`

```sql
begin;
select plan(5);
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000d1','t1@example.test'),
 ('00000000-0000-0000-0000-0000000000d2','t2@example.test'),
 ('00000000-0000-0000-0000-0000000000d3','t3@example.test'),
 ('00000000-0000-0000-0000-0000000000d4','t4@example.test');
insert into profiles(id,handle,slots_unlocked) values
 ('00000000-0000-0000-0000-0000000000d1','test_1',20),
 ('00000000-0000-0000-0000-0000000000d2','test_2',21),
 ('00000000-0000-0000-0000-0000000000d3','test_3',5),
 ('00000000-0000-0000-0000-0000000000d4','test_4',50);
insert into artists(id,name,slug,status) values
 ('00000000-0000-0000-0000-0000000000e1','Test Artist 1','test-artist-1','live');
insert into claims(artist_id,user_id,claim_number) values
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d1',1),
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d2',2),
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d3',3),
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d4',4);

update league_rules set boundaries='{20}' where active_from_scouts=0;
select refresh_season_scores(date_trunc('month', now()));
select is((select league from season_scores where user_id='00000000-0000-0000-0000-0000000000d1'), 1, '20 slots -> league 1');
select is((select league from season_scores where user_id='00000000-0000-0000-0000-0000000000d2'), 2, '21 slots -> league 2');

-- unlocking more slots mid-season does not move the scout this season
update profiles set slots_unlocked=50 where id='00000000-0000-0000-0000-0000000000d1';
select refresh_season_scores(date_trunc('month', now()));
select is((select league from season_scores where user_id='00000000-0000-0000-0000-0000000000d1'), 1, 'stays in league 1 this season');

-- changing the rules mid-season does not reshuffle the current season
update league_rules set boundaries='{5,10,20,30}' where active_from_scouts=0;
select refresh_season_scores(date_trunc('month', now()));
select is((select count(distinct league)::int from season_scores where season=date_trunc('month', now())::date), 2, 'season keeps its two leagues');

-- ranks restart in each league
select is((select min(rank) from season_scores where league=2 and season=date_trunc('month', now())::date), 1, 'each league has a rank 1');
select * from finish();
rollback;
```

- [ ] **Step 6: Run to verify pass** `npx supabase db reset && npx supabase test db` Expected: PASS.

- [ ] **Step 7: Leaderboard tabs.** `/leaderboard` reads the season's `boundaries` from `seasons`; with one league it shows the plain board, with more it shows tabs named by `leagueName` and opens on the viewer's own league. No page shows a slot number or threshold. Manual check: temporarily set `league_rules` to `(0,'{20}')`, refresh, and confirm two named tabs appear.

- [ ] **Step 8: Commit** `git add -A && git commit -m "feat: leagues logic and board tabs (off by default)"`

**Later, not in v1:** a score breakdown page reading `season_claim_points` (artist, claim number, bonus, new fans, points).

---

### Task 12: Share card, link previews, milestones

**Files:**
- Create: `src/lib/share.ts`, `src/lib/share.test.ts`, `src/components/ShareCard.tsx`, `src/app/c/[artistSlug]/[number]/page.tsx`, `src/app/artist/[slug]/opengraph-image.tsx`

**Interfaces:**
- Produces: `claimShareText(handle: string, artist: string, claimNumber: number): { title: string; description: string }`, `milestoneHit(before: number, after: number): 10|100|1000|null`, `ShareCard({ mode: "claim"|"milestone", ratio: "story"|"square", ... })` ported from `mockups/share-card-flow/index.html`, and a PNG export button using `html-to-image`.

- [ ] **Step 1: Failing test**

```ts
import { expect, test } from "vitest";
import { claimShareText, milestoneHit } from "./share";

test("claim text carries the number", () => {
  expect(claimShareText("maya", "Ember Vale", 7)).toEqual({
    title: "maya was #7 on Ember Vale",
    description: "Be #8. Claim Ember Vale before everyone else does.",
  });
});
test("milestones fire once when crossed", () => {
  expect(milestoneHit(9, 10)).toBe(10);
  expect(milestoneHit(99, 101)).toBe(100);
  expect(milestoneHit(10, 11)).toBeNull();
  expect(milestoneHit(999, 1000)).toBe(1000);
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement**

```ts
export function claimShareText(handle: string, artist: string, claimNumber: number) {
  return {
    title: `${handle} was #${claimNumber} on ${artist}`,
    description: `Be #${claimNumber + 1}. Claim ${artist} before everyone else does.`,
  };
}
export function milestoneHit(before: number, after: number): 10 | 100 | 1000 | null {
  for (const m of [1000, 100, 10] as const) if (before < m && after >= m) return m;
  return null;
}
```

- [ ] **Step 4: Run to verify pass.** Add `supabase/migrations/0012_public_claim.sql` with `public_claim(p_slug text, p_number int) returns table(handle text, claim_number int, artist_name text)`, a security-definer function that returns the handle only when that claim's visibility is `public` and otherwise `Anonymous scout` (the page must never select from `claims` or `profiles` directly), with a pgTAP test that an `anonymous` and an `artist` claim both come back as `Anonymous scout` for an anon caller. Then build the claim link page `/c/[artistSlug]/[number]` whose `generateMetadata` uses `claimShareText` (Open Graph title/description) and a single static image `/og-default.png`. Add `opengraph-image.tsx` for artists with `export const revalidate = false` so each artist image is generated at most once and then cached. No per-claim or per-visit image generation.

- [ ] **Step 5: Card export.** `ShareCard` renders at 1080x1920 (story) or 1080x1080 (square) in an off-screen container and `toPng()` from `html-to-image` produces the file in the browser. Share uses the Web Share API with the PNG and the link carrying `?ref=<code>`, falling back to download plus copy-link.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: share cards, link previews, milestones"`

---

### Task 13: Artist tools (Top Songs, donation link, delist, freeze, dispute)

**Files:**
- Create: `supabase/migrations/0008_artist_tools.sql`, `supabase/tests/artist_tools.test.sql`, `src/app/artist/[slug]/manage/page.tsx`

**Interfaces:**
- Produces: `artist_owner(p_artist uuid) returns uuid` (the verified owner), SQL functions `set_top_songs(p_artist uuid, p_songs jsonb)` (0 to 10 items, https links, verified owner only; an empty list clears them), `set_donation_url(p_artist uuid, p_url text)`, `set_artist_state(p_artist uuid, p_freeze boolean, p_delist boolean)`, `report_artist(p_artist uuid, p_reason text)` which sets `status='disputed'` and pauses claims, and `artist_audience(p_artist uuid)` for the verified owner only: every claim (active and historical, with number; anonymous ones appear as `Anonymous scout`) and only the watchers who chose to be seen; `artist_watch_counts(p_artist uuid)` returning true totals (`total`, `named`); `watch_artist(p_artist uuid, p_named boolean default null)`. Non-owners get `not_owner`. Anonymous scouts are never unmasked.

- [ ] **Step 1: Failing test** `supabase/tests/artist_tools.test.sql`: an unverified owner is refused; an empty list clears the songs, 1 song accepted, 10 accepted, 11 refused; a non-https URL refused; `set_artist_state(freeze)` makes `claim_artist` raise `artist_not_claimable`; delisting hides the artist from the public read policy while keeping all `claims` rows; `artist_audience` returns claimers (with `historical` ones labeled, anonymous ones masked) and only opted-in watchers to the verified owner; `artist_watch_counts` returns the true total even when no watcher is named; both raise `not_owner` for any other user, including a scout who claimed that artist; a scout who watches anonymously never appears by name; an `anonymous` claim is masked even in `artist_audience`, while an `artist` claim shows the handle there.

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement** the functions (each begins with `if auth.uid() is distinct from artist_owner(p_artist) then raise exception 'not_owner'; end if;`; `set_top_songs` deletes and re-inserts positions 1..n inside the function after checking `jsonb_array_length` between 0 and 10 and `url ~ '^https://'`). The owner is recorded in a new column `artists.owner_id` set by the verify route when a bio-code check succeeds for the logged-in user.

```sql
create or replace function artist_audience(p_artist uuid)
returns table(kind text, handle text, claim_number int, status text, since timestamptz)
language plpgsql stable security definer set search_path=public, pg_temp as $$
begin
  if auth.uid() is distinct from artist_owner(p_artist) then raise exception 'not_owner'; end if;
  return query
    select 'claimer'::text, case when c.visibility in ('public','artist') then p.handle else 'Anonymous scout' end, c.claim_number, c.status, c.claimed_at
      from claims c join profiles p on p.id=c.user_id where c.artist_id=p_artist
    union all
    select 'watcher'::text, p.handle, null::int, null::text, w.created_at
      from watchlist w join profiles p on p.id=w.user_id where w.artist_id=p_artist and w.named_to_artist
    order by 1, 3 nulls last, 5;
end $$;
create or replace function artist_watch_counts(p_artist uuid)
returns table(total int, named int) language plpgsql stable security definer set search_path=public, pg_temp as $$
begin
  if auth.uid() is distinct from artist_owner(p_artist) then raise exception 'not_owner'; end if;
  return query select count(*)::int, (count(*) filter (where named_to_artist))::int from watchlist where artist_id=p_artist;
end $$;
create or replace function watch_artist(p_artist uuid, p_named boolean default null) returns void
language plpgsql security definer set search_path=public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into watchlist(user_id,artist_id,named_to_artist)
   values (auth.uid(), p_artist, coalesce(p_named,(select default_watch_named from profiles where id=auth.uid())))
   on conflict (user_id,artist_id) do update set named_to_artist=excluded.named_to_artist;
end $$;
grant execute on function artist_audience(uuid), artist_watch_counts(uuid), watch_artist(uuid,boolean) to authenticated;
```

- [ ] **Step 4: Run to verify pass.** Build the manage page (with an "Audience" section showing Claimed and Watching tabs) and public rendering (Top Songs list, donation button as an outbound link with `rel="noopener noreferrer"`). The claim button opens a small sheet where the scout chooses "Show my name", "Artist only" or "Anonymous"; the watch button's sheet offers "Name visible to the artist" or "Anonymous" (defaults come from `profiles.default_claim_visibility` and `default_watch_named`), and the roster page lets them change either later.

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: artist tools"`

---

### Task 13b: Record styles (placeholder art personalization)

No image uploads in v1 (spec section 14). Every artist shows a generated placeholder record; a verified artist can pick one of six styles.

**Files:**
- Create: `src/lib/record-styles.ts`, `src/lib/record-styles.test.ts`, `src/components/Record.tsx`, `supabase/migrations/0010_record_style.sql`, `supabase/tests/record_style.test.sql`

**Interfaces:**
- Consumes: `artist_owner(p_artist uuid)` from Task 13.
- Produces: `RECORD_STYLES` (readonly tuple of 6 names), `type RecordStyle`, `isRecordStyle(x: string): x is RecordStyle`, `defaultStyleFor(slug: string): RecordStyle`, `<Record style size />`, SQL `artists.record_style` (nullable) and `set_record_style(p_artist uuid, p_style text) returns artists`.

- [ ] **Step 1: Write the failing test** `src/lib/record-styles.test.ts`

```ts
import { expect, test } from "vitest";
import { RECORD_STYLES, isRecordStyle, defaultStyleFor } from "./record-styles";

test("six known styles", () => {
  expect(RECORD_STYLES).toEqual(["classic", "ember", "tide", "paper", "night", "dusk"]);
  expect(isRecordStyle("ember")).toBe(true);
  expect(isRecordStyle("porn.jpg")).toBe(false);
});
test("default is deterministic and always valid", () => {
  expect(defaultStyleFor("ember-vale-3f2a")).toBe(defaultStyleFor("ember-vale-3f2a"));
  for (let i = 0; i < 500; i++) expect(isRecordStyle(defaultStyleFor(`artist-${i}`))).toBe(true);
});
test("defaults spread across all styles", () => {
  const seen = new Set(Array.from({ length: 300 }, (_, i) => defaultStyleFor(`slug-${i}`)));
  expect(seen.size).toBe(6);
});
test("empty slug still returns a valid style", () => {
  expect(isRecordStyle(defaultStyleFor(""))).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure** `npx vitest run src/lib/record-styles.test.ts` Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
export const RECORD_STYLES = ["classic", "ember", "tide", "paper", "night", "dusk"] as const;
export type RecordStyle = (typeof RECORD_STYLES)[number];

export function isRecordStyle(x: string): x is RecordStyle {
  return (RECORD_STYLES as readonly string[]).includes(x);
}

export function defaultStyleFor(slug: string): RecordStyle {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) h = ((h << 5) + h + slug.charCodeAt(i)) | 0;
  return RECORD_STYLES[Math.abs(h) % RECORD_STYLES.length];
}
```

- [ ] **Step 4: Run to verify pass** Expected: PASS (4 tests).

- [ ] **Step 5: Database test** `supabase/tests/record_style.test.sql`: the verified owner can set `ember`; a non-owner gets `not_owner`; the value `custom.png` fails with check violation `23514`; setting `null` is allowed and falls back to the default.

- [ ] **Step 6: Run to verify failure** `npx supabase test db` Expected: FAIL (function missing).

- [ ] **Step 7: Migration** `supabase/migrations/0010_record_style.sql`

```sql
alter table artists add column record_style text
  check (record_style is null or record_style in ('classic','ember','tide','paper','night','dusk'));

create or replace function set_record_style(p_artist uuid, p_style text) returns artists
language plpgsql security definer set search_path=public, pg_temp as $$
declare v_row artists;
begin
  if auth.uid() is distinct from artist_owner(p_artist) then raise exception 'not_owner'; end if;
  update artists set record_style = p_style where id=p_artist returning * into v_row;
  return v_row;
end $$;
grant execute on function set_record_style(uuid,text) to authenticated;
```

- [ ] **Step 8: Run to verify pass** `npx supabase db reset && npx supabase test db` Expected: PASS.

- [ ] **Step 9: UI.** `Record` renders the style as pure CSS (concentric groove rings and a colored label per style), used on artist pages, cards, lists and the share card (Task 12's `ShareCard` takes `style`). Add a style picker (six swatches) to the manage page from Task 13, shown only to the verified owner. There is no file input anywhere in v1.

- [ ] **Step 10: Commit** `git add -A && git commit -m "feat: record styles for placeholder art"`

**Deferred, not in v1 (spec section 14):** artist image uploads, possibly later as a paid basic customization with scan-before-display moderation. Do not add any upload field, storage bucket or image URL column in this plan.

---

### Task 14b: In-app guide

**Files:**
- Create: `src/lib/guide.ts`, `src/lib/guide.test.ts`, `src/app/guide/page.tsx`, `src/components/HelpTip.tsx`

**Interfaces:**
- Produces: `GUIDE_IDS` (readonly tuple), `type GuideId`, `GUIDE: Record<GuideId, { title: string; short: string; body: string }>`, `<HelpTip id={GuideId} />` (a small "?" link to `/guide#<id>`).

- [ ] **Step 1: Failing test** `src/lib/guide.test.ts`

```ts
import { expect, test } from "vitest";
import { GUIDE, GUIDE_IDS } from "./guide";

const REQUIRED = ["claim", "claim-number", "roster", "slot", "historical-claim", "watchlist", "privacy", "fan-created-page", "verified-artist", "founders-board", "historical-100", "season-board", "points", "hold-14", "wait-30", "leagues"];

test("every term the app uses has an entry", () => {
  for (const id of REQUIRED) expect(GUIDE_IDS).toContain(id);
});
test("entries are short, plain and complete", () => {
  for (const id of GUIDE_IDS) {
    const e = GUIDE[id];
    expect(e.title.length).toBeGreaterThan(0);
    expect(e.short.length).toBeGreaterThan(0);
    expect(e.short.length).toBeLessThanOrEqual(160);
    expect(e.body.length).toBeGreaterThan(e.short.length);
  }
});
test("the guide never spells out the friend counts or slot levels", () => {
  for (const id of GUIDE_IDS) {
    const text = `${GUIDE[id].short} ${GUIDE[id].body}`;
    expect(text).not.toMatch(/\b\d+\s+(friends?|referrals?)\b/i);
    expect(text).not.toMatch(/\b(10|20|30|50)\s+(roster\s+)?slots\b/i);
  }
});
```

- [ ] **Step 2: Run to verify failure** `npx vitest run src/lib/guide.test.ts` Expected: FAIL.

- [ ] **Step 3: Implement** `src/lib/guide.ts`

```ts
export const GUIDE_IDS = ["claim", "claim-number", "roster", "slot", "historical-claim", "watchlist", "privacy", "fan-created-page", "verified-artist", "founders-board", "historical-100", "season-board", "points", "hold-14", "wait-30", "leagues"] as const;
export type GuideId = (typeof GUIDE_IDS)[number];

export const GUIDE: Record<GuideId, { title: string; short: string; body: string }> = {
  "claim": { title: "Claim", short: "Backing an artist. You get a permanent number.", body: "Claiming puts your name next to an artist you believe in, before most people have heard of them. It uses one slot on your roster and gives you a claim number that is yours for good." },
  "claim-number": { title: "Claim number", short: "The order you arrived. #7 means seventh.", body: "Numbers are handed out by the server, one at a time, so two people never get the same one. Your number never changes, even if you drop the artist later." },
  "roster": { title: "Roster", short: "The artists you are backing right now.", body: "Your roster is your active claims. Everyone starts with 5 slots, so each choice matters. Bringing friends can open more." },
  "slot": { title: "Slot", short: "One place on your roster.", body: "A claim uses one slot. Dropping a claim frees the slot. You start with 5, and bringing friends can open more." },
  "historical-claim": { title: "Historical claim", short: "A claim you dropped. It keeps its number and date.", body: "Dropping an artist does not erase your claim. It moves to your history with its original number and date, and it stops earning points." },
  "watchlist": { title: "Watchlist", short: "Follow an artist without claiming. No number, no slot.", body: "Watching earns nothing and gives you no number, but you can follow their growth and decide when to claim. The public never sees who is watching." },
  "privacy": { title: "Who sees your name", short: "You choose, for each claim and each watch.", body: "For a claim you can show your name, show it to the artist only, or stay anonymous. For a watch, the artist either sees your name or does not. Your number and points are the same either way, and you can change this later." },
  "fan-created-page": { title: "Fan-created page", short: "A page made by fans, not yet verified by the artist.", body: "Anyone can add an artist. The page says so until the real artist proves it is theirs." },
  "verified-artist": { title: "Verified artist", short: "The artist proved the page is theirs.", body: "The artist pastes a one-time code into the bio of one of their own public pages, and ClaimedFirst checks for it. Verified artists can add Top Songs and a donation link." },
  "founders-board": { title: "Founders board", short: "The 100 earliest claims on an artist.", body: "Active and historical claims both count, and dropped ones are labeled. A claim appears after it has been held for 14 days." },
  "historical-100": { title: "Historical 100", short: "Your 100 earliest claim numbers.", body: "It lists your best early finds, active and dropped. A claim appears after it has been held for 14 days." },
  "season-board": { title: "Season board", short: "A monthly ranking by points. Recognition only.", body: "Seasons run monthly and then reset, so new scouts always have a fair start. Your claim numbers and history never reset. There are no prizes." },
  "points": { title: "Points", short: "New fans an artist gains after your claim, with an early bonus.", body: "The earlier your claim, the bigger the bonus: 5x for the first 10, 3x up to 50, 2x up to 200, then 1x. Only claims you currently hold earn points." },
  "hold-14": { title: "14-day hold", short: "A claim shows on the boards after 14 days.", body: "This stops people from claiming lots of artists and dropping them straight away just to collect trophies." },
  "wait-30": { title: "30-day wait", short: "After dropping an artist, wait 30 days to claim them again.", body: "When you come back you get a new, later number. Your old number stays in your history." },
  "leagues": { title: "Leagues", short: "When enough scouts have joined, the season board splits into leagues.", body: "Scouts with a similar amount of room on their roster compete together. Your league is set when the season starts, so it does not change mid-season." },
};
```

- [ ] **Step 4: Run to verify pass** Expected: PASS (3 tests).

- [ ] **Step 5: Page and help marks.** `/guide` renders every entry as a section with an `id` anchor, in the order of `GUIDE_IDS`, with a short intro ("How ClaimedFirst works") and a link in the main navigation. `HelpTip` renders `<a href="/guide#claim" aria-label="What is a claim?">?</a>` and is placed next to each term in the roster, artist page, boards, leaderboard and claim sheet. Manual check: every `?` opens the right section.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: in-app guide and help marks"`

---

### Task 14: Hardening, terms stub, deploy

**Files:**
- Create: `src/middleware.ts`, `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `docs/deploy.md`

- [ ] **Step 1: Rate limits.** Add a small table-based limiter `rate_limit(p_key text, p_max int, p_window interval)` used by `submit_artist` (10 per hour per user) and the verify route (5 per hour per artist). Failing test first in `supabase/tests/ratelimit.test.sql`: the 11th submit in an hour raises `rate_limited`.

- [ ] **Step 2: Reports.** A report button on every artist and scout page calling `report_artist`; confirm a reported artist stops accepting claims.

- [ ] **Step 3: Terms and privacy stubs.** Plain-language pages stating: recognition only, no prizes, claims are expressions of support and not investments, links out only, how to request removal. Mark them "draft, pending legal review" until Brian's LLC and counsel are in place.

- [ ] **Step 4: Deploy.** Create the Supabase project, run `npx supabase db push`, set env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`), deploy to Vercel, and run the full pgTAP and Vitest suites against the deployed database's staging branch.

- [ ] **Step 5: Smoke test in production.** Create two accounts (`Test 1`, `Test 2`), submit and claim one artist, drop and confirm the historical entry, and confirm the cron route rejects calls without the secret.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: rate limits, reports, terms stubs, deploy docs"`

---

## Self-Review

- **Spec coverage:** accounts and Original Scout (Task 7); artist pages, unverified label, live rule (Task 8); verification (Task 5, owner link in Task 13); claims, drop, historical, cooldown, slots, markers (Tasks 3, 6, 9); watchlist (Task 9); both boards with the 14-day hold (Task 10); scoring, multipliers and monthly season (Task 11); share card, link previews with zero per-claim image cost, milestones (Task 12); Top Songs, donation links, delist, freeze, disputes (Task 13); integrity and rate limits (Task 14). Not in v1 by design: mobile app, Discord bot, push notifications, paid slots, artist analytics, scout-linked verified profiles (follow-up using `checkPage`), song-level claim numbers (v1.1).
- **Type consistency:** `claim_artist`, `drop_claim`, `recompute_slots`, `qualified_claimers`, `claim_eligible`, `canonicalArtistKey`, `checkPage`, `multiplierFor`, `claimPoints`, `claimShareText`, `milestoneHit` are named identically wherever used.
- **Placeholders:** none. The two spec thresholds marked tunable (referral counts, 14-day hold) are fixed in Global Constraints and live in single SQL locations (`recompute_slots`, `claim_eligible`).
