# ClaimedFirst — Game Concept Brief
*Brainstorming Session: May 20, 2026*

---

## The Concept

**ClaimedFirst** is a mobile-first music discovery game where players claim AI music creators and songs before anyone else does. The core emotional hook is simple and universal: **"I found them first."**

Players build a roster of favorite artists, stake permanent claims on undiscovered creators, and earn recognition as their picks rise in popularity. The game rewards genuine taste, early faith, and loyalty -- not spending.

This is not a stock market game. It is a **taste identity and discovery game** where your reputation is built on the record of who you believed in before anyone else did.

---

## The Name

**Primary candidate:** `ClaimedFirst.com`
**Secondary candidate:** `FoundFirst.app`

### Why ClaimedFirst is stronger
- "Claimed" is an act. Finding something is passive; claiming is deliberate and territorial.
- "I claimed that artist first" is something people actually say. It has natural bragging-rights language built in.
- Maps directly to the core game mechanic -- players are not just discovering artists, they are staking a claim.
- `.com` carries more consumer trust and recognition than `.app`.
- Clear and unambiguous spelling -- no word-of-mouth confusion.

### Why FoundFirst still has merit
- Two syllables, clean, instantly understood.
- Works as a brand beyond AI music if the concept expands.
- `FoundFirst.app` confirmed available at time of session.

**Recommendation:** Do not register either until the concept is further validated. Check USPTO.gov for trademark conflicts, verify social handle availability on Instagram, TikTok, and X, and run a basic Google search for conflicts. A `.com` domain registration is low cost and not a permanent commitment if you want to hold the name.

---

## The Core Mechanic

### Claiming
- Players discover artists and add them to their roster.
- The first player to add an artist becomes **Claimer #1**. The second is **Claimer #2**. And so on.
- The claim number is **permanent and timestamped**. It never changes regardless of what the player does later.
- Claim numbers are assigned by order of addition, not by listening verification. A claim is an intentional act -- you looked at this artist, made a decision, and staked your taste reputation on them.

### The Permanent Record
- Dropping an artist from your roster does **not** erase your original claim number.
- If you drop an artist and later re-add them, your **new position number** is used for all future scoring. The original claim number is preserved in your history but no longer active for scoring purposes.
- This creates a real cost to dropping someone. Walking away from Claim #7 and returning to find the artist at Claim #4,200 is permanent. You live with the choice you made.
- Your full claim history -- every artist ever claimed, when you claimed them, and what happened to them afterward -- lives on your profile permanently. That history is your reputation.

### The Cooldown Rule
- If a player drops an artist, they cannot re-add that artist for **30 days.**
- This closes the exploit of dropping a rising artist to wait for a lower-ranked re-entry position with a better score multiplier.
- Long enough to make manipulation unprofitable. Short enough to not feel punitive for a genuine change of mind.

---

## Player Tiers and Roster Storage

Storage limits are the primary monetization lever. They create meaningful roster decisions without affecting competitive fairness.

| Tier | Roster Size | Status |
|---|---|---|
| Listener | 5 artists | Free entry tier |
| Scout | 10 artists | Free permanent tier |
| Curator | 20 artists | Paid upgrade |
| Tastemaker | 30 artists | Paid upgrade |
| Legend | 50 artists | Paid upgrade |

- **Listener** exists to let new players try the game with minimal commitment, feel the constraint immediately, and naturally want to upgrade.
- The first upgrade from Listener to Scout is the earliest conversion opportunity.
- Storage limits apply to the **active roster only.** Claim history and watchlist are separate.

### The Watchlist
- Players can watch artists without claiming them.
- Watching does not earn points, does not lock in a claim number, and does not count against roster storage.
- Watchlist capacity is either unlimited or very high (500 to 1,000).
- The watchlist creates tension: you are tracking someone you are not ready to commit to, watching their claim number rise, deciding when -- or whether -- to jump in.

---

## Scoring System

The core principle: **early faith plus artist growth equals your reward.** Not just "this artist got popular" but "you believed in them before anyone else did."

### Claim Position Multiplier
The earlier your claim number, the higher your multiplier on that artist's growth.

| Claim Position | Multiplier |
|---|---|
| Claims 1 -- 10 | 5x |
| Claims 11 -- 50 | 3x |
| Claims 51 -- 200 | 2x |
| Claims 200+ | 1x |

Everyone earns something. Early believers earn more.

### Artist Growth Score
Points accumulate as an artist gains more claimers over time. Growth is measured entirely within the game's own database -- no external API dependency required.

### Breakout Thresholds
An artist's growth is measured relative to when you claimed them.

| Growth Since Your Claim | Status |
|---|---|
| 10x claimers | Rising |
| 50x claimers | Hot |
| 100x claimers | Breakthrough |
| 500x claimers | Legend |

### Loyalty Bonus
Players who keep an artist on their active roster through their growth period earn a loyalty multiplier. This rewards those who did not drop someone during the lean period before they broke through.

### Discovery Streak -- Scout Reputation
A pattern of successful early claims builds a player's overall scout rating.

| Early Breakout Claims | Scout Title |
|---|---|
| 1 | Lucky Scout |
| 3 | Ear for Talent |
| 7+ | Legendary Ear |

Scout titles live on the player profile and are visible to others. This is reputation, not just a number.

---

## Monetization

The philosophy: **pay to enhance the experience, not to buy the win.** More storage does not make you a better scout. It lets you champion more artists you already believe in.

