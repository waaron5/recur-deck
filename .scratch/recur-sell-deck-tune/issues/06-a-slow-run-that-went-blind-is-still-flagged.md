# A slow run whose renders went blind is still told to flag the deck

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: task
Labels: wayfinder:task, ready-for-agent
Mode: unattended
Status: open
Assignee: unassigned
Blocked by: none

## Question

**This amends decision 03**, which settled that the two refusals call for
opposite things: out of render rounds means a flagged deck, out of blind renders
means a clean one. There is a third way to be refused, and it takes the wrong
branch.

`mayRender()` asks `decide('render')` first, and `decide` checks the twelve-minute
cutoff before it checks the count, so it answers `cause: 'time'`. In
`render-deck.js`, `whatToDoInstead` sends every cause except `'blind'` to "deliver
a flagged deck with build-deck.js --flagged". So a run that crossed the cutoff and
whose renders only ever showed nothing is told to flag a deck with no standing
defect — exactly the outcome decision 03 exists to prevent.

Measured on the development machine, September 25, 2026, against a run started
thirteen minutes ago with two blind renders and no render round spent:

```
mayRender() => {"allowed":false,"round":0,"cause":"time",
                "reason":"the run is past its 12 minutes, so no new round starts"}
```

`round: 0` is the tell. Decision 03's reasoning for the flagged deck is that a run
out of *rounds* "has rendered twice, looked twice, and still has a defect it could
not repair". A run at `round: 0` has looked at nothing and repaired nothing, so
there is nothing for the flag to be about.

**It is reachable.** Two blind renders cost about a minute at ticket 03's bound,
and a run crossing twelve minutes is what the twelve-minute cutoff is for. The
founder gets a `NOT READY` deck because a converter went quiet.

Settle which of these is right, and say why in the same file as the code:

- **`whatToDoInstead` consults the blind count** for the `'time'` cause, so the
  branch is chosen by what the run actually has rather than by which limit fired
  first. Keeps `decide`'s ordering, which decision 03 argued for on its own terms.
- **`mayRender()` checks the blind cap before the cutoff.** Simpler to read, but
  it reverses an ordering decision 03 reasoned about explicitly — and that
  reasoning is about the repair budget, not about time, so check whether it even
  applies here.

Either way the question the branch is really asking is *does this run hold a
defect that outlived a repair?*, and neither `cause` answers it directly. That may
be the thing to name.

**Done when** a run past the cutoff whose renders all went blind delivers a clean
deck with the unseen line, a test holds it, and decision 03's entry on the map
says it was amended and how.

## Comments

### Found in review, September 25, 2026

Raised by the review pass over ticket 05's groundwork. Not fixed there: it amends
a landed decision rather than ticket 05's own question, and which of the two
routes to take is a decision with reasoning attached, not a patch.
