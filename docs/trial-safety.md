# Trial safety: what a review found, and what we do about it

Context: ChatGPT was asked to attack the design. It read the **mockup**, not the real build, so some of its attacks are already blocked and a few things it assumed do not exist. This page sorts them against what is actually built, gives a short runbook for the first fifty people, and lists the rules that need your decision. Source: the "Try to break the rules" prompt, 2026-10-01.

## 1. Each attack against the real build

Status: **Blocked** = handled in code today. **Partly** = some defense, a gap remains. **Open** = nothing yet. **By design** = intentional, your call.

| Attack | Status | What exists today | What to do |
|---|---|---|---|
| Farm referral slots with spare accounts | Partly | A referred account counts only after 3 days and at least one claim. Slots earned never go away. | Review unlocks by hand during the trial (runbook queries 2 and 3). Automatic detection later. |
| Take early numbers with fake accounts | Partly | Server assigns numbers in order; one active claim per scout per artist; rate limits; boards wait 14 days. | Review early claims by hand (query 4). Decide whether to hold flagged claims off boards. |
| Invent an artist from three accounts | Partly | 3 different submitters needed; the same link is one artist; pages are labelled fan-created. | Watch new pages (query 1). Pending names are public on Discover, see "Public names" below. |
| Cycle artists to collect Founders places | By design | The Founders board lists the first 100 claims ever made, including dropped ones, marked Historical. A claim must be held 14 days to appear. | Your decision: keep as is, or only count active claims for Founders. |
| Drop right after the 14-day mark, then share a card | Open | Cards show the number. | Put the claim date and "Active" or "Historical" on the card, and label the public claim page. Small code change. |
| Friend rings on the points board | Open | Own claim excluded; each new scout counts once; accounts must be 3 days old. | Review the top of the board by hand before sharing it (query 3 helps). |
| Season boundary timing | Blocked | Seasons are UTC calendar months, scored once per scout per artist. | Say the window out loud in the Guide (already stated). |
| Verify a page with a code on someone else's profile | Blocked | The code is made for one scout and one artist, and is looked for only on a link listed for that artist. | Residual: see "Impersonation" below. |
| Verified, then remove the code or lose control | Open | Verification is checked once. Codes do not expire. | Recheck periodically; expire codes after a day. Small code change. |
| Duplicate pages for one artist | Partly | Same link means same page. Different links or name spellings make separate pages. | Merge by hand during the trial. Alias merging is a known v1.1 item. |
| Weaponized reports against a rival | Partly | Only accounts 3 days old can report; a report starts a 72-hour window; verified pages are unaffected. | Check reports daily (query 6). Add a per-account report limit. |
| Artist freezes or removes a page to erase fans | Blocked | Freeze keeps every number. Removal keeps claimers' history as "artist removed profile". | None. |
| Artist reads the audience list to pressure fans | By design | The audience list obeys each claim's privacy choice. Anonymous scouts are never shown. | Consider hiding exact dates from artists. |
| Infer an anonymous fan from counts | Open | Counts are exact. | Accept for now; do not promise more than "anonymous scout" means. |
| Offensive artist names on the front page | Open | No content check. Names are shown as typed, and pending names show on Discover. | Add a basic name check and a way to report a pending page. Code change. |
| Hammer the search and address checks | Blocked | Search needs 2+ characters, input length capped, 60 requests a minute per address. | None now. |
| Verification fetch hits internal servers (SSRF) | Blocked | Private and reserved addresses blocked, time and size limits. A DNS-rebinding gap is known and small. | Revisit before scale. |
| Phishing links in Top Songs or donation | Open | Any https link is accepted. | Show the destination domain beside each outbound link. Small code change. |
| Selling rank or accounts | Open | Nothing yet. | A line in the Terms: no transfers, no paid claims. |
| Prizes or investment language | Blocked | Recognition only; no payments; nothing in the app calls numbers an investment. | Keep it that way; ask a lawyer before any paid perk. |

### Impersonation, the real gap

An attacker can list an artist **under the victim's name but with the attacker's own profile link**, then verify with a code on their own profile. The system proves control of the **link**, not of the **name**. Today the defenses are the "fan-created, not verified" label until verified, the real artist's dispute, and the identity being the link shown next to the name. For fifty trusted testers this is acceptable. Before a public launch, show the verified link prominently next to the name, and let a dispute from a verified owner of a **different** page for the same name pause the page.

## 2. Runbook for the trial (run in the Supabase SQL editor)

SQL editor: https://supabase.com/dashboard/project/YOUR-SUPABASE-PROJECT-REF/sql/new. Run the checks twice a week during the trial. Read-only checks first, then actions.

