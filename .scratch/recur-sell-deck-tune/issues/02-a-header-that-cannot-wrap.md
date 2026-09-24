# Make the single-line fit check exact, so a header cannot wrap

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: prototype
Labels: wayfinder:prototype
Mode: HITL
Status: resolved
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


## Answer

**The ceiling is the box. `FIT_ALLOWANCE` is gone rather than set to zero, and
the fit rule is what prevents a wrap; the word limits stay, as a limit on
reading rather than on width.** Not one allowance per box either: a box that
holds more than one line already says so through its `lines` field, and the
allowance was only ever measurement slack. With the answer exactly zero there
was no constant left to name — `box.width * (1 + 0)` would have read to the next
maintainer as though slack still existed, which is the misreading this ticket
exists to kill — so the measurement below lives on `checkFit`, where the rule
is.

### Why the estimate ran 4.6-6.5% wide: it did not

The label *is* splittable. On `Slide2.png` the colon is the narrow two-dot glyph
run each label ends on — x 368-371, 401-405 and 386-390 on the three rows — so
each line divides into bold label and regular header and each half can be
measured on its own. Against Arial at the declared 15pt:

| row | label ink vs Arial Bold | header ink vs Arial |
| --- | --- | --- |
| `here` | 8.7% under | 4.8% under |
| `excited` | 8.4% under | 6.7% under |
| `help` | 9.2% under | 6.9% under |

Both halves short, and the bold half shorter on every row. One trailing side
bearing cannot do that, and two things are doing it — neither of them the
estimate.

**The row is not set at 15pt.** Two words appear on slide 2 at both sizes, once
in a header and once in a bullet. Their ink runs 130px to 103px
("commercial") and 62px to 49px ("fleets"): ratios of 1.262 and 1.265, where
15pt over 11.5pt implies 1.304. The headers set at about 14.5pt. `design.js`
derived 15 from a measured cap height through `CAP_HEIGHT_EM` and rounded up,
while the bullets' 11.5 was rounded down from 11.73 — which is exactly why the
bullets and the title looked accurate to 1-2% and the headers did not.

**The reference's Latin is not Arial.** Slide 2's `a`, `c`, `e` and `t` are not
Arial's letterforms, though the cover's "USFleetTracking" plainly is Arial Bold;
the reference deck mixes faces. Its regular weight sits close enough to Arial's
advances that the bullets and the title matched. Its bold does not. Re-measured
at 14.5pt the regular headers land 1.3-3.4% wide — the ordinary
ink-stops-short-of-the-advance bias, which grows with the number of words on the
line — while the bold labels stay 4.8-5.6% wide on all three rows. Only a line
mixing the two weights could ever have shown it.

So 4.6-6.5% is a fact about the reference PNG, not an error bar on the estimate.
`scripts/derive-font-metrics.js` recorded "bold section label: Arial implies
15.10pt" as one of its four clean samples; that sample does not reproduce and
the comment beside `FIT_ALLOWANCE` now records what does.

### What the estimate is actually an upper bound on

This deck ships Arial, declared in `design.js` since ticket 07. PowerPoint and
LibreOffice both break an Arial line at the point its advance sum passes the
box, and that sum is precisely what `textWidth` returns. The only difference
between the two is pair kerning, which can only pull glyphs together. There is
nothing left for an allowance to cover, so it is zero.

**The old comment's argument for firing late is backwards.** It read: "firing
early would spend a repair round on every run, because the reference deck's own
headers estimate over their box." Set in Arial at 15pt those headers measure
7.51in, 7.34in and 7.32in against a 7.2in box. They do not overflow *on the
reference* because the reference is set in a narrower face at a smaller size;
re-set the way this deck sets type, all three wrap. The fixture and SKILL.md
headers were shortened to fit rather than the ceiling raised to admit them.

### The word limits survive, both of them, unchanged

They are a readability ceiling and not a fit rule, and with the allowance at
zero that division is what earns them their place. Neither rule covers the
other, because which one fires depends on how long the words are:

