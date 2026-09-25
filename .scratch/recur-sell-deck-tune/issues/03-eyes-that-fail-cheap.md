# Stop the render check spending the run on a converter that cannot answer

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: grilling
Labels: wayfinder:grilling
Mode: HITL
Status: resolved
Assignee: unassigned
Blocked by: 02

## Question

In the September 2026 run the renderer timed out twice, the model reported
"slides 1-3 could not be rendered for a visual check (renderer timed out
twice)", and the deck went out having been seen by nobody. Four minutes bought
nothing. What should a run do when its eyes do not open?

**Where the four minutes came from.** `RENDER.timeoutMs` is 120000
(`design.js:350`), and the comment beside it is explicit that two minutes was
"a bound on a converter that hangs rather than an expected duration" — the
capability probe in decision 09 measured the whole step at about 2 seconds.
`render-deck.js` spends one of the run's two render rounds *before* it starts a
converter, so both rounds were spent and both timed out at the full bound.

Settle:

- **The bound.** Something like 25-30s: still an order of magnitude above the
  measured 2 seconds, but a failure that costs seconds instead of minutes.
- **Whether a timeout spends a round.** It currently does. A round exists to
  bound *repair*, and a render that produced no image gave the model nothing to
  repair from, so charging for it is arguably wrong.
- **What ships.** Decided in grilling, September 24, 2026: deliver the deck
  clean and name it in the reply the way a photo fallback is named — not a
  flagged deck. Turning a sandbox hiccup into a failed run is too harsh when
  every deterministic check passed. What remains is the exact wording, and
  whether it belongs on the `Fallbacks:` line or a line of its own.
- **What "no deck is delivered unseen" now means.** SKILL.md states it as a
  promise. Once the fit gate is authoritative, overflow is caught before the
  render and the render is a second opinion rather than the guarantee — so the
  promise needs restating rather than quietly dropping.
- **Whether `reply.js` can say it without the model remembering to.** The
  `Fallbacks:` line is already built from what the run recorded, and this should
  work the same way.

Amends the render-round budget in [Define unattended generation and failure
behavior](../../recur-sell-deck/issues/07-define-unattended-run.md) and the loop
built in [render and
inspect](../../recur-sell-deck-build/tickets/07-render-and-inspect-loop.md).

**The glossary moves with this.** CONTEXT.md's **render check** entry describes
a step that happens "before the file is offered to anyone", which is the promise
this ticket restates. Rewrite it to say what a run does when the check cannot
run, so the glossary does not keep asserting a guarantee the workflow no longer
makes unconditionally.

**Done when** a render that cannot answer costs the run seconds rather than
minutes, does not consume a repair round, and produces one honest line in the
reply that `reply.js` writes from the run's own state.

## Answer

**A render that cannot answer is a blind render: it costs 30 seconds, no repair
round, and after two of them the deck ships clean with one line in the reply
saying it was not looked at.** Settled in grilling with the user, September 24,
2026. The promise is restated rather than dropped, because it was two promises
wearing one sentence — *nothing overflows* and *someone looked* — and only the
first was ever the render's to keep.

### The bound: 30 seconds

`RENDER.timeoutMs` was 120000 with a comment already admitting it was "a bound on
a converter that hangs rather than an expected duration". The step measures at
about 2 seconds. 30000 is fifteen times that, which leaves room for a cold
LibreOffice first start in a loaded sandbox.

Both converters carry it, as before, and that is the number worth stating
carefully — the bound is per converter, not per step. soffice hanging costs 30s
and the run never reaches pdftoppm; soffice finishing while pdftoppm hangs costs
60s. Against two blind renders that is **1-2 minutes** for a sandbox that cannot
render, where the old bound cost 2-4. The September run was the first case, so its
four minutes become one; the worst case halves rather than quarters. `design.js`
carries the arithmetic, because the map asks every number there to.

### A blind render takes no round, and two is as long as a run waits

A round buys a rewrite. A render that produced no image gave the model nothing to
rewrite from, so charging one was charging for a repair that could not happen —
and it is what left the September run unseen *and* out of budget at the same
time. The two are now separate counts: `RUN_BUDGET.blindRenders` is 2, tracked in
`run-state.json` as `renders.blind`, and the repair rounds stay at 2 untouched.

