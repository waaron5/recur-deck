# 08: Unattended orchestration and failure behavior

**What to build:** One company name goes in and one outcome comes out, with no question ever asked of the user. The pieces built so far become a gated pipeline: preflight, identify, research and choose, assets, content gate, judgment review, build, render and inspect, deliver. Each stage passes a deterministic code gate before the model spends effort on the next.

The run handles the awkward cases on its own. **Preflight** does one test download from a non-package host and stops within seconds if the sandbox's domain allowlist blocks it, telling the user exactly which setting to change. **Ambiguous names** are settled by a URL in the prompt, then by other hints in it, then by preferring a private software business with its own site, with the rejected candidates and why each lost recorded in slide 1's notes. **The evidence floor** requires the product and the buyer to come from the company's own material, or from two independent agreeing sources when its site is unreachable or an empty shell. **The landmark ladder** steps from a landmark in the headquarters city, to that city's skyline, to the nearest major metro, to a regional landmark, moving down a rung for a watermarked, too small, or too somber photo. **Competitors** get one broader second search when the field is thin, five placed is accepted, and fewer fails.

Repairs are bounded: up to three content rounds and two render rounds, each touching only the failing fields, and no round starts after about twelve minutes of elapsed time, which keeps runs inside the fifteen-minute limit.

Three outcomes, each with a short fixed reply of about six lines and no progress narration in between. A **clean deck** downloads with the company and headquarters named, the ambiguity assumption if there was one, and a fallbacks line if any ladder was used. A **flagged deck** downloads with "NOT READY" in its file name and the remaining defects listed by slide, with nothing added to the slides themselves. An **evidence failure** delivers no deck at all, only what could not be established, what was tried, and the fix to try next. A target outside the covered scope runs the same pipeline and adds one line saying so.

Decisions this implements: [Define unattended generation and failure behavior](../../recur-sell-deck/issues/07-define-unattended-run.md), with the run definition and critical-defect list from [Define first-try success and the release bar](../../recur-sell-deck/issues/04-define-first-try-success.md).

**Blocked by:** 06 (Content gate), 07 (Render and inspect loop).

**Status:** ready-for-human

- [ ] A run never asks the user a question; a clarifying question is treated as a failure of the run.
      _SKILL.md opens with it, and every awkward case below it has a decided
      answer, so there is nothing a run needs to ask about. Whether a run obeys
      is a question only the real runs of tickets 09 and 11 can answer._
- [x] With the domain allowlist at its default, the run stops within seconds as an evidence failure and names the exact setting to change.
      _Not reproducible here: a sandbox actually set to "Package managers only".
      What is verified is the behaviour that setting provokes - a refused domain
      never opens a socket, so it is told apart from a host answering badly, and
      only the first carries the allowlist fix._
- [ ] An ambiguous company name resolves without asking, states the assumption in the chat reply, and records the rejected candidates in slide 1's notes.
      _The notes half is verified: `rejected` reaches slide 1's speaker notes and
      not the cover. The ranking order is SKILL.md's, and the `Assumed:` line is
      emitted by `reply.js --assumption`, so both wait on a real run._
- [ ] A company whose site is unreachable or an empty shell either passes on two independent agreeing sources, with the reply saying so, or fails as an evidence failure with no deck.
      _Entirely the model's judgment. The evidence floor is step 1 of SKILL.md;
      no code can tell a JavaScript shell from a thin page._
- [ ] Each ladder is exercised and produces its decided outcome, with fallbacks named in the reply and quality-note rungs recorded.
      _The landmark ladder is built and tested - four rungs in decision 07's
      order, a rung that finds nothing steps down, and the bottom two name
      themselves as fallbacks. `build-deck.js` records the fallback, `reply.js`
      reads it back, and slide 1's notes carry it so the deck says which rung it
      settled for after the reply is gone. **Two gaps stay open.** Only the
      landmark reaches the `Fallbacks:` line: competitor and cover wordmarks are
      counted nowhere, so decision 07's own example - "2 competitor wordmarks,
      metro landmark" - is half prose. And the ladder steps down only when
      Commons returns nothing usable by width; "watermarked... or too somber"
      is a judgment made by eye, and nothing lets a run resume at a lower rung
      after rejecting a photo it has already downloaded. The logo and competitor
      ladders stay prose throughout._
- [x] Repairs stop at three content rounds and two render rounds, and no round starts after about twelve minutes.
      _The two stages refuse differently, on purpose. `render-deck.js` throws
      before starting a converter, because it has nothing to show for a render it
      will not run. `check-content.js` still prints its findings and exits
      non-zero, adding `budgetSpent` and an `advice` line, because those findings
      are exactly what the flagged deck's reply has to list._
- [x] A surviving critical defect produces a flagged deck named accordingly, with the defects listed by slide and nothing added to the slides.
- [x] Each outcome's reply matches its fixed template and stays short; the run does not narrate progress.
      _The three templates are built by code rather than composed, so they cannot
      drift. That the model runs `reply.js` instead of writing its own reply is
      still a run-time question._

## Comments

**Built September 17, 2026.**

The pieces built by tickets 01-07 were already a pipeline; what this adds is the
run around them - a stage 0, a budget the stages share, a ladder for the cover
photo, and one fixed thing to say at the end.