- Twelve words of ordinary length measure about 11in and the box stops them
  first — the case the ticket found.
- "The way these fleets buy has not yet caught up" is ten words in 4.35in of a
  5.55in line. A founder meets the length before the box does. Fifteen short
  words sit in 4.5in of a 7.01in bullet column the same way.

So decision 05's amendment was right to keep 12 and wrong about why: "the fit
estimate binds first and the number never does" holds for long words only. The
comment on `LIMITS` says so now.

### The other boxes that cannot grow

The header was the one that was caught, not the only one. Everything
single-line tightened with it, since they all run through the same constant:

- **Both axis names**, set uppercase and tracked in a 0.16in box, centred. The
  y axis's is the tight one — "Fleet segment focus" fills 1.2073in of a 1.2375in
  gutter — and it sits one line above the "SMB commercial fleets" category
  label, so a wrap lands on that label exactly as a wrapped header lands on
  bullet 1. The x axis's box is 4.99in and no plausible name reaches it.
- **The market map's subtitle**, one line in a 0.26in box under the title.
- **The four category labels** already declare `lines: 2`, which is the box
  they are drawn in; they are unaffected except that the two lines are now
  measured against the true width.
- **The callout** is measured as a block against its sidebar height, and its
  wrap width lost the same 10%.

The reference fixture passes all of them at zero. Only the three headers failed.

The market map's labels also keep `kind: 'header'`, so they inherit the 12-word
cap. **That is left as it was, and it is worth saying why rather than leaving it
to be found:** on boxes this narrow a word count cannot bind — the y axis's name
has 1.2375in of gutter and "Fleet segment focus" already fills 1.2073in of it at
three words — so the cap only supplies the wording of a finding that width will
always raise first. `marketMapFields` says so now.

### What was changed

- `content-gate.js`: `FIT_ALLOWANCE` deleted, from both call sites and the
  export, with the measurement above written onto `checkFit`; the `LIMITS`
  comment corrected; `marketMapFields` told why slide 3's labels keep the
  header's word cap.
- `derive-font-metrics.js`: its fourth sample, "bold section label: Arial
  implies 15.10pt", no longer stands as corroboration. The conclusion does —
  the deck declares Arial and these are Arial's numbers — but the claim that the
  reference's own bold agreed with them does not reproduce.
- `check-content.js`: its illustrative finding switched from `word-count` to
  `fit`, to match SKILL.md's.
- `test/helpers.js` and `SKILL.md`: the three example headers, which were the
  ones the table in this ticket showed overrunning. They now sit at 89-93% of
  their line. A fourth header was shortened with them — the one in the
  every-problem-at-once test, at 5.95in of 5.55in — because that test is about
  several rules reporting together and a fit finding would have tied it to this
  rule.
- `SKILL.md`: the one-line rule replaced by a paragraph that says a header has
  one line, what sits under it, and that the bold label counts against the
  width; the example finding switched from `word-count` to `fit`, since that is
  the rule a run will actually meet.
- Tests: a header at the ceiling and one word past it, an axis name 2.5% over
  its gutter (inside the old allowance), and a check that runs the gate against
  SKILL.md's own example — because leaving those examples unguarded is the
  fastest way to bring this back.

### One more number in the question above that does not hold

The question's own framing says "The 12-word limit never binds: 12 words
measures about 11in." Twelve words of ordinary length measure 8.34in, not 11in;
11in is nearer sixteen. It makes no difference to the conclusion — 8.34in still
overruns a 5.55in line — but the figure is not one to carry forward, and the
comment on `LIMITS` quotes a measured string instead.

### Still owed

**One of these headers through a real renderer.** The arithmetic says a 7.51in
line of Arial advances wraps in a 7.2in box, and LibreOffice is not installed
here, so nothing in this pass was rendered. It costs one run on the supported
host to confirm, alongside the cover that ticket 01 still owes.
