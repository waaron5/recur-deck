# 13: A cover film that carries the logos on any photograph

**What to build:** The Recur wordmark and the target's mark read clearly on every
cover, whatever photograph sits behind them.

The duotone's highlight end drops to 65% of its value, from `C8DCF0` to
`828F9C`. That is the whole change: one constant, no per-photograph measurement,
no new stage in the run. Lowering the highlight rather than the exposure is what
keeps a dark photograph from turning to mud — it compresses the bright end and
leaves the shadows where they are.

Decisions this implements: the September 18, 2026 amendment to [Choose the slide
layouts and asset strategy through a rough
prototype](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `COVER_PHOTO.highlight` is `828F9C`, with the measurement and the rejected alternative recorded beside it the way the other values in `design.js` are.
- [ ] The cover treatment paragraph in `reference/visual-rules.md` matches the new value, including the mean luminance a real skyline now lands at.
- [ ] A test pins the contrast floor: white type over the treated band clears the reference cover's own 5.83:1 on a bright photograph, not only on a skyline.
- [ ] A cover built from a bright photograph is looked at, and the city still reads.

## Comments

**Written September 18, 2026**, out of a grilling session over the ticket 09
practice runs.

The comment in `design.js` that currently reads "tuned against the reference
rather than by eye: at this value a real 1920px Commons skyline lands at a mean
luminance of about 77" needs replacing, not editing around. It is true of the one
skyline it was measured on and an accident for every other photograph, which is
the whole finding behind this ticket. The amendment to decision 06 carries the
numbers.

Do not turn this into a per-photograph correction. That option was measured, it
works better, and the user rejected it for run time — one fixed value that holds
every time was worth more than matching the reference on every cover. The
accepted cost is that a typical cover now sits deeper than the reference does.
