# Game, roster, and business options

The original mechanics are summarized in [the concept](vision.md). This document presents alternatives for an adopting developer. No option has been selected or validated.

## Paid capacity is part of the concept

Larger rosters let players support more artists and give the developer a possible revenue source for hosting, maintenance, development time, and potential seasonal prizes. Whether purchases are subscriptions, permanent capacity upgrades, or seasonal passes remains open. No prices or prize pools are promised.

More scoring slots change competitive opportunity. That is a design question to address through the competition format, not a reason to remove paid expansion.

## Possible scoreboard structures

| Option | How it works | Questions to test |
| --- | --- | --- |
| Capacity divisions | Separate standings for players with comparable roster allowances | Enough players per division? What happens on a mid-season upgrade? |
| Average performance | Divide total eligible artist points by a defined slot count | Use purchased capacity, occupied slots, or locked entries? Can dropping poor performers inflate the average? |
| Weighted average | Weight eligible artist results using disclosed rules | What do weights reward? Does timing or capacity still confer an advantage? |
| Fixed seasonal lineup | Larger collection, but the same number of nominated scoring artists | Does choosing from a larger collection still give an advantage? How and when are picks locked? |
| Multiple boards | Offer total points, normalized results, and division standings | Which board determines titles or any prizes? Is the system understandable? |

Brian raised separate scoreboards and weighted averages during the renewed planning discussion. Fixed lineups and other normalization variants are additional design options.

### A simple comparison, not a selected formula

A five-slot player earns 500 total points across five entries: average 100. A ten-slot player earns 800 across ten entries: average 80. Total points place the second player ahead; average points place the first ahead.

A weighted average could use sum(weight × artist points) / sum(weights). The weights and eligible entries must be defined. An average alone does not establish fairness: capacity, replacement opportunities, empty slots, and selection timing matter.

## Artist growth and scoring

The source idea rewards early support multiplied by subsequent artist growth, with possible loyalty bonuses. A builder could compare:

- Net active-supporter growth versus first-time unique supporters.
- Raw growth versus growth relative to the artist's starting audience.
- Lifetime early-claim multipliers versus season-specific entry advantages.
- Fixed scoring windows versus points only while the artist occupies a slot.
- Caps or diminishing returns versus unrestricted growth.

Internal support growth measures activity in this game. It can reward promotion and network size as well as taste. Do not describe it as objective musical quality.

## Roster changes

The original proposal retains discovery history but changes the active scoring position on return, with a 30-day cooldown. Alternatives include a limited number of seasonal transfers, weekly roster locks, or scoring only from the new activation date.

Define how each option handles retained points, dropped artists, re-entry, inactivity, season rollover, and subscription expiry. For capacity purchases, explicitly define whether an upgrade changes division immediately or next season. Avoid accidental retroactive points.

## Possible prizes

Options include recognition only, cosmetics, sponsored rewards, or a developer-funded seasonal prize pool. A future operator would need to settle eligibility, funding, tie handling, disputes, and applicable requirements before offering prizes. Purchases should not be presented as guaranteeing a return. This handoff does not launch a prize program.

## Abuse and meaningful play

Test self-support, duplicate creator identities, coordinated accounts, reciprocal claiming, rapid roster cycling, and fake growth. Verification and rate limits are tools, not proof that manipulation is impossible.

The design tension is useful to document: claiming should feel deliberate without becoming an obstacle to enjoying music. Listening requirements are an option, but cannot depend on unverifiable external playback.

## Questions for a small rules simulation

Before a future builder commits to a formula, compare equal and unequal capacities, late joiners, one breakout artist, inactive slots, roster swaps, upgrades, and coordinated growth. Show which player wins and why. This is a future validation task, not a test suite or implementation being built here.
