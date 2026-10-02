# ClaimedFirst v1: design spec

Date: 2026-09-30. Status: draft for Brian's review. Brian may build this or hand it to someone else, so this is written for any builder.

## 1. Purpose and boundaries

A web app where fans claim AI music artists early and get a permanent, shareable claim number ("I was #7"). Recognition only: no prizes, no payments in v1, nothing copied from other sites. The game works independently of Suno, YouTube or any generator's API.

Success for v1: a stranger can open a link, claim an artist in one tap, share a card, and a friend can repeat that, with numbers assigned correctly and no fake-account farming.

Out of scope for v1: mobile app, Discord bot, push notifications, paid slots, artist analytics, listening or audio hosting.

## 2. Terminology (open, decide before build)

Working names: **Scout** (the fan), **Artist** (the creator; "creator" is the umbrella word), **Claim** (the action), **Roster** (active claims), **Historical claim** (a dropped claim, kept forever). The artist-side action is **Verify**, never "claim", to avoid confusion.

## 3. Accounts

1. Sign in with email, Google or Apple. One account per email.
2. Public handle (`@name`) and profile page.
3. "Original Scout" badge for the first 100 accounts.
4. Each account gets a referral link.

## 4. Artists and verification

1. An artist page is keyed by its public source link (Suno, YouTube, SoundCloud, TikTok, own site). The link is shown next to the name.
2. Fan-created pages are labeled "Fan-created, not verified by the artist". Placeholder art only.
3. A page goes live when 3 independent accounts have submitted it, or immediately once the artist verifies.
4. **Verify:** the artist gets a one-time code (`cf-XXXXXX`), pastes it in the bio or description of one listed profile, and a server function fetches the public page and looks for it. Tested 2026-09-30 on Suno and YouTube, from a Mac and from a Vercel datacenter. YouTube may use its official API instead. Manual fallback for artists who cannot edit a bio.
5. Verified artists can: add a donation link, add Top Songs (up to 10 links), see their **audience** (everyone who has claimed them, active and historical, with claim numbers, and everyone watching them with the date they started), edit or delist the page, and freeze new claims. **Each scout chooses** who sees their name, separately for each claim and each watch (section 5, item 7). The artist always sees the true totals (for example "23 watching, 3 named, 20 anonymous"), and can never unmask anyone who chose anonymous. Only the verified artist sees the audience list. Defaults are set in the scout's account settings (proposed: "Show my name" for claims, anonymous for watching).
6. Disputes: "This isn't me" marks the page disputed and pauses new claims briefly; whoever passes the bio-code check wins.
7. Duplicates for the same identity merge into one page.
8. **Artwork.** Placeholder records only in v1. A verified artist can pick a record style; there are no image uploads (see section 14).

## 5. Claims, roster and history

1. A claim gets a claim number for that artist, assigned by the server in order. No two claims on one artist can share a number.
2. **A claim number is permanent.** If a scout drops an artist, the claim is not deleted: it becomes a **historical claim**, keeps its original number and date, and is shown on the scout's profile as "Historical" with the artist's growth since.
3. A dropped claim stops earning score and frees the slot. Re-adding the artist is blocked for 30 days, then creates a new active claim with a new, later number. The old historical claim remains, so a scout can show both.
4. A watchlist (up to 100) follows artists without a number or a slot. A larger watchlist (500) is a possible paid perk later (section 16).
5. **Slots.** Everyone starts with 5 and can unlock up to 50 by referral. Markers at 5, 10, 20, 30 and 50 are shown on the roster, unexplained until reached. Placeholder thresholds (tunable): 10 slots at 2 qualified referrals, 20 at 5, 30 at 10, 50 at 20. The secret is kept for a while, not forever: public material should not spell out the thresholds until people are sharing the secret and others are searching for it, and then the ladder is revealed (decided 2026-09-30).
6. A referral is **qualified** only when the referred account is at least 7 days old and has made at least one claim. Self-referrals and duplicate emails never count.

