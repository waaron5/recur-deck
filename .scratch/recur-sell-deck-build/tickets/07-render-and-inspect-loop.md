# 07: Render and inspect loop

**What to build:** No deck is delivered unseen. After the file is built, the run renders slides 1–3 to images inside the sandbox and the model looks at them, checking for text that overflows, is clipped, overlaps something, or is illegible, and for logos that landed wrong. What it finds goes back as a text fix — shorter copy, never smaller type — and the slide is rebuilt and re-rendered.

The build also gets its structural check before rendering: exactly nine slides, slides 4–9 present and in order, speaker notes present on slides 1–3, and the file reopens cleanly after being written.

The rendering toolchain substitutes metric-compatible fonts for the deck's typeface, which is why the deck is built in a typeface those substitutes match: the rendered image predicts where PowerPoint will break lines. Rendering takes about two seconds, so this is a routine part of every run, not an exception.

Decisions this implements: stages 6 and 7 of [Define unattended generation and failure behavior](../../recur-sell-deck/issues/07-define-unattended-run.md), the render-check availability established in [Verify the selected account's execution and file capabilities](../../recur-sell-deck/issues/09-verify-account-capabilities.md), and the render-check-last collision rule in [Choose the market-map chart treatment](../../recur-sell-deck/issues/10-prototype-market-map-chart.md).

**Blocked by:** 05 (Market map slide).

**Status:** ready-for-agent

- [ ] Every run renders slides 1–3 and the model inspects the images before the file is offered.
- [ ] Overflowing, clipped, overlapping, or illegible text is detected and fixed by shortening copy, with type sizes unchanged.
- [ ] Structural checks fail the build when the deck is not exactly nine slides, when slides 4–9 are missing or out of order, or when slides 1–3 lack notes.
- [ ] A deck with a deliberately overlong bullet is caught by the inspection and comes out clean after repair.
- [ ] The rendered image matches what real PowerPoint shows closely enough to trust, confirmed by opening the same deck in PowerPoint.
