# ChatGPT prompts for ClaimedFirst

Five prompts. Each stands alone: paste the whole block, attach the files it names, and nothing else is needed. All names, artists and numbers in the examples are fictional. Prompt 3 is the most useful right now.

**Before you paste any of them:** ChatGPT is a third party. Prompts 1 to 3 and 5 use only public material. Prompt 4 includes the secret slot thresholds, so skip it if you would rather keep those private.

Files live in `docs/`:
`STYLE-banned-words-and-phrases.md`, `STYLE-visual-direction.md`, `ClaimedFirst-overview-for-NotebookLM.md`, `spec-v1-design.md`.

---

## 1. Outreach message to the artists

**Attach:** `STYLE-banned-words-and-phrases.md`, `ClaimedFirst-overview-for-NotebookLM.md`.

```
Read first. You are helping me write a short message to AI music artists whose public profile pages I have already listed on a new site called ClaimedFirst. I know some of them personally; many I do not. The message must be honest, warm and short, and it must make it easy to say "yes", "fix this", or "please remove it".

Facts you may use, and nothing else:
- ClaimedFirst is a small game where fans ("Scouts") back an artist early and get a permanent claim number, like "Claim #7". Recognition only: no prizes, no money, nothing is sold.
- The site is independent and has no connection to Suno, YouTube or any other service.
- Each artist's page was created by a fan and is clearly labelled "Fan-created page, not verified by the artist". It shows only the artist's public name, a link to their public profile, and a record-style placeholder picture. Nothing is copied: no artwork, audio or bios.
- An artist can verify the page by pasting a short one-time code into the bio of their own public profile and pressing Check. Verified artists can add up to 10 links to songs they want fans to claim, add a donation link of their own, pause new claims, or remove the page entirely.
- If an artist wants the page gone, they can verify and remove it, or reply to this message and I will remove it.
- The site is about to be tried by a small group before any public launch.

Rules: follow the attached writing style file exactly (plain English, no exclamation marks, none of the banned words). Do not invent numbers, follower counts, praise for their music, or promises of growth. Do not suggest the artist will get famous. Do not say "claim your profile" (fans claim, artists verify). Do not name any real artist. Use a placeholder [Artist name] and [page address].

Write four versions, each under 120 words:
A. Direct message to an artist I know personally.
B. Direct message to an artist I have never met.
C. A follow-up, one week later, to someone who did not reply (no pressure).
D. A reply to someone who asks me to take their page down.
Then list three things in these messages that might still worry an artist, and how to answer each.
```

---

## 2. Brand artwork

**Attach:** `STYLE-visual-direction.md`.

```
Read first. Create original brand artwork for a website called ClaimedFirst, using the attached visual direction exactly (dark green-black background #121613, warm paper text #F3EFE5, one coral accent #E48C72, headings in Fraunces, body in DM Sans). The feeling is a dimly lit record shop before the show starts. Flat, calm, graphic. The recurring image is a record: concentric groove rings and a small label disc. A claim number lands like a stamp on a ticket.

Hard rules: no real artists, brands, logos or artwork; no photographs; no stock-market imagery (no charts, arrows, coins, tickers); no gold, no trophies, no neon, no purple gradients. Any text is only "ClaimedFirst" or a claim number like "#7". Check every letter for spelling errors before you show me.

Make these, one at a time, and ask me to approve each before moving on:
1. A wordmark: "Claimed" in cream with "First" in coral, serif, on the dark background. Three options.
2. A square favicon and app icon: a simple record with a coral label disc. Must read at 32 pixels. Two options.
3. A default link-preview image, 1200 x 630: the wordmark, a record, and the words "Find them first. Keep the number." Nothing else.
4. A Original Scout badge, circular, coral on dark: a record with the words "Original Scout". Two options.
5. Three small title badges for scouts: "Lucky Scout", "Ear for Talent" and "Legendary Ear". They should look like a family, each different only in a small detail. No gold or medals.
6. An empty-state illustration for "No claims yet": an empty record sleeve with a single groove ring. Flat, calm.

After each image, tell me the exact hex colors you used and whether it matches the visual direction.
```

---

## 3. Usability test (do this one first)

**Attach:** 6 to 8 screenshots of the live site (see "What to screenshot" below), plus `ClaimedFirst-overview-for-NotebookLM.md`.

**What to screenshot** (signed in, desktop width is fine): the home page; Discover; an artist page that is not verified; the account menu open; your own artist page after verifying; the Manage page including the Top Songs section; the Roster; Settings; the Submit page.

