# Stop the render check spending the run on a converter that cannot answer

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: grilling
Labels: wayfinder:grilling
Mode: HITL
Status: open
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
