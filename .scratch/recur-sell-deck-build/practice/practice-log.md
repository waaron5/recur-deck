# Practice-set hardening log

One file, not one per company, on purpose. Ticket 09 turns **recurring** quality
notes into workflow fixes rather than accepted noise, and a note only looks
recurring when every run sits in one place. Ten separate files would hide the
one thing this log exists to show.

## The practice set

Decision 08 sets it as "US Fleet Tracking plus the ten logo-trial companies".
Those ten, from ticket 03's live trial, already include US Fleet Tracking, so the
distinct roster is ten companies:

| # | Company | Logo outcome in the ticket 03 trial |
| --- | --- | --- |
| 1 | US Fleet Tracking | text wordmark, multicolour mark |
| 2 | Geotab | own logo placed, whitened |
| 3 | Verizon Connect | own logo placed, whitened |
| 4 | Motive | own logo placed, whitened |
| 5 | Force Fleet | own logo placed, whitened |
| 6 | Azuga | text wordmark, multicolour mark |
| 7 | GPS Insight | text wordmark, multicolour mark |
| 8 | Teletrac Navman | text wordmark, multicolour mark |
| 9 | Linxup | text wordmark, multicolour mark |
| 10 | Samsara | text wordmark, too coarse |

**The release set is never run here.** It is Lattice, Shopmonkey, Pool Office
Manager, Dockwa, and Luma Health, plus US Fleet Tracking as the reference, and
the behaviour-check companies Procore and the allowlist run. The practice roster
keeps clear of it by construction: decision 08 excludes fleet and telematics from
the release set, and every company above is in that sector. There is no company
one could run by accident that would spend a release slot.

## Prompt

`Create a Recur sell deck for <Company>`, in a fresh chat, on the packaged ZIP,
with web search on and no URL in the prompt. One run per row.

## How each run is judged

**First, get the work directory out of the sandbox, in the same chat, before
closing it.** The deck comes back on its own — the build writes it to
`/mnt/user-data/outputs`, whose files become downloads. The work directory does
not: the stages run with `--work work`, relative to the sandbox's working
directory, and nothing copies it anywhere. So ask for it:

> Copy the whole `work` directory into `/mnt/user-data/outputs` and give me the
> files.

`work/run-state.json` is the file the timeline is read from. Keep the deck and the
work directory together under `runs/<Company>/`, which is gitignored. **This is
the step that lost the September 17, 2026 runs**, and it is written here rather
than left to memory for that reason.

```
node scripts/judge-run.js --deck "<the delivered file>" --work <the run's work dir>
```

That prints the mechanical half: the structural verdict, where the run's minutes
went, and the speaker notes carrying every source. Then open the deck in real
PowerPoint and judge the six things only an eye can judge, which the harness
lists at the end of its report.

**If the render went blind, copy the lines under it verbatim.** Beneath
`renders that showed nothing:` the report now quotes each converter's own
sentence, indented, one line per attempt, and the `render-deck` mark above it
gives how long that attempt took. Together they are the whole of what
[ticket 05 of the tightening map](../../recur-sell-deck-tune/issues/05-give-the-render-check-its-eyes-back.md)
is waiting for: `soffice is not installed` is a sandbox that cannot render at
all, a line about not finishing within 30s beside a 30-second mark is a
conversion too slow for the deck it was given, and `wrote no PDF` beside a short
mark is soffice running and failing at something else. They call for three
different fixes and nothing else in the run tells them apart.

A critical defect fails the run. Everything else is a quality note and does not.

## Runs

One row per run. `Time` is the total the harness reports, which is the run's own
last recorded mark.

| Company | Date | Time | Fallbacks | Critical defects | Quality notes |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

**Runs happened on September 17, 2026 and produced no rows here.** The user ran
the workflow against several companies on the packaged ZIP and judged the decks
by eye. What came back was recorded as quality notes below, because the
mechanical half was never captured: the delivered `.pptx` files and their work
directories were not kept, so there is no `judge-run.js` report, no timeline, and
no defect list to write down. This log's own rule holds — a row is written from
an actual delivered deck or not at all — so the table stays empty rather than
carrying numbers reconstructed from memory.

For the next set of runs, keep each delivered file and its work directory. The
observations below were the valuable part and they survived; the timings, which
are the one thing tickets 10 and 11 need, did not.

ServiceTitan was among the companies run. It is not on the practice roster above,
and it is not on the release set either, so no release slot was spent.

## Recurring quality notes

A note that appears in two or more runs goes here, with the workflow fix it
asks for. This is the section the ticket is actually about: a generic bullet that
keeps coming back means the writing rules or the research brief need work, not
that the bullet needs rewriting one more time.