7. **Visibility.** Each claim and each watch has a visibility the scout chooses when making it and can change later.
   - **Claims have three levels:** **Show my name** (the artist, the Founders board and the scout's public profile all show the handle); **Artist only** (the artist sees the handle, but the public sees "Anonymous scout #N" on boards and does not see the claim on the scout's profile); **Anonymous** (nobody sees the handle, including the artist; it shows as "Anonymous scout #N"). The claim always keeps its number, points and slot. A scout can still prove any number by sharing their own card.
   - **Watches have two levels:** **Name visible to the artist** or **Anonymous**. The public never sees names either way.
   - **Bulk setting:** account settings include one button for each list, "Set all my existing claims to…" (Show my name, Artist only or Anonymous) and "Set all my existing watches to…" (named to the artist or anonymous), so a scout with many artists does not have to change them one by one. It changes existing items only; new ones still start from the defaults.
   - **The public never sees the watchlist.** Watching is never shown on a scout's profile or any board. The public sees at most an artist's total watch count, never names. Only the verified artist can see the names of watchers who chose to be named.

8. **Pagination.** The Roster page's three lists (Active claims, Historical claims, Watchlist) each show 10 items per page with previous/next controls and a page count. Each list pages independently, and a page number past the end shows the last page.

## 6. Boards

1. **Artist Founders board:** on each artist page, the 100 earliest claims ever made on that artist, active and historical together. Historical entries are labeled.
2. **Scout's Historical 100:** on each scout's profile, their top 100 claims by earliest number, active and historical.
3. **Season leaderboard:** monthly, ranked by score (section 8). Recognition only. Version 1 is one basic board with totals.
   - **Leagues (when there are enough scouts).** Once a set number of scouts have joined, the season board splits into leagues by how many roster slots a scout has, so scouts with similar room compete together. Example: at 1,000 scouts, two leagues, one for scouts with 20 slots or fewer and one for scouts with more than 20. Later, one league per slot level. The scout counts and slot boundaries live in a settings table, so turning leagues on, or adding more, is a data change, not a rebuild. Placeholder rule: counted as scouts with at least one claim.
   - **Fixed for the season.** A scout's league is set from their slots when the season begins (or when they first appear in it). Unlocking more slots mid-season moves them up next season, not immediately. The league structure for a season is also fixed when the season begins.
   - **Leagues have names, not numbers.** The board shows names like "Opening League" instead of slot counts, so the slot ladder stays a secret until the planned reveal (section 5, item 5). Names are decided later.
   - **Score breakdown (not in v1).** Later, a scout can open their score and see which artists earned what: artist, claim number, bonus, new fans, points. v1 stores points per claim so this can be added without recalculating anything, but only shows totals.
4. To discourage claim-and-drop number farming, a claim appears on boards only after it has been held a minimum time (proposed 14 days, tunable).
5. Small boards (per community or friend group) are a later addition.

Open: confirm whether the "top 100 historical claims" board is per artist, per scout, or both. This spec includes both.

## 7. Sharing

1. A card for each claim, in story (9:16) and square (1:1), drawn in the scout's own browser and saved as a PNG, so it costs the app nothing. Link previews (Open Graph) carry the claim number in the title and description text ("Maya was #7 on Ember Vale. Be #8."). The preview image is one generic ClaimedFirst image, plus at most one cached image per artist, generated once when the artist goes live. No image is generated per claim or per visit. Mockup: `mockups/share-card-flow/index.html`.
2. Milestone cards when an artist passes 10, 100 and 1,000 claimers.
3. Shared links carry the sharer's referral code.
4. Artist badge and embeddable "Claimed by N" button (verified artists).

## 8. Scoring

1. Multiplier by claim number: 1 to 10 gets 5x, 11 to 50 gets 3x, 51 to 200 gets 2x, 201 and up gets 1x. (This fixes the original overlap at 200.)
2. Points come from growth in qualified claimers since your claim, times your multiplier, while the claim is active.
3. Only qualified, independent claimers count toward growth (same rules as qualified referrals).
4. Recalculated on a schedule (nightly), with a monthly season reset. Permanent records (claim numbers, historical claims) never reset.
5. Scout titles after early breakout claims (Lucky Scout, Ear for Talent, Legendary Ear) are recognition only. Thresholds to be set after real data exists.

