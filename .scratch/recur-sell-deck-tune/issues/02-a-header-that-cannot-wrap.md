# Make the single-line fit check exact, so a header cannot wrap

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: prototype
Labels: wayfinder:prototype
Mode: HITL
Status: open
Assignee: unassigned
Blocked by: none

## Question

Slide 2's three headers wrapped in the September 2026 runs, and the wrapped word
landed on top of the bullets underneath. What ceiling makes that impossible?

**The mechanism, in full.** `content-gate.js:132` sets `FIT_ALLOWANCE = 0.1`:
the gate passes any line estimated up to 10% wider than its box. The header's box
is `w: 7.2in, h: 0.3in` with `valign: middle` and no wrap guard
(`deck.js:380`), and the first bullet's ink centre sits 0.25in below the
header's. So a header that needs a second line gets one, centred, and it spills
onto bullet 1. Run the gate's own measurer against the three example headers in
`SKILL.md` and all three are over the box and all three pass:

| header | words | estimate | box | over by |
| --- | --- | --- | --- | --- |
| `here` | 8 | 7.55in | 7.20in | 4.9% |
| `excited` | 10 | 7.80in | 7.20in | 8.3% |
| `help` | 10 | 7.82in | 7.20in | 8.6% |

The 12-word limit never binds: 12 words measures about 11in. Worse, those three
are the examples the model is shown, so the skill teaches the overrun.

**The rule the user wants is "no overflow", not a word count.** One failing
header was 10 words with the tenth hanging over; another was 8 words with the
eighth hanging over. A word cap cannot express that, and a width measurement
already can.

**The unsettled number, and the lead on it.** The comment at
`content-gate.js:118` records that the estimate ran wide by 4.6%, 6.1% and 6.5%
on these three lines against 0.4-2.2% everywhere else, and says plainly that why
was never settled, "the header text could not be split from its label on the
reference PNG". That is the number to nail, because with the allowance at zero it
is the whole difference between nine words fitting and seven. The lead: on
`Slide2.png` (130 px/in) the longest reference header runs from x 181px to about
x 1110px — roughly 7.15in of ink inside a 7.2in box. So the box width is right
and the estimate is what is off; the label *is* splittable, because it is bold
and ends in a colon.

Settle:

- **Why the mixed bold-and-regular line estimates ~5-6% wide**, measured off
  `Slide2.png` by splitting the bold label from the regular header at the colon.
  An advance sum should be a tight upper bound on ink, and 5-6% is far more than
  one trailing right-side bearing explains.
- **The ceiling for a box that cannot grow.** Zero allowance, or a small negative
  one? A single-line box with bullets 0.25in beneath it is not the same risk as a
  box with room under it, so the allowance may need to be per-box rather than one
  constant. Firing early costs one content round of the three; firing late costs
  a founder seeing text over text.
- **Whether the word limits survive at all** now that width is authoritative, or
  stay as a cheap backstop with `header` dropped from 12 to something that
  actually binds.
- **Which other boxes are single-line and hard-wrapped.** The header is the one
  that was caught. The market map's axis names and side labels take the header's
  limits too (`content-gate.js:795-811`); the same reasoning applies to them.
- **The three examples in SKILL.md**, which must be rewritten to headers that
  pass the new ceiling. Leaving them is the fastest way to reintroduce this.

Amends the header limit in [Define the evidence and investment
judgment](../../recur-sell-deck/issues/05-define-investment-judgment.md) and the
fit rule built in [the content gate](../../recur-sell-deck-build/tickets/06-content-gate.md).

**Done when** the gate rejects every header that would take a second line in
PowerPoint, the reason the estimate ran wide is written beside the new constant
the way `design.js` records its other measurements, SKILL.md's examples pass
their own check, and a test pins a header at the ceiling and one word past it.
