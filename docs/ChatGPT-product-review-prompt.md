# Prompt: ask ChatGPT to analyze ClaimedFirst and say what it would build

Paste everything between the two lines into ChatGPT, and attach the files listed inside it. Written 2026-10-02. The files are on Brian's Mac; if ChatGPT cannot open local paths, attach them directly.

---

**READ THIS FIRST (the rules for your answer)**

1. You are a blunt senior product strategist and designer. Do not flatter the idea. Say plainly where the plan is wrong, over-built, or unclear.
2. Use only what is in the files and on the live site. If you cannot open a file, say which one, and do not guess its contents. Do not invent users, numbers, competitors or quotes.
3. Do not submit any form, create an account, make a claim or change anything on the live site. Read and navigate only.
4. Keep every section short. Prefer a table or a numbered list to paragraphs. Maximum about 1,800 words in total.
5. Answer in the order of the Output section below.

**WHAT THIS IS**

ClaimedFirst is a web app (live at https://www.claimedfirst.com, private trial, not publicly launched). People back an artist early and get a permanent claim number, the order they arrived ("I was #7"). It is recognition only: no prizes, no money. It is about AI music artists, and the people who would use it are mostly **AI music creators who are also each other's fans**: this community stays together, and almost nobody in it is "just a fan". The builder, Brian Boyd, is a member of that community and a creator himself. He has said that, as an artist, he would not use it as a social tool for his own music if it were shown to him, and he is not sure the structure is right. He wants an honest outside analysis, not a polish pass.

**FILES TO READ (full paths)**

The idea and the first thinking:
1. docs/virality-and-direction.md
2. docs/ClaimedFirst-overview-for-NotebookLM.md (the plain-English source document that was given to Google NotebookLM to make a podcast, deck and video)
3. docs/_VIDEO-PROMPT.md (the prompt given to NotebookLM for the video)
4. docs/notebooklm-podcast-transcript.txt (what NotebookLM made of it)
5. docs/review-notes-2026-09-30.md

The structure and the rules (the spec is the binding design):
6. docs/spec-v1-design.md
7. docs/design-show-dont-hide.md (the most recent decisions: 3-day claim lock, provisional claims, pending pages, two-column leaderboard, public referral ladder)
8. docs/trial-safety.md (known ways to cheat the rules, and the rules still undecided)
9. docs/design-account-deletion.md

The look and the feel:
10. docs/STYLE-banned-words-and-phrases.md
11. docs/STYLE-visual-direction.md
12. mockups/chatgpt/assets/marketing-page-mockup/index.html (the marketing page)

What a first review of the live site found:
13. report.md (a long UX review of the live site; many of its findings are already fixed)

The build state, if you want it:
14. docs/build-ledger.md

The live site (read only): https://www.claimedfirst.com , including /discover, /leaderboard, /guide, /submit, and an artist page such as https://www.claimedfirst.com/artist/heart . The artists listed there are about 100 real AI music creators, listed as fan-created pages, with Suno profile links.

**OUTPUT (in this order)**

**1. The idea in your own words.** Five sentences or fewer: what it is, who it is for, and the one thing that must be true for it to work. Then one sentence on what you think it is *really* about for a community where everyone is both fan and artist.

**2. Does the idea hold up?** For AI music creators who are also each other's fans: why would anyone use this twice? Name the strongest reason and the weakest assumption. Compare with what creators do today to get noticed and support each other (do not invent specific products; speak in general terms if unsure).

**3. Rule by rule.** Make a table with one row for each rule or mechanism in the spec and the show-dont-hide document (for example: claim numbers, 5 slots, referral steps to more slots, 14-day provisional claims, 3-day claim lock, 30-day wait to re-claim, drops kept as Historical, watchlist, privacy choices per claim and per watch, 3-scout rule to publish an artist, verification by bio code, Founders board, monthly points and leagues, base point and "at risk" column, disputes, 3-day account age). Columns: Rule | What problem it solves | Does it earn its complexity for this audience (yes, no, unsure) | Keep, simplify, or cut | One-sentence reason.

**4. The experience.** Describe, in 10 lines or fewer each, what the first five minutes should feel like (a) for a creator who finds the page about their own music, and (b) for a creator who is invited by a friend. Say what the first screen should be, the one action it should push, and what the user should walk away with. Then list the three screens or flows in the current site that most hurt this, using the live site.

**5. Your decision.** Answer this as if it were your own money and your own time: **"If I handed you this project and you owned the decision, what would you develop?"** Cover:
   a. The product you would actually build, in three sentences. It may be very different from this one. If you would keep the idea and change the structure, say exactly how.
   b. What you would cut, what you would add, and what you would leave alone.
   c. The single measure that would tell you in two weeks whether it is working, and the number or behaviour that would make you stop.
   d. A two-week plan with the smallest test that could show people want it, using about 20 to 50 AI music creators.
   e. The biggest risk, and how you would find out about it cheaply.
   f. Whether you would build this at all, a smaller version, or something different, and why. Give a clear answer.

**6. Questions for Brian.** At most three, only if your answer truly depends on them. Otherwise state your assumption and go on.

---

## How to use the answer

Paste ChatGPT's answer back into the Claude Code session. I will compare it with the spec and turn the points that hold up into a change list; anything that contradicts a decision already made I will bring to you as a question rather than act on.