That split is what the code change mostly is. `spend('render')` did two jobs at
once — asked permission and charged for it — in a single call made *before* the
converter ran, which is why a converter that never answered still got billed.
`run-state.js` now separates them: `mayRender()` asks and mutates nothing,
`noteRound()` records. `render-deck.js` asks before it spawns and records only
once images exist. `spend()` stays as it was for the content gate, which wants
both in one call: by the time it asks, it already has the findings the round pays
for.

`noteRound()` is deliberately unconditional. Permission is granted before a
converter starts and recorded after it finishes, and refusing to write down a
round already spent — because the twelve-minute cutoff passed while the converter
worked — would leave a run holding images it had not paid for.

### The two refusals say opposite things

`mayRender()` names its cause, because "stop rendering" means two different
outcomes and a run that confuses them ships the wrong deck.

- **Out of render rounds** — the renders answered, the model looked twice, and a
  defect it could not repair is still standing. Decision 07's flagged deck, as
  before.
- **Out of blind renders** — the renders answered nothing, so nothing was found
  and there is nothing to flag. The deck is handed over, and *not flagged for
  this*.

The "for this" is load-bearing in the wording, and it was tightened during
review. `render-deck.js` cannot see what the other checks found — a content gate
whose rounds ran out may have findings standing — so telling the model "every
deterministic check passed" would have been this stage asserting something it has
no way to know. What a blind render knows is only that it is not itself a reason
to flag anything. A deck otherwise clean goes out clean; a deck with a standing
defect is still flagged for that defect.

Every blind-render message also opens on the same fact: *no repair round was
spent, do not rewrite any copy*. That is the one thing a model reading a failed
step is likely to get wrong, and rewriting copy that was never shown to be wrong
is the harm. A converter reported as *not installed* skips the retry advice
outright: it will not be installed on the second ask.

### The wording, and where it comes from

`Fallbacks: no visual check (the renderer did not answer)`. On the existing line,
in the register of the fallbacks already there — "metro landmark (Dallas,
Texas)", "2 competitor wordmarks" — and so it needs no new line in a template
decision 07 fixes at about six.

`reply.js` is unchanged, which was the test of whether this works the way the
`Fallbacks:` line already works. The run records two facts as it goes — a render
answered nothing, a render answered — and `run-state.js` derives the phrase from
them.

**This is the one fallback phrase that module words itself, and that is a
departure worth naming.** Every other phrase is written by the stage that fell
back, because that stage is the only thing that knows what it settled for. No
single render knows this one: a first attempt that times out and a second that
works is a run that *did* see its slides, so the phrase would have to be
retracted, and a fallbacks list that can be retracted is worse than one derived
at the end. Whether a run ended up unseen is a fact about all of its renders.
The derivation lives next to the recording, with that reasoning on it.

It also means the line cannot be forgotten. A model that hits one blind render
and goes straight to the reply without retrying still gets the line, because the
line comes from the record rather than from remembering.

### What "no deck is delivered unseen" now means

**Every deck is looked at, and a deck that could not be looked at says so.**

The old sentence was doing the work of the fit guarantee, and after ticket 02 it
does not need to: the content gate refuses any line whose Arial advances pass its
box, before a deck is built. Overflow is caught by measurement, not by an eye.
What the render check keeps is what a measurement cannot see — clipping,
overlap, a logo that landed wrong, a written form that reads as the wrong
company — and a second opinion is something a run can honestly be denied. Denied
honestly is the operative word: the denial is named in the reply, in the same
place a photo fallback is named.

### What was changed

- `design.js`: `RENDER.timeoutMs` 120000 → 30000, with the September failure and
  the cold-start headroom written onto it; `RUN_BUDGET.blindRenders: 2` added,
  with why it is not a repair round.
- `run-state.js`: `spend()` split into a non-mutating `decide()` and a recording
  `noteRound()`, both exposed — `mayRender()` for the render check's ask,
  `noteRound()` for its pay, `spend()` unchanged for the content gate. Added
  `noteBlindRender()`, `noteRenderAnswered()`, the `renders` getter, and the
  derived `UNSEEN` phrase on `fallbacks`. `Spend` gained a `cause`, so a refusal
  can be acted on rather than only printed.
- `render-deck.js`: asks before spawning, pays after images exist, and reports a
  blind render as its own outcome with `blindRenders`, `attemptsLeft` and an
  `advice` line. A deck that is not there is now refused before the run's record
  is touched — it is a bad call, not a converter that went quiet, and it should
  not count against the blind renders.