```
Read first. You are a usability tester. Pretend you are a first-time user: a music fan in their thirties who loves finding small AI music artists, is comfortable with apps, and has never heard of ClaimedFirst. You know only what the screenshots show. Do not use the attached overview to understand the screens; use it only afterwards to check whether the site explains itself.

ClaimedFirst is a small game where fans (Scouts) back an artist early and get a permanent claim number. Artists verify their own page. I am the builder, and I have had trouble finding things myself, so be blunt and specific.

Walk through these tasks, one at a time, using only the screenshots. For each task say, in order: what you would click first and why, what you expected to happen, where you got lost or hesitated, and whether you would give up.
1. I am an artist. I want to add up to 10 links to my songs. Where do I go?
2. I already added one song link and want to change it, then add more. Where do I do that?
3. A page for me exists but says "Fan-created page". How do I take it over?
4. I want to back an artist and get a number. What do I do, and what happens next?
5. I changed my mind about an artist. What happens to my number?
6. I do not want everyone to see that I backed someone. Where do I change that?
7. I want to add an artist that is not listed. Where do I go, and what do I enter?
8. I want to show a friend my claim. What do I do?
9. I want to find out what "slot" and "roster" mean.
10. Where do I see the Leaderboard and what do the points mean?

Then produce:
A. A table of every friction point: screen, task number, what confused you, quote the exact on-screen words that caused it, severity (blocking / annoying / minor), and a one-sentence fix.
B. The five most important fixes, in order, each described as a change a developer could make in under a day.
C. Any words on the screens that a normal fan would not understand.
D. Anything that looked broken, cut off, hard to read, or too small to tap on a phone.
E. Anything the site never explains that a new user needs to know.

If a screen I did not send would be needed to finish a task, say which screen and stop that task rather than guessing.
```

When ChatGPT's answer comes back, paste it to me and I will turn it into a fix list.

---

## 4. Try to break the rules

**Attach:** `spec-v1-design.md`. This includes the slot thresholds, which are secret, so skip this prompt if you want them kept private.

```
Read first. You are a security-minded product reviewer. Attached is the design for ClaimedFirst, a game where people back AI music artists early and get a permanent claim number, with limited roster slots earned by referring friends, a monthly points board, and artist verification by pasting a code in a public bio.

Your job is to find ways a determined person could cheat, abuse or embarrass the game. Be adversarial and concrete. For each attack give: the attacker's goal, the exact steps, what they gain, how likely it is, how bad it is, and the cheapest fix that does not make the game worse for honest players.

Cover at least these areas, and add any you find:
1. Fake accounts to farm referral slots, claim numbers or points.
2. Claiming and dropping to collect early numbers or board places (the rules include a 30-day return wait and a 14-day hold before a claim appears on a board).
3. Rings of friends boosting each other on the monthly points board.
4. Impersonating an artist: verification by bio code, listing a page you do not control, listing someone else's page so it looks like theirs, disputing a real artist's page.
5. Harassment: using the privacy choices, the disputes process or the audience list to target someone.
6. Abusing anonymous endpoints (address checks, search), spam submissions, and unmoderated artist names appearing publicly.
7. Anything that lets someone pay or trade for rank or numbers, or that could be called a lottery, gambling or a securities-like product.
8. Anything in the rules that two reasonable people could read differently.

End with: the five most dangerous issues, what you would fix before inviting the first fifty people, and what you would deliberately leave for later. Do not praise the design. If something is fine, say nothing about it.
```

---

## 5. Terms and Privacy drafts for a lawyer

**Attach:** `spec-v1-design.md`, `ClaimedFirst-overview-for-NotebookLM.md`.

```
Read first. I am not a lawyer and you are not my lawyer. Produce first DRAFTS of Terms of Service and a Privacy Policy for a small website called ClaimedFirst, clearly headed "DRAFT, NOT LEGAL ADVICE, FOR REVIEW BY A QUALIFIED LAWYER", written so a lawyer can mark them up quickly. Plain English, short sentences.

Facts, from the attached files, and nothing else: how accounts work (email sign-in link; optional Google or Apple later); what is stored (email, chosen handle, claims with their numbers and dates, watchlist, privacy choices per claim and per watch, referral links, points); what is public and what is not (the audience list is private to a verified artist; the public never sees the watchlist); artist pages created by fans, labelled fan-created until the artist verifies; verification by a code in a public bio; artists can verify and then remove their page; reports and a 72-hour dispute window; recognition only, no prizes, no cash, nothing for sale; an optional outbound donation link that the site never handles money for; the site is independent of Suno, YouTube and other services and copies no artwork, audio or bios; outbound links carry a ClaimedFirst campaign tag; hosting and email use third-party services.

Do the following:
1. Terms of Service: who can use it, accounts, acceptable use, user content (artist names and song links that people submit), fan-created pages and takedown/removal, disputes, no affiliation, no prizes or money, availability and changes, limits of liability, governing law left as a placeholder [JURISDICTION].
2. Privacy Policy: what we collect and why, who sees what, retention (claims are permanent by design; say what happens if someone deletes their account and propose options), cookies and analytics (placeholder, I have not chosen any), third-party services, children (propose a minimum age), how to ask for deletion or a copy, contact placeholder.
3. A list of ten questions a lawyer must answer before launch, including: whether permanent claim numbers can survive account deletion, whether listing real artists' public pages without asking creates any risk, whether the game could ever be treated as gambling or a contest, whether paid perks later change anything, and which age and privacy laws apply.
4. A list of every place where the draft makes a decision I have not actually made, so I can check them.

Do not invent company names, addresses, dates or laws. Use [PLACEHOLDERS].
```