| Note | Runs it appeared in | Workflow fix | Fixed in |
| --- | --- | --- | --- |
| Slide 2 and 3 copy reads rote and machine-written. "Now" opened three consecutive sub-bullets; the three headers were alike in length and shape; all six bullets were built to one pattern | Multiple runs, September 17, 2026 | The writing rules are rewritten around a voice exemplar drawn from slides 4–9. Decision 05's sentence-shape mandate is withdrawn, its word, phrase and punctuation lists deleted, and one structural check added in their place | Ticket 12 |
| The Recur wordmark and the company mark do not carry against the cover photograph | Multiple runs, September 17, 2026 | The duotone's highlight end drops to `828F9C`, which holds white type above the reference cover's own contrast on every photograph measured | Ticket 13 |
| The cover photograph's subject is wrong for a sales cover — a ServiceTitan run returned a residential house | ServiceTitan, September 17, 2026 | None. Decision 07 already requires a photo "too somber for a sales cover" to step down a rung, and that clause was never implemented. The user set photo choice aside; see the note appended to decision 07 | Not fixed |

## The four thresholds

Ticket 09 settles these against real output. **Three of the four are not settled
yet**, because settling them takes runs that have not happened. What each one
rests on today is stated plainly, so nothing here reads as decided when it was
inherited from an earlier ticket or deferred to a later one.

**Sharpness threshold — `LOGO.sharpPixelsPerInch`, currently 150.** Grounded in
ticket 03's measurement rather than guessed: US Fleet Tracking's mark trims to
258 x 27px, so at 150px per placed inch it stays sharp to 1.72in wide, which is
0.180in tall.

**Its justification narrowed on September 24, 2026.** What made this number look
well chosen was that one rule gave two slots the outcomes decisions 06 and 10
each asked for: 0.180in was under the cover wordmark's 0.269in so the cover got
type, while on the market map the same mark sized to 1.45 x 0.152in, above that
slot's 0.14in floor, so it stayed a logo. [Decision 01 of the tightening
map](../../recur-sell-deck-tune/issues/01-cover-name-in-the-brands-own-hand.md)
took the logo off the cover, so the cover half of that argument is gone. Only
the map's half remains, and with it a narrower question for the practice runs:
whether any competitor's mark lands the wrong side of 150 — a logo that reads as
soft in PowerPoint, or a clean mark needlessly dropped to type. The number is
unchanged; what it now rests on is one case, not two.

**Slide 2 type sizes.** Already measured off the reference `Slide2.png`
(1300 x 731px, 130 px/in) through `CAP_HEIGHT_EM`, not estimated: the section
header's caps run 0.146in, its bullets' 0.115in, the numerals' 0.246in. The
practice runs check the measurement against real rendered output, where the
question is legibility at print size and whether real copy at real lengths still
fits the boxes those sizes imply.

**Stage timings.** The recording mechanism is built; the values are not in yet,
because no run has produced any. Each of the six stages writes its own duration
and the elapsed time it finished at into `run-state.json`, and the harness prints
the timeline with the gaps between stages attributed to the model. Nothing here
needs a stopwatch, but nothing is measured until the runs happen.

**The mechanism itself was exercised on September 25, 2026** and does print a
report: all six stages drove a fixture run on the development machine and
`judge-run.js` read back six marks, a total against both bounds, and the blind
render this machine's missing LibreOffice produced. What is missing is a run with a
model in it, not a mechanism — the gaps between stages, which are most of a real
run, are the one thing a fixture cannot produce. See
[ticket 04 of the tightening map](../../recur-sell-deck-tune/issues/04-where-the-minutes-go.md).

One path records no timeline at all, by design: a run whose preflight fails
never creates a run state, so an evidence failure caused by the domain allowlist
has no marks to read. That is deliberate — writing state for a run that never
started would hand the next real run a start time taken from a failed attempt.
Decision 08's allowlist behaviour check is timed by observation instead, and it
is expected to fail within seconds.

**Competitor search breadth.** SKILL.md gives a thin field one more search,
"more broadly, including the horizontal platforms buyers visibly compare with
the target", with five placed accepted as a quality note and fewer than five a
critical defect. How broadly that second search should reach is the one
threshold with no measurement behind it yet; it needs the runs that actually hit
a thin field.

## What is blocked, and on what

Five of this ticket's six criteria need real runs on the supported host — the ZIP
installed in Claude's chat product, live web search, and the model doing the
judgment stages. They cannot be produced from a terminal, and no run recorded
here is ever to be written from anything but an actual delivered deck: tickets 10
and 11 report these numbers to Recur.

`render.js` also shells out to `soffice`, and LibreOffice is not installed on the
development machine, so step 8's render check cannot be exercised locally either.
