# 09: Practice-set hardening pass

**What to build:** The workflow is tuned against real companies until it holds up, using only the practice set — US Fleet Tracking plus the ten logo-trial companies. The release set is never run here; it exists to test a workflow that was not shaped around it.

Each practice run is judged the way a release run will be: opened in real PowerPoint, checked against the critical-defect list, with facts and competitor choices spot-checked against the sources in the speaker notes. Recurring quality notes are treated as workflow fixes, not as acceptable noise — a generic bullet that keeps appearing means the writing rules or the research brief need work.

The thresholds left open by earlier tickets are settled here against real output: the sharpness threshold that decides when a logo becomes a text wordmark, slide 2's type sizes against the render, stage timings within the run budget, and how broadly the second competitor search should reach. Runs are also timed, since typical runs should come in around ten minutes.

Decisions this implements: the practice-set rule in [Choose the demonstration and fresh-user validation plan](../../recur-sell-deck/issues/08-define-submission-validation.md), and the release-judgment method in [Define first-try success and the release bar](../../recur-sell-deck/issues/04-define-first-try-success.md).

**Blocked by:** 08 (Unattended orchestration and failure behavior).

**Status:** ready-for-human

- [ ] Every practice-set company has been run end to end on the packaged ZIP and judged in real PowerPoint against the critical-defect list.
      _Not startable from a terminal. A run needs the ZIP installed in Claude's
      chat product with web search on, and the judgment needs a person in
      PowerPoint. `scripts/judge-run.js` now does every mechanical part of that
      judgment; the runs and the looking are the human's._
- [ ] Facts and competitor choices are spot-checked against each run's speaker notes, and any mismatch is fixed in the workflow.
      _The notes are now put in front of whoever judges, by slide, without
      opening the notes pane three times. The spot-check itself waits on runs._
- [ ] Recurring quality notes are fixed in the workflow rather than accepted.
      _`practice/practice-log.md` has the table recurrence gets recorded in, and
      it is one file rather than ten so that a note appearing twice is visible
      as appearing twice. Nothing to fix until the runs produce notes._
- [ ] The sharpness threshold, slide 2 type sizes, stage timings, and competitor search breadth are set from observed output and recorded.
      _All four are recorded; **none is yet set from this ticket's observed
      output**, and the log says which is which rather than implying otherwise.
      Sharpness (150) and slide 2's type sizes are inherited measurements from
      tickets 03 and 02, defensible but not re-checked against a real run.
      Competitor breadth has no measurement behind it at all. Stage timings have
      a recording mechanism and no values._
- [ ] Typical run time sits around ten minutes, and no practice run exceeds fifteen.
      _Now measurable rather than guessed at: decision 04's ten and fifteen
      minutes are `RUN_BUDGET.typicalMs` and `limitMs`, and the harness judges a
      run against both instead of leaving it to whoever reads the number. No run
      has produced a length yet._
- [x] No release-set company has been run.
      _True, and true by construction rather than by luck. The practice roster is
      ten fleet and telematics companies; decision 08 excludes that whole sector
      from the release set, so there is no company here that could spend a
      release slot by accident._

## Comments

**Part-built September 17, 2026.** The runs this ticket is mostly made of have
not happened, and could not happen here.

**Why it stops short.** Five of the six criteria need the practice set run end to
end on the packaged ZIP inside Claude's chat product — the Supported host — with
live web search, and each delivered deck opened by eye in real PowerPoint.
Neither is reachable from a terminal session. `render.js` also shells out to
`soffice`, and LibreOffice is not installed on the development machine, so even
step 8's render check cannot be exercised locally. Ticket 08's closing comment
had already put all of this here: "anything that needs a sandbox with the default
allowlist, a real Commons search per rung, a real LibreOffice, or a model
actually following the brief. Those belong to tickets 09 and 11."

Rather than fabricate run results — which would flow straight into the tested-on
table ticket 11 reports to Recur — this builds the two things that make the human
pass cheap, uniform, and measurable.

**The run now times itself.** The interesting number was never the code's. Every
stage the skill ships runs in seconds; the capability probe measured the render
at about two, and a ten-minute run is ten minutes because of what happens between
the stages, where the model is reading sites and choosing competitors. So each
stage records both its own duration and the elapsed time it finished at, and the
gaps between consecutive marks are what a slow run gets diagnosed from. Durations
alone would have accounted for a few seconds out of ten minutes and explained
nothing.

It lives in a file for the same reason the repair budget does: every entry point
is its own `node` process, so a timeline held in memory would be one stage long.
`recordStage` no-ops when no run state exists, because `check-content.js` and
`render-deck.js` are both usable on their own — that is how someone tries the
rules out on copy, or looks at a deck they already have — and timing must not be
the thing that quietly turns an experiment into a started run, handing the next
real run a start time that is not its own.

