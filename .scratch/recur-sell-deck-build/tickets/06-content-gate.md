# 06: Content gate

**What to build:** Copy that breaks a rule is caught and rewritten before anything is rendered, so the deck that reaches a founder reads like a human wrote it. Deterministic code checks everything countable and the model judges what code cannot.

Code checks: word counts for headers and bullets; the banned list of AI-sounding words and patterns; forbidden punctuation; digits that have no matching source entry; the company's name spelled correctly; notes completeness, so every thesis bullet, every competitor, and both axes have a source entry; and the market-map distribution, capping any one quadrant and requiring at least three quadrants to hold a competitor. Code also estimates text fit before rendering, predicting line wraps from the bundled font metrics that match the deck's typeface.

The model then makes one judgment pass over tone, the swap test (would this bullet still read true with another company's name?), and whether each claim actually matches its source. It rewrites only the fields that fail.

A failure here is repaired with words, not pixels: type sizes are fixed design values, and text that does not fit gets shorter. The repair budget and what happens when repairs run out belong to ticket 08; this ticket builds the gate and its rewrite path.

Decisions this implements: the writing rules and the enforcement split in [Define the evidence and investment judgment behind each pitch](../../recur-sell-deck/issues/05-define-investment-judgment.md), the crowding cap in [Choose the market-map chart treatment](../../recur-sell-deck/issues/10-prototype-market-map-chart.md), and the stage 4 and 5 ownership in [Define unattended generation and failure behavior](../../recur-sell-deck/issues/07-define-unattended-run.md).

**Blocked by:** 04 (Thesis slide from sourced research), 05 (Market map slide).

**Status:** ready-for-agent

- [ ] Copy that exceeds a word count, uses a banned word or pattern, or uses forbidden punctuation fails the gate and is rewritten before the deck is built.
- [ ] A number with no matching source entry fails the gate; so does a thesis bullet, competitor, or axis with no source entry in the notes.
- [ ] A market map crowding too many companies into one quadrant, or using fewer than three quadrants, fails the gate and is fixed in the content, not at render time.
- [ ] The pre-render fit estimate predicts the wraps that the real render then shows, so overlong text is caught before rendering.
- [ ] The model's judgment pass runs after the code gate passes and rewrites only failing fields.
- [ ] Repairs shorten text and never shrink type.
- [ ] A deliberately bad research object is demonstrably caught by each class of check.
