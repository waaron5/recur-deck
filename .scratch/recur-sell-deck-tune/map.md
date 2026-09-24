# Tighten the run: no text over text, no minutes spent unseen

Labels: wayfinder:map

## Destination

A packaged skill whose delivered decks never carry text over other text, and
whose run finishes inside the 15-minute bar without spending repair rounds on a
renderer that cannot answer. The cover sets the company name as type in the
brand's own written form; the logo path leaves slide 1 and stays on slide 3.

This is a tightening pass on the built workflow, not a redesign. It ends when
the September 2026 practice failures cannot recur.

## Notes

- **This map carries execution.** Wayfinder plans by default; this effort
  overrides that. Each ticket settles its decision *and* lands the change,
  because every one of them is a constant, a rule, or a paragraph of SKILL.md
  sitting in the same file as the decision behind it. A ticket is done when the
  code and the reference prose both say the new thing.
- Parent effort: [the planning map](../recur-sell-deck/map.md) and the
  [build tickets](../recur-sell-deck-build/tickets/). Decisions here amend
  decisions there; say which, in the ticket, the way ticket 13 did.
- Domain language: [CONTEXT.md](../../CONTEXT.md). Canonical brief:
  [task.md](../../task.md).
- Consult grilling and domain-modeling for every ticket here; no ticket in this
  map needs research, because nothing it decides lives outside this repo.
- **Measure, never estimate by eye.** Every number in `design.js` carries the
  measurement that produced it. Hold to that: the reference PNGs in
  `Recur x US Fleet Tracking_vS/` are 1300 x 731px at 130 px/in, so ink can be
  read off them in inches directly.
- Slides 2 and 3 *copy* is out of bounds — see Out of scope. The bullets and
  "Our take" improved in the September 2026 runs and the user has ruled them
  good enough for now.
- LibreOffice is not installed on the development machine, so anything that
  needs a real render is HITL on the supported host.

## Decisions so far

<!-- one line per closed ticket: the gist, then the link -->

- The cover sets the company's name as type in the company's own written form —
  bold white Arial at the reference's cap height and nothing else, from a new
  `writtenForm` field in `run.json` that must be the given name's own letters. The
  logo path leaves slide 1 entirely, taking `COVER.logo`, the top-level `logo`
  block and the dark-ground fit rules with it; logo provenance moves to slide
  3's notes, where the marks now live. Still owed: one of these covers through
  the supported host's own renderer, since the five were looked at under Quick
  Look. [01](issues/01-cover-name-in-the-brands-own-hand.md)
- A box that holds one line is the whole ceiling: `FIT_ALLOWANCE` is deleted
  rather than set to zero, and the gate refuses any line whose Arial advances
  pass its box — the header, both axis names and the subtitle alike. The 4.6-6.5%
  that bought the old 10% was a fact about the reference PNG and not the
  estimate: its slide 2 headers set at about 14.5pt in a face that is not Arial,
  shown by splitting the bold label from the header at the colon and by two
  words that appear on the slide at both sizes. The word limits stay at 12 and
  16 as a readability ceiling, since short words reach them while still fitting
  the box. All three example headers overran and were shortened in SKILL.md and
  the fixture, and a test now runs the gate against SKILL.md's own example.
  Still owed: one built header through the supported host's renderer, since
  nothing here was rendered.
  [02](issues/02-a-header-that-cannot-wrap.md)

## Not yet specified

- **Whether the package's weight is worth chasing at all.** The ZIP is 2.8MB:
  `resvg.wasm` is 2.48MB of it and stays, because it converts the slide 3
  competitor logos that are staying. The other 1.6MB is six 1300 x 731 RGB PNGs
  of slides 4-9 that would requantise to a fraction of that. It is a safe win
  that buys no run time, so it graduates only if
  [Find out where the seven minutes go](issues/04-where-the-minutes-go.md) shows
  upload or unpack time on the critical path.

## Out of scope

- **Slide 2's bullets and slide 3's "Our take" copy.** Both improved markedly in
  the September 2026 runs and read as human-written. Perfecting them is a later
  effort; touching them here risks the one thing that got better.
- **Logos anywhere but the cover.** Slide 3's competitor logos stay exactly as
  they are; the user judges them good. Only slide 1 loses its logo.
- **The cover photograph's subject.** A ServiceTitan run returned a residential
  house. Decision 07 already requires a photo "too somber for a sales cover" to
  step down a rung and that clause was never implemented, but the user set photo
  choice aside; see the note on decision 07 and the practice log.
- **Any change to the deck's layout, type sizes or geometry.** These are
  measured design values. Overflow is repaired by shorter copy, never by smaller
  type or a wider box.