**The budget is enforced, not described.** Three content rounds, two render
rounds, and no new round after twelve minutes. The limits only mean something
across processes: every entry point the skill ships is its own `node`, so a
counter held in memory would report "round 1" three times over and bound
nothing. `run-state.js` keeps the count in `run-state.json` beside the run file,
and the stages spend from it - `check-content.js` takes a content round whenever
it has findings to repair, and `render-deck.js` takes a render round before it
starts a converter. A gate that passes costs nothing, because a budget bounds
rewriting and copy that came out right never asked to rewrite.

The start time is written at stage 0 and never rewritten. A run that recorded its
own start at the build would measure the twelve minutes from a point most of the
way through itself, and the cutoff would never once fire.

**Preflight probes the real dependency.** One request to Wikimedia Commons, which
is where the cover photo comes from, rather than to a generic canary that would
answer a question like the one a run has instead of the one it has. It separates
two failures that look alike from inside a run: a domain the allowlist refuses
never opens a socket, so `fetch` rejects, while a host that is reachable and
unhappy answers with a status. Only the first gets the allowlist fix, because
sending someone to change a setting that was already right costs them a second
run to learn nothing. It also checks the skill's own files unpacked, which is
free and is not a network problem either.

The probe is bounded two ways. An `AbortSignal` closes a real socket, so a
stalled connection cannot keep the process alive after the run has decided it
cannot start; a race bounds the wait regardless, because honouring a signal is
the caller's choice. Without both, the cheapest stage in the run becomes its
longest - which is what the first version did, and the test for it hung rather
than failed.

**The ladder is policy, kept apart from the search.** `landmark.js` still finds
and downloads one phrase; `ladder.js` decides which phrase, and what to ask for
next. They fail differently - a search that finds nothing is Commons' business,
a cover showing the wrong city is the run's. The metro and the region come from
the run rather than from code, because "the nearest major metro within about
60km" is a question about a map, and answering it here would mean carrying a
gazetteer inside a package with 200 files to spend.

**The flagged deck says so in its name and nowhere else.** The file outlives the
reply that explained it: it gets forwarded to whoever does the mailing, who never
saw the chat. A "NOT READY" stamp on slide 1 would be something a person has to
remove before the deck could ever be used, so the slides are left exactly as
built and the defects are listed in the reply, by slide.

**The reply is built, not remembered.** `outcome.js` assembles the three fixed
templates and `reply.js` ships them as an entry point. The conditional lines are
the ones that drift when a template is rewritten from memory, and they are
exactly the lines carrying bad news. It also reads back what earlier stages
recorded - the rung the cover settled for, the defects that outlived their
repairs - because those were written by processes that have since exited, and
reading them is more reliable than carrying them.

**Changed along the way.** `check-content.js` and `render-deck.js` were wired to
the budget only after it was built: the budget existed, was tested, and nothing
called it, which would have shipped a limit that was real in the tests and
advisory in the run. `outcome.js` was in the same position - tested, and reached
by no code path - which is what `reply.js` is for. `render-deck.js` also gained
`--work`, because the run's state sits beside `run.json` and the deck it renders
is written to the outputs directory, so the working directory has to be named
rather than inferred.

**Changed after review.** The two-axis review found two things that made checked
boxes untrue, and both are fixed.

**The flagged deck could not be built.** Decision 07 says "Five placed is
accepted as a quality note. Fewer than 5 after that is a critical defect and
produces a flagged deck", but ticket 05's `market-map.js` refused anything under
six, and `build-deck.js` refused any copy the content gate failed. So the run
that most needed to hand over a deck - one with a thin competitor field - threw
twice before it could write a file, and the flagged path was unreachable for the
decision's own example defect. Settled with the user: the floor is now five, and
`--flagged` skips the count check and the gate refusal, because a build that
refuses leaves nothing to flag. Everything else about the map is still checked,
crowding included, and the findings are printed for the reply to list by slide.
This changes a constant ticket 05 owns, which is why it was asked rather than
assumed.

**The defect list was never populated.** `noteDefect` had no caller, so
`reply.js --outcome flagged` would have printed "0 issues remain:" under a
warning line. `reply.js` now takes `--defects "3:...|1:..."` and adds them to
whatever the run already recorded. The best-effort line had the same shape of
problem - the one template left to be remembered, in a module whose argument is
that remembered templates drift - and is now `--best-effort`.

Also from the review: the run-state path was derived four times in two different
ways and is now `runStateFile()`; each ladder rung is built once carrying its own
search, quality-note status and fallback phrase, instead of the phrase being
re-derived from the rung's name later; `findLandmarkOnLadder` takes the
`headquarters` object rather than tearing it into three arguments; and
`outcome.js`'s defect type is `ReportedDefect`, since `structure.js` already had
a different `Defect`.

Verified here: 183 tests, typecheck clean, package 18 files with all six entry
points bundled, stage 0 run from the staged package against the live network, and
the bundled `reply.js` printing a flagged reply that merges both defect sources
and names the recorded fallback. Not verified: anything that needs a sandbox with
the default allowlist, a real Commons search per rung, a real LibreOffice, or a
model actually following the brief. Those belong to tickets 09 and 11.
