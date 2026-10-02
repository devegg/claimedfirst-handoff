# Prompt to give ChatGPT: design all ClaimedFirst pages

Copy everything below the line into ChatGPT. It is written to stand alone, and it deliberately does not show it our own mockups, so the comparison is independent.

---

You are a senior product designer and front-end developer. Design and build a **clickable prototype of every page** of a web app called **ClaimedFirst**. Deliver it as ONE self-contained HTML file (inline CSS and JavaScript, no build step, Google Fonts allowed) that I can open by double-clicking. It must work as a mobile layout (about 390px wide) and as a desktop layout (about 1100px wide), with a switch to flip between them. Use only fictional data and label the prototype "Mockup, fictional data."

## What ClaimedFirst is

A game where fans prove they found an AI music artist before everyone else. When you "claim" an artist you get a permanent number, the order you arrived: Claim #7 means the seventh person ever. If the artist later has 4,000 claimers, "#7 of 4,000" is a trophy that can't be bought. It is a game about taste and reputation, **not** a stock market: never use trading, shares, investing or financial imagery. Recognition only: there are no prizes, no cash and no payments anywhere in the app.

Feeling: a dimly lit record shop before a show starts. Dark, atmospheric, editorial, designed by someone who loves music. Not a tech-startup look, no purple gradients, no generic system fonts. Choose a display font with character, a refined readable body font, and **one accent color** you choose (not white, gold or neon green). Placeholder artwork only: generate it with CSS or SVG (for example concentric record-groove rings). Never use real photos, real artist names or real logos.

## The words to use

- **Scout** = the fan. **Artist** = the creator. **Claim** = backing an artist and getting a number. **Roster** = the artists you currently claim. **Slot** = one place on your roster. **Historical claim** = a claim you dropped, which keeps its original number forever. **Watchlist** = following without claiming. **Verify** = how an artist proves a page is theirs (never call this "claiming").

## Rules the design must make clear

1. A claim number is permanent. Dropping an artist turns the claim into a **Historical claim** that keeps its number and date and frees the slot. Re-adding that artist is blocked for **30 days**, then gives a new, later number. Both claims stay on the scout's profile.
2. Everyone starts with **5 roster slots**. More unlock by bringing friends: 2 friends -> 10 slots, 5 -> 20, 10 -> 30, 20 -> 50 (max). A friend counts once their account is 7 days old and they have made a claim. The roster shows a 50-cell grid with small **unexplained markers** at cells 5, 10, 20, 30 and 50. The markers get no label or tooltip until the scout reaches them.
3. Watchlist: up to 100 artists, no number, no slot.
4. **Privacy choice:** when a scout claims, a small sheet offers three levels: "Show my name" (the artist, the Founders board and the scout's public profile show the handle), "Artist only" (the artist sees the handle, the public sees "Anonymous scout"), and "Anonymous" (nobody sees the handle, not even the artist). All three keep the number, points and slot. When a scout watches, the sheet offers two levels: "Name visible to the artist" or "Anonymous"; the public never sees watchers either way. Each can be changed later per item, and account settings offer bulk buttons for existing claims and watches.
5. Artist pages are labeled **"Fan-created page, not verified by the artist"** until verified. A page goes live when 3 independent scouts have submitted it, or immediately once the artist verifies.
6. **Verification:** the artist gets a one-time code (like `cf-K7M4QX`), pastes it into the bio of one of their own public pages (Suno, YouTube, SoundCloud, TikTok or their website), and presses Check. Show success and failure states.
7. Verified artists can add **up to 10 Top Songs** (title plus https link), an optional donation link (a plain outbound link; the app never handles money), freeze new claims, remove their page, and see their audience: everyone who claimed them, and the watchers who chose to be named, plus true totals (for example "23 watching: 3 named, 20 anonymous").
8. **Boards:** each artist page has a **Founders board** (the 100 earliest claims ever made on that artist, active and historical, historical ones labeled). Each scout profile has a **Historical 100** (their 100 earliest claim numbers). A claim appears on boards only after it has been held **14 days**; show a greyed "in 9 days" example. A monthly **season leaderboard** ranks scouts by points. Points come from how many new qualified fans an artist gains after your claim, times a bonus: claims 1-10 get 5x, 11-50 get 3x, 51-200 get 2x, 201+ get 1x.
9. **Sharing is the heart of the app.** After claiming, the scout gets a shareable card in two sizes (story 9:16 and square 1:1): "I claimed. #7. Ember Vale." A milestone card appears when an artist passes 10, 100 and 1,000 claimers: "#7 of 1,000 claimers now." The shared link opens a page a friend can read without installing anything: "Maya was #7 on Ember Vale. Be #8." with a Claim button.
10. The first 100 accounts get a permanent **Original Scout** badge.

## Pages to design (every one needs mobile and desktop)

1. **Landing / teaser:** one headline, one supporting line of 8 words or fewer, an email field styled like signing a guest list, a button that feels like a reward (not "Submit"). Almost no explanation; the mystery is the point.
2. **Login:** email magic link, Google, Apple.
3. **Onboarding:** pick a handle (live validation: 3-20 lowercase letters, numbers or underscores, reserved and taken names), "invited by @maya" chip, then the roster with the unexplained markers and a Original Scout badge.
4. **Home / discover:** artists to find, recently claimed signals ("3 scouts claimed this today"), a way to submit an artist.
5. **Submit an artist:** paste a public link and a name; show the "needs 3 scouts" pending state.
6. **Artist page:** show states for unverified, verified (badge, Top Songs, donation link), pending, disputed, frozen. Include the Founders board, stats (claimed by N, "Be #N"), and Claim and Watch.
7. **Claim confirmation sheet** with the privacy choice, then a **claim success** moment where the number lands (a stamp animation works).
8. **Share card studio:** story and square cards, plus the milestone card; Share and Save buttons; a share sheet.
9. **Friend's view:** a chat message with a link preview, then the artist page as a stranger sees it, with "Be #8".
10. **Roster:** the 50-cell grid, active claims, drop (with a confirmation that states the 30-day rule), Historical claims section, watchlist, and the roster-full state.
11. **Scout profile:** handle, Original Scout badge, scout titles (Lucky Scout, Ear for Talent, Legendary Ear), the Historical 100.
12. **Leaderboard:** the monthly season board with the viewer's row highlighted, plus how points work.
13. **Invite / referral page:** the scout's link and a progress view toward the next slot level, without explaining the markers.
14. **Artist manage page:** verify with the code, Top Songs editor with validation (up to 10 songs, https only), donation link, audience (claimed and watching tabs), freeze toggle, remove-page confirmation.
15. **Notifications:** for example "Ember Vale just hit 1,000 claimers. You were #7."
16. **Report sheet** for an artist page, and a **Terms / Privacy** page stub marked "draft."
17. **Empty and error states:** roster full, 30-day cooldown, already claimed, artist not claimable, verification code not found.

## Quality bar

- Accessible: real buttons, visible focus, readable contrast in the dark theme, no information by color alone, respects reduced motion.
- No horizontal scrolling at 390px.
- Real interactions: switching pages, tabs, toggles, sheets that open and close, handle validation as you type, claim then drop flow.
- Copy is short, warm and confident. No jargon and no exclamation marks.

## Output

1. The single HTML file in one code block, nothing omitted or abbreviated.
2. Then a short note: the accent color and fonts you chose and why, and any rule above you think is unclear or risky.
