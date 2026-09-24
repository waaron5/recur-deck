# Find out where the seven minutes go

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: task
Labels: wayfinder:task
Mode: HITL
Status: open
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
   that failed last time and the only reason the ticket exists.
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
