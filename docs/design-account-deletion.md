# Account deletion: design for review

Status: **proposal, not built.** Brian's rules: a user can delete their account; the account is **hidden and held for 30 days**, then deleted. Reasons: someone regrets it, or someone breaks into an account and deletes it, and the real owner needs time to get it back.

## What the user sees

1. **Settings, "Delete my account".** A plain page explains: your account is hidden now and removed for good after 30 days; you can restore it any time before then by signing in; your claim numbers stay on the artists' pages as "Deleted scout"; this cannot be undone after 30 days. The user types their handle to confirm.
2. **After confirming:** they are signed out. They get an email saying the account is scheduled for deletion on [date] and how to restore it. (See "Email dependency" below.)
3. **Signing in during the 30 days:** a full-page notice, "Your account is scheduled for deletion on [date]. Restore it?" with one button. Nothing else on the site works until they choose. Restoring clears the hold and everything is back as it was.
4. **After 30 days:** the account is gone. A message at sign-in says no account exists for that email; they can create a new one (new handle, no old numbers).

## What is hidden during the 30 days

- The handle and profile page (`/scout/handle` shows "not found").
- Their name everywhere: claims show as "Anonymous scout" on Founders boards and in artists' audience lists, whatever their privacy choice was. Watchlist rows are hidden from artists.
- They do not appear on the leaderboard, and their points do not accrue.
- Their claims keep their numbers and still count in each artist's "Claimed by N". Their slots are held. Referral credit they earned for others stays.
- Their share links keep working but show "Anonymous scout".

Restoring undoes all of it. Points that did not accrue while hidden are not made up.

## What happens on day 30

A daily job (a Vercel cron with `CRON_SECRET`, the same pattern as the season job) runs `purge_deleted_accounts()`:

- **Personal data is deleted:** email (the auth user), handle, profile row, watchlist, privacy defaults, verification attempts, reports they filed, season scores and points.
- **Claim numbers are kept.** Each of their claims moves to a single placeholder account ("Deleted scout") as a historical claim with its original number and date. Numbers are permanent by design, and an artist's Founders board stays intact. The placeholder holds no personal data.
- **Referral rows:** where they were the *referrer*, the row is removed but friends' slots are unchanged. Where they were *referred*, the row is removed and the referrer keeps the slots they earned.
- **Artist pages they own** are not deleted. Ownership is released, and the page goes back to fan-created until verified again.
- **Handle:** released for reuse after the purge.

## Data and code changes (when we build it)

- `profiles.deletion_requested_at timestamptz null`, plus a hidden flag read by the public views (`public_profiles`, `artist_founders`, `scout_historical`, audience functions, leaderboard).
- RPCs: `request_account_deletion()`, `restore_account()` (authenticated, security definer, search_path pinned), and `purge_deleted_accounts()` (service role only).
- The proxy and layout check the flag and show the restore page.
- A reserved placeholder profile for deleted scouts; claims get re-pointed to it in the purge.
- pgTAP tests for each function, plus a concurrency test (restore racing the purge) and a privacy test (no handle leaks in any public view while hidden).
- Copy for Settings, the restore page, the Guide and the Terms and Privacy drafts. Plain words, no exclamation marks.

## Email dependency (important)

The "someone hacks in and deletes it" protection only works if the **real owner is told**. That needs the email sender set up (Resend or similar). Without it, a hidden account just looks gone to its owner, who would have to guess the 30-day rule. **Recommendation: do not release account deletion before Resend is set up.** Until then the account page can say "email us to remove your account," which you handle by hand with the runbook.

An attacker who controls the mailbox can also restore or purge. Nothing in this design stops that; it protects against attackers who reach the site but not the mailbox, and against regret.

## Decisions for you

1. Deleted claims stay as "Deleted scout" with their numbers. (Recommended: this is the product.) The alternative is renumbering, which breaks permanence. A lawyer should confirm this satisfies erasure rules, since the numbers carry no personal data.
2. Release the handle after the purge, or reserve it forever? Recommended: release.
3. Should the claims of a hidden account still count in an artist's totals during the 30 days? Recommended: yes, so numbers do not appear to jump.
4. 30 days is your number. Keep it, and say it in the Guide and Terms.
5. Do not build until Resend is set up (see above).
