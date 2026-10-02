# Concept: a game about discovering AI music talent

## The emotional hook

“I found them before everyone else did—and here is my record.”

ClaimedFirst makes early belief in an AI music creator visible. Players choose a limited roster, follow their discoveries' progress, and compare results over a season. Artist appreciation and social interaction give those choices meaning; the game gives them stakes.

The project offers an original concept and alternatives. It is not a final specification, a validated business, or a promise that Brian will build it.

## The player experience

1. Discover an artist through recommendations, another player's roster, or a creator profile.
2. Investigate their work through available music references or optional authorized audio.
3. Choose: claim a roster slot, watch for later, or pass.
4. Track the artist's growth inside ClaimedFirst and your seasonal results.
5. Decide whether to hold, replace, or expand your roster.
6. Share a notable discovery and compete again next season.

A limited roster creates the central decision: “Who do I believe in enough to give them a place?”

## Original May 2026 mechanics

These describe the source idea, not mandatory implementation rules.

| Mechanic | Original proposal |
| --- | --- |
| Claim order | Sequential, timestamped supporter number for each artist |
| Active roster | Limited capacity, with paid expansion |
| History | Original claim remains in the player's record after removal |
| Returning to an artist | A new active position applies to future scoring |
| Cooldown | Wait 30 days after dropping an artist before re-adding |
| Watchlist | Observe artists without a scoring slot or claim number |
| Early-claim advantage | Earlier positions receive larger growth multipliers |
| Growth | New claimers within ClaimedFirst, rather than external streaming counts |
| Loyalty | Additional recognition or multiplier for holding a pick |
| Competition | Seasonal scoreboards and permanent discovery history |
| Social identity | Shared rosters, scout titles, and discovery cards |

The original multiplier bands were 5× for claims 1–10, 3× for 11–50, 2× for 51–200, and 1× for “200+.” The overlap at 200 needs resolution. The full scoring formula, growth window, loyalty calculation, and handling of removals were not specified.

The original roster table described Listener with 5 free slots, Scout with 10 free slots, then paid Curator with 20, Tastemaker with 30, and Legend with 50. Elsewhere the brief calls Listener-to-Scout a conversion opportunity. Preserve this inconsistency as an open pricing decision.

## Social value

Listeners develop a visible history of taste. Creators can recognize early supporters. Friends can explore one another's rosters and discuss discoveries. A fictional discovery card might say:

> You first supported Ember Vale as #7. They now have 240 supporters on ClaimedFirst.

This describes in-app support, not worldwide popularity, verified listening, ownership of the music, or a financial investment in the artist.

## Independent operation

Profiles, artist identities, claims, roster capacity, watchlists, scoring, and seasons should live in the app's own system. Game results should not require importing streaming counts or scraping generator services.

External music links are optional references. A removed link should not delete roster or claim history. Display unavailable sources honestly. Optional creator-authorized audio hosting is a future implementation choice, with its own permissions, moderation, and cost questions.

This separates independence of the game from availability of every referenced song. No concept can promise immunity from every legal, hosting, or service change.

## Relationship to SpinRoom

SpinRoom is a separate, full listening-party platform, available to the right developer, and may fit integration by a music generator. ClaimedFirst is independently buildable and does not require SpinRoom, Discord events, or synchronized generator playback. The projects can share inspiration without combining their scope.

## What future developers can decide

Scoring formulas, divisions, pricing, season duration, roster changes, prizes, technology, moderation, and operating model. See the [options document](game-options.md) for tradeoffs rather than prescribed answers.