- `render.js`: header rewritten. It is the second opinion, not the guarantee, and
  it says which decision took the guarantee off it.
- `SKILL.md`: step 8's promise restated; the two render outcomes separated, with
  the blind one carrying "do not rewrite any copy" and "do not flag the deck";
  "Repairs are bounded" now says a round buys a rewrite, so only a check that
  found something to rewrite costs one.
- `CONTEXT.md`: **render check** rewritten to say it is a second opinion and what
  a run does when it cannot run; **blind render** added; **repair budget**
  amended.
- Tests: the render bound asserted as the decision's own number; a blind render
  charges no round and says so; two blind renders exhaust and the third is
  refused with deliver-clean advice and no mention of flagging; the round-
  exhausted refusal still says flag. On `run-state.js`: asking twice spends
  nothing, a blind render leaves round 1 unspent, the two refusals carry
  different causes, and the unseen line appears, disappears when a later render
  answers, and sits beside a recorded fallback. The old
  "refused before a converter is ever started" test was folded into the
  round-exhausted one it became.

The entry-point tests run `render-deck.js` for real, and this machine having no
LibreOffice is what makes them honest: the converter is genuinely absent, so a
blind render needs nothing faked to provoke.

### What the review changed

Two axes, and each found something the first pass had wrong.

**The advice could lie, and the lie was reachable.** `mayRender()` asked the blind
cap before the repair budget, and `answered` was a fact about *any* render rather
than the latest one. So a run that rendered, found a defect, repaired it, then went
blind twice was told "your `Fallbacks:` line already carries that this deck was not
visually checked" — and the line was absent, because an earlier render of an
*earlier deck* had answered. Two fixes, and the second is the one that matters:

- `mayRender()` asks `decide('render')` first and falls to the blind cap only if a
  round remains. When both have run out the repair budget decides, because a run
  that rendered twice and still has a standing defect is decision 07's flagged
  deck, and the old order answered "deliver, do not flag" to exactly that run.
- `noteBlindRender()` clears `answered`. It is a fact about the deck on the table,
  not about the run's history: a repair builds a new deck, and an earlier look at
  an earlier one is not a look at this one. The blind *count* is not cleared by a
  render that answers — waiting is spent for the run, and a sandbox that has gone
  quiet twice has said what it is.

Both cases are now tested, including end-to-end: one test drives `render-deck.js`
into the mixed state and then runs `reply.js`, so the line the advice promises and
the line the user is handed are asserted to be the same line.

**`judge-run.js` would have disagreed with the reply.** It parsed `run-state.json`
itself, so it printed the *stored* fallbacks and missed the derived one — a judging
pass silently naming a different set of fallbacks than the user was given, which is
the one thing it must not do. It reads through `openRunState` now, and reports the
blind renders explicitly, since nothing in the rounds line accounts for them and a
deck nobody could look at is what the person judging most wants flagged. That also
gave the `renders` getter its caller; it had none, which was fair to call
speculative.

Three smaller things: the missing-converter failure is now *tagged*
(`missingConverter` on the error) instead of recognised by a regex over its own
prose, which had made that sentence load-bearing across a module boundary; the
deliver-unseen guidance is one shared constant rather than two wordings that could
drift apart; and `renderAnswered` came out of the JSON output, where nothing read
it and `ok: false` already said it.

The glossary's `_Avoid_` list for **blind render** listed "timeout", which reads as
forbidding an accurate word for one of the two causes. Narrowed to "render
timeout": what is avoided is naming the *outcome* after one cause, since a run
treats both the same and only one is worth asking twice.

### Still owed

**The 30-second bound against a real cold LibreOffice start.** 30s is fifteen
times a measurement taken on a warm sandbox, and nothing in this pass was
rendered, because LibreOffice is not installed here. One run on the supported
host confirms it — the same run that owes ticket 01 its cover and ticket 02 its
header. If a cold first start comes in near the bound, the number moves; the
structure around it does not.

**Whether a deck rebuilt and never re-rendered should be caught.** `answered` is
about the latest *render*, not the latest *build*, so a run that renders, rebuilds,
and then simply never renders again still reports itself as looked at. SKILL.md
tells the model to render after a rebuild and nothing here relies on it not
happening, but the state cannot detect it. Catching it means `build-deck.js`
clearing `answered` when it writes a deck — one line, and out of this ticket's
scope, since it is a hole that predates the decision rather than one it opened.
