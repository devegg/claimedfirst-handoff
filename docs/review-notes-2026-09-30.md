# Review notes and decisions, 2026-09-30

Brian reviewed the ChatGPT mockup, the NotebookLM podcast, deck and infographic. These are his decisions.

## Decisions

1. **Mockups:** take the best of both. Use the ChatGPT version (`mockups/chatgpt/ClaimedFirst.html`) as the main reference for page coverage and look, and keep the strengths of ours (`mockups/pages/index.html`): live validation, unexplained slot markers shown in onboarding, desktop two-column layout, the share-card flow (`mockups/share-card-flow/index.html`). When merging, fix the sample numbers so they agree across pages (artist page said 6 claimers, manage page said 1,000) and default watching to anonymous.
2. **The slot-marker secret:** keep it for some time, but not forever. Markers at 5, 10, 20, 30 and 50 stay unexplained until people are sharing the secret and others are searching for it. At that point, reveal the ladder. Until then, public material should not spell out the thresholds. (The NotebookLM files already do, so they are private idea material only.)
3. **Podcast:** accurate to the spec. The founder's name is correct in the audio. The hosts use words like "investment" and "capital" as metaphors, which Brian accepts because the game itself clearly isn't a trading game. The closing idea, that bots or AI agents might one day play the game better than humans, is worth keeping as a real future risk.
4. **Slide deck and infographic:** idea material only, not for presenting. Known flaws (page 12 says "Figma", page 5 shows "5/5", the infographic's loop repeats "Claim Artist") are not worth fixing unless they are shared. Regenerate in NotebookLM only if that changes.
5. **Insight:** an artist is a kind of curator. Verified artists choose their Top Songs, and the audience they attract is a curated taste. Worth keeping in mind for artist-side features and for how the product is described.
6. **Status:** Brian wants to develop this but is sleeping on it.

## Next

A design brief and prompt for a short promotional video are in `docs/video-brief-and-prompt.md`, ready for when Brian has video credits.
