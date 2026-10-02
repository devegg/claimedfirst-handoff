# ClaimedFirst: where it could go, and what could make it spread

Session date: 2026-09-30. Opinions from a brainstorming pass over the GitHub repo (devegg/claimedfirst), the May 20 brief, the teaser prompt and both transcripts.

## Verdict

The idea is strong. The strength is one object: the permanent claim number ("Claim #7 of 4,200"). The ChatGPT expansion drifted away from it into divisions, weighted averages, prize pools and a handoff to other developers. Those are fixes for problems that only exist once you have players. The repo also still says Brian is "not committing to build", which is now out of date.

## Why it can spread (the loop)

Every person who claims an artist after you makes your claim worth more. Sharing an artist is therefore purely good for the sharer, so the sharing incentive is built into the scoring. Make that explicit in the product ("Bring friends. Every one makes your #7 more impressive.").

## What to share

1. **Dynamic share card per claim.** "I was #7. Ember Vale now has 4,200." Generated server-side, in 9:16 story format and 1:1. One tap to share.
2. **Milestone moments.** When an artist crosses 10 / 100 / 1,000 claimers, push the owner a ready-made card. This is the "I called it" moment.
3. **Public scout profile** at claimedfirst.com/@name: titles, best early claims, history.
4. **Original Scout #1-100 badge** for the first users. Scarce and permanent.
5. **Daily ritual (optional, Wordle-style).** Three unclaimed artists a day, claim one, share the result.

## Getting onto lots of sites and social pages

1. **One URL per artist** (claimedfirst.com/ember-vale) with proper link previews (Open Graph / oEmbed), so it unfurls well on Discord, X, Reddit and in link-in-bio tools.
2. **Artist badge and button.** A live "Claimed by 1,204 / Be #1,205" SVG badge plus an embeddable claim button that artists paste into Suno bios, YouTube descriptions, SoundCloud, Linktree and their own sites.
3. **Discord bot** for Suno-community servers: `/claim`, per-server scout leaderboard. The creators already live in Discord, so this is the natural first channel.
4. **Many small leaderboards** (per server, per genre, per friend group). Few people share "I'm #48,000 globally"; many share "top scout in this server".
5. **Read-only public API** for claim counts, so other sites can show them.
6. **Browser extension later** ("Claim this artist" on Suno, YouTube and SoundCloud pages). High value, but fragile, so not v1.

## Artists are the best distribution channel

Seed 20-50 creators who already have followings before launch. Give them a profile, the badge, and the ability to see and thank their first claimers. Optionally let them offer perks to their first 100 claimers. Their fans become your first claimers.

## Where it could go

1. **Stay narrow first:** AI music (huge supply of unknown creators, weak discovery on the generators themselves).
2. **Creator side:** "Founding fans" lists, perks and a superfan list for artists.
3. **Curator reputation:** playlist makers and A&R types use a verified early-claim record as a portfolio.
4. **Later, other categories:** podcasts, indie games, newsletters, YouTubers. The ClaimedFirst name travels better than the music-specific mechanics.

## Build order (v0)

Web first, not a Flutter app: link, then artist page, then claim in one tap (Apple/Google sign-in), then share card. Next.js + Supabase + Vercel fits. Skip divisions, weighted averages, paid tiers and prizes until there are players. Keep the slot limit (it is the friction that gives the number meaning) and one simple score.

## Risks to settle early

1. **Sockpuppet claims** inflate counts and reward bots. The 3-5 independent submitters rule helps; viral growth stresses it.
2. **Artist consent and impersonation.** Anyone can add an artist, so artists need a way to verify and claim their own profile or opt out.
3. **Prizes.** None planned: the leaderboard is recognition only. If an adopter ever adds paid roster slots plus prizes, that combination may fall under contest or lottery rules, so get legal advice first.
4. **Internal growth measures promotion, not taste.** Fine for virality, but don't market it as "objective taste".
5. **No scraping or dependence on Suno.** Link out only. Don't imply affiliation.
6. **Trademark and handles** for "ClaimedFirst" still unchecked.

## Housekeeping

Correction (same day): Brian is NOT building this. It is a for-fun break, so the repo's handoff framing stays as is. The leaderboard is recognition only, with no prizes. The "Build order" section above is advice for whoever adopts it.

1. Whoever adopts it should agree terms (ownership, roles) with the interested person before building. That person's best use may be community and distribution rather than only code.

## Artist verification and opt-out

Decided direction (2026-09-30). Verification is a small server-side check, not a manual process once it works.

1. **Bio-code proof.** The artist taps "Verify" and gets a one-time code (e.g. `cf-7K3Q`). They paste it into the bio or description of any ONE public profile they listed (Suno, YouTube, SoundCloud, TikTok, Linktree, own site). The server fetches that public page, looks for the code, and awards the badge. It proves control of the account, not real-world identity, which fits pseudonymous AI artists.
2. **Unverified is the default and is labeled:** "Fan-created page, not verified by the artist." The badge appears only after proof.
3. **Identity is the link, not the name.** Profiles key off the public URL and show it next to the name. Duplicates merge into the verified owner's profile.
4. **Verification unlocks what artists want:** the dashboard of first claimers, the "Claimed by N" badge and button, thanking first claimers, and the Top Songs list (below). Real artists have a reason to verify; impersonators can't.
5. **Opt-out requires the same proof.** A verified owner can edit, delist, or freeze new claims. Claimers keep their own history as "artist removed profile". Requiring the code stops a griefer from delisting someone else.
6. **Disputes.** "This isn't me" labels the page "disputed" and pauses new claims briefly. Whoever passes the bio-code check wins. Manual fallback (email or DM, reviewed by a person) for artists who can't edit a bio.
7. **Wording.** Players "claim" artists, so the artist side is "Verify" / "Artist-verified", never "claim your profile".
8. **Unknown:** whether a server can fetch Suno profile pages (they may be blocked or only render in a browser). Test early. Until it works, a person can check the page by hand.

## Content rules

1. ClaimedFirst copies nothing: no artwork, audio or bios from other sites. Links out only, with generated placeholder records. No image uploads in v1; see `docs/spec-v1-design.md` section 14.
2. **Top Songs.** A verified artist lists links to up to ten of their songs that they want people to claim. A small cap mirrors the roster scarcity and gives fans a concrete place to start listening. Open question: do songs get their own claim numbers, or does the claim stay on the artist with songs as the "listen here" list? Suggest the latter first.
3. **Donations (decided).** Two plain outbound links, so ClaimedFirst never handles money: (a) a donate link for Brian toward running costs, and (b) an optional donation link each creator can add to their own profile (Ko-fi, Buy Me a Coffee, PayPal.me). They don't conflict.

## Verification spike result (2026-09-30)

Run from Brian's Mac with `prototypes/verify-test/verify.py`: the code was found on his Suno profile and his YouTube channel page, and a wrong code was correctly not found on either. Retested from a Vercel Sandbox (datacenter, iad1) the same day: same result on both pages (HTTP 200, code found, wrong code not found). One request each, so rate limiting at volume is still untested. YouTube channel descriptions could use the official API instead of page fetching.

## Mockup

Clickable share-card flow: `mockups/share-card-flow/index.html` (open in a browser; fictional data only).
