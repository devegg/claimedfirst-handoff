# Show, don't hide: decisions and build plan

Decided with Brian, 2026-10-02. Rules stay; what changes is that nothing is silently hidden, every rule explains itself to the person it affects, and the secret referral ladder is dropped.

## Decisions

1. **Early drops (replaces the 14-day silent hide).**
   - A new claim is **locked for 3 days**: it cannot be dropped for 72 hours after it is made.
   - Claims appear on the Founders board and in a scout's history **immediately**. A claim younger than 14 days is shown greyed as **provisional** with "counts in N days".
   - A claim dropped before day 14 stays visible and is labelled **"dropped after N days"** (no trophy value). A claim held 14 days or more is a normal Historical claim.
   - Numbers are **never renumbered**. Brian's idea of temporary numbers that settle later is rejected: shared cards would change after being posted.
2. **Pending pages.** A page with fewer than 3 scouts is visible by its address: name, source link, "N of 3 scouts" progress, an **Add my support** button, and the claim button disabled with a reason. On Discover, pending and fan-created pages get **filter pills** (All, Verified, Fan-created, Needs scouts) so they do not mix with verified pages.
3. **Unverified versus verified submitters.** The threshold stays **3**. A **verified artist (owner of any verified page) counts as 2** of the 3 scouts, so one more scout completes the page. Unverified submitters count as 1 each.
4. **Disputed, removed or delisted pages** say so ("This page is under review", "The artist removed this page") instead of "Not live yet". Claim numbers stay.
5. **Leaderboard.** Making a claim earns **1 base point** so every active scout appears. The board shows **two columns: Total points and At risk** (points from claims younger than 14 days that would be lost if dropped). New accounts see "You can start earning in N days."
6. **Account age: 3 days instead of 7**, everywhere it applies (referral qualification, scoring eligibility, who can report), as **one shared constant** in the database. Each place shows an **"i" icon that opens a short toast** explaining why the rule exists.
7. **Reports.** Verified artists can report with **no account-age delay**. Everyone else sees "Reports open when your account is 3 days old."
8. **Verification codes** show the exact expiry time next to the code.
9. **Referral ladder is public.** Brian's reasoning: it will be discovered and posted within days, and an AI search finds it anyway. The Guide, roster and invite page state the exact steps (friends needed for each slot level, and the maximum), and the roster markers are explained. Referral progress shows each friend as joined, pending (with days left), or counted.
10. **Dropped claims** show in Historical with the honest label above.

## Out of scope here

Creator home page, account deletion (needs email), Resend, and the Terms and Privacy launch drafts.

## Build batches

- **B1 (database and logic):** items 1, 3, 5, 6, 7 and the data for 2 and 4: migrations, pgTAP tests, server actions.
- **B2 (screens):** items 2, 4, 5, 6, 7, 8, 9, 10: pages, filter pills, toasts, copy, Guide, style-file updates (the "secret ladder" rules in the style files and video prompt are removed).