```sql
-- 1. Newest artist pages and who submitted them
select a.created_at, a.name, a.slug, a.status, count(s.user_id) as submitters
from artists a left join artist_submissions s on s.artist_id = a.id
group by a.id order by a.created_at desc limit 30;
-- 2. Accounts that unlocked extra slots, fastest first
select p.handle, p.slots_unlocked, p.created_at, (select count(*) from referrals r where r.referrer = p.id) as referred
from profiles p where p.slots_unlocked > 5 order by p.slots_unlocked desc, p.created_at limit 30;
-- 3. Who referred whom, with the new account's age and claim count
select r1.handle as referrer, r2.handle as referred, r2.created_at,
       (select count(*) from claims c where c.user_id = r2.id) as claims
from referrals r join profiles r1 on r1.id = r.referrer join profiles r2 on r2.id = r.referred
order by r2.created_at desc limit 50;
-- 4. Early claims (#1 to #10) from accounts under 3 days old at claim time
select a.slug, c.claim_number, p.handle, p.created_at as account_created, c.claimed_at
from claims c join artists a on a.id = c.artist_id join profiles p on p.id = c.user_id
where c.claim_number <= 10 and c.claimed_at < p.created_at + interval '3 days'
order by a.slug, c.claim_number;
-- 5. Accounts that claim and drop a lot
select p.handle, count(*) filter (where c.status = 'historical') as dropped, count(*) filter (where c.status = 'active') as active
from claims c join profiles p on p.id = c.user_id group by p.handle having count(*) filter (where c.status = 'historical') >= 3
order by dropped desc;
-- 6. Open reports
select r.created_at, a.slug, p.handle as reporter, r.reason
from artist_reports r join artists a on a.id = r.artist_id join profiles p on p.id = r.reporter_id
order by r.created_at desc limit 20;
```

Actions (change data, so look at the row first):

```sql
-- Take a page off Discover and block new claims (claimers keep their history)
update artists set status = 'delisted' where slug = 'PAGE-ADDRESS';
-- Put it back
update artists set status = 'live' where slug = 'PAGE-ADDRESS';
-- Pause new claims on a page without delisting it
update artists set claims_frozen = true where slug = 'PAGE-ADDRESS';
-- Stop an account from signing in (claims and numbers stay; there is no delete-user path yet).
-- Untested: try it on a throwaway account first.
update auth.users set banned_until = 'infinity' where id = (select id from profiles where handle = 'HANDLE');
-- Undo the sign-in block
update auth.users set banned_until = null where id = (select id from profiles where handle = 'HANDLE');
```

Limits you should know: there is no admin screen, no banned flag on profiles, no way to merge two pages, and no audit log of moderation actions. Write down each action you take, with the date and the reason, in a note somewhere you will find it later.

## 3. Rules two people could read differently

What the build does today, and what you still need to decide. "Decide" items would change code or copy.

| Question | As built | Decide |
|---|---|---|
| Independent scouts: separate people or just accounts? | Separate accounts. No device, household or network check. | Fine for the trial. |
| Qualified friend: account 3 days old with 1 claim, even if dropped at once? | 3 days old and at least one claim; the claim does not have to stay. Slots earned are never taken back. | Should a banned friend's slot be revoked? |
| Permanent number after fraud, removal, or account deletion? | Survives artist removal (kept as history). There is no account-deletion path: deleting a user is blocked by their claims. | Should numbers survive account deletion? Needs the lawyer too. |
| 14-day hold: active on day 14, or held once? | Held once is enough. A claim dropped later stays on the boards as Historical. | Matches the Founders decision above. |
| 30-day wait: how measured? | 30 days in elapsed time (30 x 24 hours), UTC. | Fine. Say "30 days" in the Guide (already). |
| New qualified fans: when do they count, reversed if they leave? | A different scout, account at least 3 days old, who has claimed the artist after you. Points are stored per claim. | Reverse points if a fan is banned? |
| Season edge: fan arrives before reset | Counted in the season of the claim date, UTC month. | Fine. |
| Duplicate pages: who owns original order? | Not handled; no merge. | Decide the rule before the first merge. |
| Anonymous: hides old entries and cards? | Applies to current views. Image cards already saved stay as made. | Say so in the Guide. |
| Does any linked site prove control of the named artist? | It proves control of that link. | See "Impersonation". |
| Disputes: who starts, what evidence, claims paused? | Accounts 7+ days old; a report starts a 72-hour window; claims pause during it. | Decide what evidence you want. |
| Payments between artists and scouts | Banned by nothing yet. | Put it in the Terms. |

## 4. Code backlog from this review, in order

1. **Name check and a report path for pending pages.** Block obviously abusive names at submit; let a signed-in scout report a pending page.
2. **Domain label on outbound links** (Top Songs, donation, source): show `suno.com` or the host next to each link.
3. **Verification codes expire (24 hours) and are single-use; recheck verified pages monthly.**
4. **Claim date and status on share cards and the public claim page.** (Done in S1: cards show the claim date and are only offered for active claims; the public claim page shows the current Active or Historical status.)
5. **Per-account limit on reports.**
6. **Show the verified link next to the artist name** and let a verified owner of another page for the same name raise a dispute.
7. Later, not now: graph-based ring detection, device checks, trust scores, jurisdiction-specific prize rules.
