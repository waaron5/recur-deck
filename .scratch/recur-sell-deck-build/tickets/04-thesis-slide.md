# 04: Thesis slide from sourced research

**What to build:** Slide 2 becomes the real thesis page. A run researches the target company, writes the three sections — why we're here, why we're excited, how we can help — each with a header and two bullets, and lays them out as three stacked rows: a numbered circle in navy, pale cyan, then teal; the bold section label and header on one line; two square bullets in the section colour. The footer carries the confidentiality line, the Recur wordmark, and the page number. Type is smaller than the prototype's with more negative space, and bold, large type is reserved for the title and section headers.

The sections have fixed roles and cannot drift between them. "Why we're here" is a market or category observation stated as Recur's view. "Why we're excited" is company facts only, every bullet traceable to a source. "How we can help" is Recur proposals phrased as offers, drawn from Recur's go-to-market, product, payments, and AI strengths, and never asserting an unverified weakness of the target. Sources are ranked: the official site first, then the company's own channels, then independent coverage; aggregator estimates are never facts.

This ticket also introduces the structured research object the model fills in and the code consumes — company facts with their sources, and the thesis copy — which ticket 05 extends with competitors and placements and ticket 06 validates. Slide 2's speaker notes pair every bullet with its sources.

Sparse evidence means saying less, not inventing more: all six bullets stay required, but they may stay product-level and category-level.

Decisions this implements: the section roles, evidence standard, source record location, and writing rules in [Define the evidence and investment judgment behind each pitch](../../recur-sell-deck/issues/05-define-investment-judgment.md), and the slide 2 layout and density in [Choose the slide layouts and asset strategy](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md).

**Blocked by:** 01 (Skill package skeleton that delivers a nine-slide deck).

**Status:** ready-for-agent

- [ ] Slide 2 shows three sections, each with a header and exactly two bullets, in the decided layout and colours.
- [ ] Headers stay within 12 words and bullets within 14 words, and the text reads as plain investor English a human would write.
- [ ] Every "why we're excited" bullet is a company fact with at least one source in the speaker notes; no bullet asserts a weakness of the target.
- [ ] Both "how we can help" bullets are offers drawn from Recur's stated strengths and backed by the Recur introduction slides.
- [ ] Text is native and editable, no smaller than about 12 pt, and does not overflow or clip in real PowerPoint.
- [ ] Slide 2's speaker notes pair each of the six bullets with its sources.
- [ ] The structured research object is documented well enough for tickets 05 and 06 to extend and validate it.
