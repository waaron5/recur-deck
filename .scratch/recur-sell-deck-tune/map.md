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
  3's notes, where the marks now live. A cover was rendered through the supported
  host's own renderer on September 25, 2026 and read correctly, which is what the
  five looked at under Quick Look could not settle.
  [01](issues/01-cover-name-in-the-brands-own-hand.md)
- A box that holds one line is the whole ceiling: `FIT_ALLOWANCE` is deleted
  rather than set to zero, and the gate refuses any line whose Arial advances
  pass its box — the header, both axis names and the subtitle alike. The 4.6-6.5%
  that bought the old 10% was a fact about the reference PNG and not the
  estimate: its slide 2 headers set at about 14.5pt in a face that is not Arial,
  shown by splitting the bold label from the header at the colon and by two
  words that appear on the slide at both sizes. The word limits stay at 12 and
  16 as a readability ceiling, since short words reach them while still fitting
  the box. All three example headers overran and were shortened in SKILL.md and
  the fixture, and a test now runs the gate against SKILL.md's own example. Built
  headers were rendered on the supported host on September 25, 2026 and none
  overflowed. [02](issues/02-a-header-that-cannot-wrap.md)
- A render that cannot answer is a **blind render**: 30 seconds per converter
  instead of two, so a sandbox that cannot render costs 1-2 minutes where it cost
  2-4; no repair round; and after two of them the deck ships **clean** with
  `Fallbacks: no visual check (the renderer did not answer)`. Charging a round
  for a render that produced no image was charging for a repair that could not
  happen — it is what left the September run unseen and out of budget at once —
  so `run-state.js` splits asking a round (`mayRender()`, mutating nothing) from
  recording one (`noteRound()`), and the render check asks before it spawns and
  pays only once images exist. The two refusals now name their cause, because
  they call for opposite things: out of rounds still means a flagged deck, out of
  blind renders means a clean one. `reply.js` is untouched — the run records that
  a render answered nothing and that one answered, and the phrase is derived from
  those, so the line cannot be forgotten and cannot be retracted by a later
  render that works. The promise is restated, not dropped: **every deck is looked
  at, and a deck that could not be looked at says so** — the fit half of it went
  to the content gate in 02. The 30s bound was measured against a real cold
  LibreOffice start on the supported host and has ten times the headroom it
  needs — see 05, which found that what hung the September run was never a slow
  start. [03](issues/03-eyes-that-fail-cheap.md)
- No timeline was ever captured, and the record says so rather than implying
  otherwise. Two runs happened on the supported host; neither work directory
  landed in this repo, and the first was made with the broken package anyway, so
  its minutes would have measured a bug rather than a workflow. `practice-log.md`
  still reads "the values are not in yet" under Stage timings, which is true. The
  package-weight question stays unanswered and ungraduated, below. Closed because
  the effort is shipping, not because the question was answered.
  [04](issues/04-where-the-minutes-go.md)
- **The render check works on the supported host, and never failed for any of the
  reasons the ticket proposed.** Not the deck's weight, not the private profile,
  not the 30-second bound. `render.js` built LibreOffice's profile argument by
  concatenating `file://` with a path the run supplies, so the documented
  invocation - `--out work/render`, relative - asked for a profile on a machine
  called `work`: a `file:` URL reads what follows its two slashes as a host name.
  LibreOffice does not refuse that, it waits, and the bound kills it. An absolute
  `outDir` starts with a slash and so is correct by accident, which is why decision
  09's probe, the whole suite and this ticket's own dry run never saw it. Measured
  on the host: about 3 seconds cold and 1 warm, so the private profile costs about
  two seconds and stays, and the resvg route set aside in grilling stays set aside.
  `pathToFileURL` from an absolute path, and the test drives a relative `outDir`
  because the absolute case was always passing.
  [05](issues/05-give-the-render-check-its-eyes-back.md)
- A refused render is told to flag a deck only when the run has looked at one.
  `whatToDoInstead` now reads the round count rather than the cause: a render round
  is spent only once a converter answered, so `round: 0` is a run that looked at
  nothing and repaired nothing, and there is nothing for a flag to be about -
  whether the clock, two quiet converters or a cutoff crossed before the first
  render refused it. `decide`'s ordering is untouched. Amends decision 03.
  [06](issues/06-a-slow-run-that-went-blind-is-still-flagged.md)
- The cover holds one line of printable type, under a rule of its own in
  `design.js` rather than the filename rule - a written form may legitimately carry
  a slash. Runs of whitespace collapse to one space, because decision 01 already
  lets the cover restyle spacing and a masthead set across two lines becomes the
  one line the slot holds. A control character is reported by the gate and stripped
  by the cover, because it cannot be restyled into anything and a flagged build
  skips the gate's refusal by design - a file PowerPoint will not open is the one
  outcome no exhausted budget should be able to produce. Amends decision 01.
  [07](issues/07-the-written-form-reaches-the-cover-unexamined.md)

## Not yet specified

- **Whether a mark that cannot be read on the pale band may be placed.** Decision
  01 deleted the background-fit gate, reasoning that the market map's band is the
  only ground a logo lands on and a company's own version is drawn for it. The
  September 25, 2026 ServiceTitan run disproved the second half: companies draw
  white logos for their own dark sites, and Service Fusion's and BuildOps' marks
  came back near-invisible on `E2EEF8`. The remedy is not recolouring — decision 01
  was right about that — but the terminal fallback the map already has. Nothing in
  the package measures a mark's contrast against the band, so this is judged by eye
  or not at all. Would amend decision 01.
- **Whether the one-third wordmark rule should be enforced rather than asked for.**
  `SKILL.md` says to swap in an equally eligible alternate if more than about a
  third of the competitors would be text wordmarks. No code counts them: the
  September 25 run set eight of eight companies as type and passed the content
  gate, shipped clean, and said nothing in its `Fallbacks:` line. The rule that
  would have caught that run's doubled logo path sits in prose in the same file as
  the instruction that went wrong.
- **Whether a logo with no ink is a logo.** `normaliseLogo` returns a fully
  transparent PNG untrimmed at full size rather than reporting it empty, so it
  clears the resolution and minimum-height gates and `chooseMark` is never told
  there is nothing to see. ServiceTitan's fetched mark was blank and the model
  caught it by eye; had it recorded `verified`, slide 3 would have
  placed an invisible rectangle and called it a logo.
- **Whether the package's weight is worth chasing at all.** The ZIP is 2.8MB:
  `resvg.wasm` is 2.48MB of it and stays, because it converts the slide 3
  competitor logos that are staying. The other 1.6MB is six 1300 x 731 RGB PNGs
  of slides 4-9 that would requantise to a fraction of that. It is a safe win
  that buys no run time, so it graduates only if a stage timeline shows upload or
  unpack time on the critical path. [Ticket 04](issues/04-where-the-minutes-go.md)
  was to produce that timeline and closed without one, so this is unchanged: it
  waits on the same measurement it always waited on.

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