### Confirmed Monetization Layers
- **Roster storage upgrades** -- the primary revenue mechanic. Upgrading from Listener to Scout to Curator to Tastemaker to Legend.
- **Donation path** -- voluntary support to start. Signals belief in the product before asking players to pay.
- **Cosmetic upgrades** -- profile frames, label logos, badges that signal status without affecting scoring.
- **Scout Pass** -- a seasonal battle pass (~$5 to $10) with cosmetic and utility rewards that drives long-tail engagement.
- **Ad-free subscription** -- a clean low-cost tier (~$2.99 to $4.99/month) for players who want an uninterrupted experience.
- **Analytics tools** -- extended history charts, price movement alerts, batch management UI, watchlist size expansion.
- **Speed-ups** -- scan cooldown skips and faster scouting for players who do not want to grind.

### Hard Rules
- No paying for higher scoring multipliers.
- No paying for exclusive access to artists others cannot claim.
- No pay-to-win of any kind. Reviews will be brutal and the core concept depends on the leaderboard reflecting genuine taste.

---

## Artist Side of the Game

Creators are stakeholders, not just content. They have a reason to care about the game and promote it to their own audiences.

- Artists can see who claimed them and when.
- Artists can see their claimer growth over time.
- A social layer allows artists to connect with their scouts -- fans who championed them early.
- Each artist has **one canonical profile page** that aggregates all their music channels (Suno, SoundCloud, YouTube, TikTok, etc.) regardless of platform.
- Artists who attempt to game the system will be banned. This policy should be visible and enforced consistently.

---

## How Artists Enter the Game

- The game is **platform-agnostic.** Any AI music creator on any platform can be added.
- Artist submissions can be auto-verified by checking that the submitted URL resolves to a real profile on a recognized platform.
- A minimum claimer threshold (e.g., 3 to 5 unique players independently submitting the same creator) before an artist profile goes live. This crowdsources quality control without manual review overhead.
- One canonical artist profile per creator identity -- not one per platform. Duplicate submissions for the same artist resolve to the same profile.

---

## Social and Discovery Features

### Friends and Lists
- Players share their active roster with friends.
- Friends can like individual artists or songs on a shared list.
- A liked artist on a friend's list becomes a discovery path for the viewer -- they can tap through, listen, and potentially add the artist to their own roster.

### Social Discovery Feed
- A global feed showing recent notable claims -- not a full firehose, but curated signals.
- Example signals: "3 Tastemakers claimed this artist in the last 24 hours."
- Signals interest without revealing full claim numbers to potential competitors.

### Notifications
Push notifications tied to artist growth serve as the daily re-engagement hook.
- "An artist you claimed early just hit 500 claimers."
- "Someone just claimed an artist on your watchlist."
- "Your scout rank moved up 12 positions this week."
- Personalized, meaningful, and low-effort to build.

---

## Leaderboards

### Seasonal and Permanent -- Both
- **Seasonal leaderboards** for competitive scoring. Resets give new players a fresh start, prevent veteran dominance, create natural re-engagement moments, and support themed events.
- **Permanent historical records** for claim numbers and full discovery history. Long-game loyalty is honored regardless of season.

### The Leaderboard as Reputation Board
If the scoring works correctly, the global leaderboard reflects genuine taste reputation -- not hours played or money spent. Top players are known for having great ears. That is a fundamentally different status signal than most games offer.

---

## Anti-Gaming and Integrity

- **Cooldown rule:** 30-day wait before re-adding a dropped artist closes the score-manipulation exploit.
- **Minimum claimer threshold:** An artist must reach a minimum number of unique claimers before their growth counts toward scoring. Protects against self-claiming fake artists.
- **Bot mitigation:** Rate limiting and CAPTCHA on artist submissions handle most automated abuse.
- **Platform verification:** Auto-check that submitted artist URLs resolve to real profiles on recognized platforms.
- **Ban policy:** Artists who attempt to game the system are banned. Policy is public and enforced visibly.

---

## The Retention Loop

1. Daily login -- free scout pull or watchlist check.
2. Three to five micro-decisions per day (claim, drop, watch, research) each taking 15 to 60 seconds.
3. Weekly scoring update where claimer growth resolves and portfolios are recalculated.
4. Monthly seasons with leaderboard resets and a Scout Pass.
5. Social sharing -- a generated weekly card showing your best early claim and current scout rank, optimized for screenshot sharing.
6. Artist growth notifications pulling players back organically.

---

## The Shareable Moment

The card that writes itself:

*You claimed Ember Vale on March 3, 2026. Claim #7. She now has 4,200 claimers.*

Claim #7 out of 4,200 is a trophy that can never be taken away. That number is the game.

---

## Technical Notes

- **Platform:** Mobile-first. iOS and Android.
- **Recommended stack:** Flutter + Supabase (or Firebase).
- **Data source:** Claim data lives entirely in the game's own database. No critical dependency on external music platform APIs for core scoring.
- **External APIs:** SoundCloud and YouTube Data API v3 usable for supplementary signals. Suno and Udio have no official public API -- do not make them critical-path dependencies.
- **IAP:** RevenueCat recommended for cross-platform subscription and purchase state management.
- **Leaderboards:** Postgres window functions materialized on a regular cadence, served via Supabase Realtime.

---

*Session date: May 20, 2026*
*Status: Brainstorming complete. Concept validated. Ready for game flow mapping and data model when development phase begins.*