6. Points are stored per claim each season, then added up. v1 shows only the total; a per-claim breakdown is a planned later feature (section 6).

## 9. Integrity

1. Rate limits on submissions, claims and sign-ups. Bot challenge on submissions.
2. Referral and growth qualification rules above.
3. Artists caught gaming are banned, with a public policy.
4. Report button on every page. Removal requests honored through the verify-and-delist path.
5. No scraping or copying of artwork, audio or bios. Links out only.

## 10. Architecture

1. **Frontend and server:** Next.js (App Router) on Vercel. Web first, installable as a PWA later.
2. **Data and auth:** Supabase (Postgres, Auth, row-level security).
3. **Claim numbers:** a Postgres function that locks the artist row, takes the next number and inserts the claim in one transaction.
4. **Verification:** a server function that fetches the public page and searches for the code; the YouTube Data API is the sturdier option for YouTube.
5. **Share images:** the card is rendered in the browser; the only server-made image is one cached preview per artist, generated once (see section 7). Zero cost per claim or visit.
6. **Scoring:** a nightly job refreshing a materialized view.
7. **Email:** Resend for sign-in, verification and referral emails.
8. Expected cost at small scale: low (free or entry tiers); revisit with real usage. Donation links are outbound only, so the app never handles money.

## 11. Data model (core tables)

1. `profiles`: user id, handle, referral code, referred_by, slots_unlocked, founding_scout, created_at.
2. `artists`: id, display name, record_style (optional), status (pending, live, disputed, delisted), verified_at, next_claim_number, donation_url.
3. `artist_links`: artist id, platform, public URL (unique), is_primary.
4. `claims`: id, artist id, user id, claim_number (unique per artist), claimed_at, dropped_at, status (active, historical), unique(artist id, claim_number).
5. `watchlist`: user id, artist id.
6. `referrals`: referrer, referred, qualified_at.
7. `verification_attempts`: artist id, code, url, result, checked_at.
8. `top_songs`: artist id, position, title, url.
9. `season_scores`: season, user id, points, rank (materialized).

## 12. Open decisions

Resolved 2026-09-30 (Brian): names in section 2 accepted; both historical boards (per artist and per scout); referral thresholds and the 14-day hold accepted; the paid "skip ahead" idea accepted as a later option that never replaces the free referral path or removes earned slots.

1. **Scout handles:** not forced to match a Suno or YouTube handle (privacy, pseudonyms, collisions). Instead a scout can optionally link and verify a profile with the same bio-code check and get a "Verified @embervale on Suno" mark. An artist page's address defaults to the artist's source handle and is locked to it once verified.
2. **Songs:** v1 claims stay on the artist. Song-level claim numbers are wanted and planned for v1.1; the data model leaves room for them.
3. **Is the artist audience list a paid feature?** Recommendation: no, not at first. The basics (who claimed with a name the artist can see, who opted in to being seen as a watcher, and the totals) stay free, because verified artists are the main way the app spreads and charging early would slow that. Paid candidates for later: exports, messaging first claimers at scale, trends over time. Never a paid way to unmask anonymous scouts.
4. **Image uploads:** none in v1; possibly later as a paid basic customization (section 14).
5. **League rules:** the scout counts and slot boundaries (example: 1,000 scouts, boundary at 20 slots) are placeholders; league names are undecided. The page size of 10 on roster lists is a placeholder.
6. **Entity (LLC, EIN), terms, privacy policy:** later, but before any public launch or any money changes hands.

## 13. Build order (for the plan that follows this spec)

1. Schema, auth, claim function and tests.
2. Artist pages, submission, unverified labels, live rule.
3. Claim, roster, drop, cooldown, historical claims.
4. Share cards and link previews.
5. Verification and artist tools.
6. Referrals and slot unlocks.
7. Boards and scoring job.
8. Hardening: rate limits, reports, terms.