**The judging harness does the mechanical half and refuses to imply it did the
rest.** `scripts/judge-run.js` prints the structural verdict, the timeline with
the model's time attributed, and the speaker notes carrying every source. Then it
lists the six defects only an eye catches and says to open the file in
PowerPoint. Four of decision 04's six critical defects — invented facts, another
company's logo, a competitor that does not compete, text that is illegible —
cannot be checked by code at all, and a report that printed only the countable
half would read as a pass. It is deliberately not bundled into the ZIP: nobody at
Recur runs a judging pass, and the package stays the six entry points a run calls.

**The practice roster is ten companies, not eleven.** Decision 08 says "US Fleet
Tracking plus the ten logo-trial companies", and ticket 03's ten already include
US Fleet Tracking, so the distinct roster is ten. Recorded in the log rather than
resolved by inventing an eleventh company.

**What the two reviews changed.** A standards and a spec review ran over the
finished work, and the spec review found a real defect.

1. **`fetch-logo.js` was not timed at all.** It is one of the six shipped entry
   points, it is a page fetch plus a download plus a raster, and SKILL.md calls
   it once for the target and again for every competitor on the map — so it is
   potentially the slowest code in a run, repeated up to ten times. Untimed, all
   of it fell into a gap the harness captions as the model's own time, which
   inverts the one distinction the timing exists to draw. It now takes `--work`
   and records itself, and SKILL.md passes it. `--work` rather than inferring the
   directory from `--out`, because a competitor's logo goes to `work/<name>` and
   the run's state does not live there. It records in a `finally`, so a site that
   hangs for thirty seconds and then refuses still reports having spent that
   time instead of donating it to the model's column.
2. **The timing hook was copy-pasted five times.** Identical comment and
   identical arithmetic in five entry points. The starting value genuinely cannot
   be shared across processes, but the shape and the reason can, and now do:
   `stageTimer()` in `run-state.js`, one line per site. Same fix and same reason
   as ticket 08's review extracting `runStateFile()`.
3. **`structure.js` opened the same package twice.** `readNotes` re-derived the
   zip, the presentation part and the slide order that `checkStructure` had just
   derived, and the harness calls both. Extracted as `openDeck`, which returns
   the order as `undefined` for a package with no presentation part so each
   caller still decides what that means — a critical defect to the checker, no
   notes to the reader.
4. **The log's own threshold heading overclaimed.** It read "Ticket 09 settles
   these against real output and records them here" directly above a body
   explaining that three of the four are inherited or deferred. Fixed, because
   that heading is exactly the kind of sentence ticket 11 would later quote.

Not accepted: moving `typicalMs`/`limitMs` out of `design.js` because no runtime
code reads them. They stay next to `cutoffMs`, which is derived from `limitMs` —
twelve minutes is where a new round stops being able to finish inside fifteen —
and splitting them would leave a number in one file and its reason in another.
What was true in the finding is that a reader could not tell which of the three
the run enforces, so the comment now says so outright.

**One thing the harness found on its first run.** `dist/sample/Recur x US Fleet
Tracking.pptx` carries no speaker notes on slides 1-3, which is three critical
defects and no source record at all. It is a gitignored artifact predating
tickets 07 and 08, and `structure.test.js` shows the current generator does write
notes, so there is nothing to fix — but that file is not usable as the submission
example, and ticket 11 should generate a fresh one.

**A path with no timeline, on purpose.** A run whose preflight fails never
creates a run state, so an allowlist-blocked evidence failure records no marks.
Writing state there would hand the next real run a start time taken from a failed
attempt. Decision 08's allowlist behaviour check is timed by observation instead,
and is expected to fail within seconds.

Verified here: 196 tests, typecheck clean, package 18 files with all six entry
points bundled and the harness absent from it, and `judge-run.js` run against a
real built deck. Not verified: anything needing the chat host, a real Commons
search, a real LibreOffice, or a model actually following the brief.

**Ticket 10 is blocked on this one**, and what it is waiting for is the runs — its
tested-on table has nothing to say until they exist.

**September 18, 2026 — the runs happened, and here is what they produced.** The
practice runs this ticket is mostly made of were carried out by the user on the
packaged ZIP and judged by eye in PowerPoint. They are **not** recorded as rows in
`practice/practice-log.md`: the delivered files and their work directories were
not kept, so there is no structural verdict and no timeline to write down. The log
says so plainly rather than carrying numbers reconstructed from memory, and the
first thing the next set of runs should do differently is keep each file and its
work directory. The observations survived; the timings, which are the one thing
tickets 10 and 11 actually need from here, did not.

What the runs did produce is three recurring quality notes, now in the log with
the workflow fix each one asks for. Two became tickets:
[12](12-copy-that-sounds-like-recur.md) rewrites the writing rules around a voice
exemplar drawn from slides 4-9, and [13](13-cover-film-carries-the-logos.md)
lowers the cover film so the wordmarks carry on any photograph. The third — a
cover photograph whose subject is wrong for a sales cover, found on a ServiceTitan
run — was set aside by the user and is recorded as an unimplemented clause of
decision 07 rather than as a ticket of its own.

Decisions 05 and 06 now carry dated amendments describing what changed and why,
including the measurements behind each. This ticket's own criteria are unchanged
and it stays `ready-for-human`: what closes it is still a set of runs with the
delivered files kept.
