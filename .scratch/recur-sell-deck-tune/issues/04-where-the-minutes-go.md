# Find out where the seven minutes go

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: task
Labels: wayfinder:task
Mode: HITL
Status: claimed
Assignee: unassigned
Blocked by: 01, 02, 03

## Question

Nothing to decide here. A run has to happen on the supported host and its work
directory has to survive, so the next decision about speed is made from a
timeline instead of a guess.

**Why this is blocked on the other three.** Roughly four of the seven minutes
went to two render timeouts, which ticket 03 removes. Measuring before that
lands would mostly measure a hole that is already being filled.

**Why it is a ticket and not an assumption.** The recording mechanism is already
built — each of the six stages writes its own duration and finishing mark into
`run-state.json`, and `scripts/judge-run.js` prints the timeline with the gaps
between stages attributed to the model. It has never produced a number, because
the September 17 runs' delivered files and work directories were not kept. The
practice log says so plainly, and names these timings as the one thing tickets
10 and 11 still need.

**The checklist:**

1. Fresh chat on the packaged ZIP, web search on, domain allowlist set to All
   domains, prompt `Create a Recur sell deck for <Company>` with no URL.
2. **Keep the delivered `.pptx` and the whole work directory.** This is the step
   that failed last time and the only reason the ticket exists, so it now has a
   mechanism rather than an intention: the work directory has to be asked out of
   the sandbox in the same chat, before the chat is closed, because nothing copies
   it anywhere and the deck's own handback does not carry it. The wording to send
   and the reason it is needed are in
   [`practice-log.md`](../../recur-sell-deck-build/practice/practice-log.md), under
   "How each run is judged", which is where the next person judging a run will
   already be looking.
3. `node scripts/judge-run.js --deck "<the delivered file>" --work <the work dir>`
4. Write the row into
   [`practice-log.md`](../../recur-sell-deck-build/practice/practice-log.md) —
   time, fallbacks, critical defects, quality notes — and the stage timeline
   under the "Stage timings" threshold, which currently reads "the values are not
   in yet".

**What it unblocks.** Whether anything else about run time is worth chasing at
all, and whether the 1.6MB of slides 4-9 PNGs sitting in "Not yet specified"
graduates into a ticket.

**Done when** `practice-log.md` carries a real row and a real stage timeline
from a run whose work directory still exists.

## Comments

### Groundwork, September 25, 2026

Everything that does not need the host is done; what is left is the run itself.

**The recording mechanism was exercised end to end and does produce a report.**
It had never once been run through — every timing test in the suite writes
`run-state.json` by hand, so a stage that had stopped recording, or that wrote a
shape the harness could not read, would have left the whole suite green and shown
up only as an empty TIMING section on the day the run happened. It was checked by
driving the shipped bundle's own entry points against a fixture run on this
machine. Stage 0 reached the network and passed; the logo fetch was pointed at a
dead port on purpose, so it is a stage that spent time and got nothing; and there
is no LibreOffice here, so the render went blind, which is decision 03's path.
Then judging what they wrote:

```
TIMING
        1s  start-run         1.3s
        2s  fetch-logo        38ms
        2s  check-content     13ms
        2s  build-deck       352ms
        2s  render-deck        6ms
        2s  reply              1ms

  2s total — within the 15-minute limit, and inside the 10-minute typical
  1.7s of that was code; the rest is the model researching and judging
  renders that showed nothing: 1 — this deck went unseen
```

Six stages, six marks, a total, and the blind render named. The numbers are
meaningless — there is no model in this loop, so there are no gaps — but the
shape is the shape a real run will print, and nothing in the mechanism is
waiting to be discovered on the host.

**That seam is now held by a test**, for five of the six stages.
`test/stage-timing.test.js` drives the bundled entry points and asserts each one
appears in the harness's timeline; removing one `mark()` call fails it by name. It
seeds stage 0's state file rather than running `start-run.js`, because that stage
probes the network and a timing test that needed the network would fail offline
for a reason that is not timing. So `start-run`'s own mark is exercised by the dry
run above and not guarded by the suite — the one thread left loose here, and worth
knowing if that line ever goes missing from a real timeline.

**The package was rebuilt**, so the ZIP to install carries decisions 01-03:
`dist/recur-sell-deck.zip`, 19 files, 2888 KB.

**Still owed, and only obtainable on the host:** the run. It is HITL by
construction — the ZIP installed in Claude's chat product, live web search, and
the model doing the judgment stages. No row is written here or in the practice
log from anything but a delivered deck.