## 14. Artwork policy

**Decision (2026-10-01): no image uploads in v1.** Every artist, track and card uses generated placeholder records. A verified artist can pick a **record style** (a fixed set of looks) so the page still feels theirs.

Why no uploads now:

1. **Safety.** Anyone who can upload an image can upload explicit, violent or otherwise harmful ones, and the app would be responsible for what it shows. A site that hosts images also takes on legal duties if illegal content is ever uploaded, and the project has no company, terms or legal advice yet.
2. **Cost.** Uploads are not free to run. Every image needs scanning by a moderation service, storage, and bandwidth every time it is shown, plus human time to review reports. The goal at this stage is to keep running costs near zero, and uploads work against that.
3. **Copyright.** An artist could upload art that is not theirs. That means takedown requests and disputes to handle.
4. **It travels.** Cover art would appear on share cards and link previews, so one bad image would spread well beyond the app.
5. **Not needed.** The game works without cover art. Placeholders keep every page consistent and loading fast.

**What artists get in v1:** a small set of record styles (for example classic, ember, tide, paper, night, dusk). Each artist gets one by default, chosen consistently from their page address, and a verified artist can change it. It is cosmetic only.

**Later, not in v1: uploads as a paid basic customization.** If uploads are added, they would be offered to verified artists who pay a small basic fee, with these rules:

1. The fee covers the real costs above (scanning, storage, bandwidth, review). A payment also ties the upload to an accountable account, which discourages abuse but does not replace moderation.
2. Cosmetic only. It never affects claim numbers, points, ranking or anything else in the game. This keeps the rule that nobody can pay to rank higher.
3. Safeguards before any image is shown: an automatic image-moderation scan with the image held as pending until it passes; file type and size limits; re-encoding to strip hidden data; per-artist upload limits; a report button and fast takedown on every page; bans for violations.
4. Verified artists only, and only after the company, terms and privacy policy exist and legal advice has been taken.
5. Provider costs and free tiers are to be checked before committing; they have not been verified.
6. If the fee does not cover the costs, uploads stay off.

**Never:** showing images pulled live from another site (the image could change later without notice, and the app would depend on that site).

## 15. In-app guide

Version 1 can be basic, but people need to be able to find out what everything is.

1. A **Guide** page ("How ClaimedFirst works") in plain English, one short entry per term: claim, claim number, roster, slot, historical claim, watchlist, who sees your name, fan-created page, verified artist, Founders board, Historical 100, season board, points, the 14-day hold, the 30-day wait, and leagues.
2. A small **help mark** next to each of those terms wherever it appears in the app, linking straight to its entry.
3. **No secrets spelled out.** The guide says everyone starts with 5 slots and that bringing friends can open more, but it never lists the friend counts or the slot levels. A test checks this.
4. The guide's text lives in one file so it is easy to edit, and a test makes sure every term the app uses has an entry.

## 16. Possible paid perks (later, not in v1)

None of these are built or priced. They are the ideas collected so far for a paid membership, kept in one place. The hard rule applies to every one: **nobody can pay to rank higher or to get a better claim number.** Free referral stays the road to every slot.

1. **Skip-ahead slots:** an optional shortcut to unlock slots, never replacing the free path and never removing earned slots.
2. **Profile cosmetics and badges:** frames and badges that show style, not skill.
3. **Artist tools (for verified artists):** deeper analytics, messaging first claimers at scale, exports.
4. **Artwork customization (for verified artists):** image uploads as a paid basic customization, with moderation safeguards (section 14).
5. **Larger watchlist:** the free watchlist holds 100 artists; a paid tier could raise it to 500.
6. **Suggestion box and voting (future perk):** paying members can post suggestions for the app and upvote suggestions from others. This gives members a voice in what gets built. Suggestions guide the roadmap but do not bind it. Open questions: whether free users can read suggestions, how suggestions are moderated, and whether voting is limited per member.
