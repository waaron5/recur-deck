# Give the render check its eyes back

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: task
Labels: wayfinder:task
Mode: HITL
Status: claimed
Assignee: unassigned
Blocked by: 04

## Question

Why does LibreOffice produce no PDF in the sandbox, when decision 09's
capability probe measured the whole render step at about two seconds? And can a
run get its eyes back, or does it keep shipping decks that were only checked
deterministically?

**This is the follow-up, not the fix.** Ticket 03 makes the failure cheap and
honest; it does not make it stop. This ticket is about the capability itself,
and it is last on the map because after 03 a run that cannot render still
delivers a sound deck.

**Why it cannot be answered from a terminal.** LibreOffice is not installed on
the development machine, which the practice log already records as the reason
step 8 was never exercised locally. The evidence has to come from a run on the
supported host, which is why this waits on the work directory ticket 04 keeps.

Settle, in this order:

- **Whether it still fails** at ticket 03's shorter bound, and whether it fails
  at `soffice` or at `pdftoppm`. `render.js` distinguishes a missing binary from
  a killed one, so the error text already tells these apart — it just has to be
  captured.
- **What changed since the probe.** The probe rendered a deck; a real run's deck
  carries a full-bleed duotone cover photograph and up to ten logos as embedded
  base64. Whether that is what makes the conversion slow is measurable by
  converting a deck with and without them.
- **Whether a private profile directory is the cost.** `render.js` points
  `-env:UserInstallation` at a fresh directory under the render output, so every
  run pays for a first-run profile and font cache. It was done to avoid
  contending with a running LibreOffice, which may be a problem the sandbox does
  not have.
- **Whether a different route is warranted at all.** Rasterising in-process
  through the already-bundled resvg was considered and set aside in grilling on
  September 24, 2026: it would draw the slide from our own model with our own
  line-breaking, so it could no longer independently catch the very wrap bug
  ticket 02 fixes. It becomes a picture rather than a check. Reopen this only if
  the LibreOffice route turns out to be unfixable.

**Done when** the render check either works inside its bound on the supported
host, or is written down as unavailable there with the reason measured rather
than assumed — and SKILL.md says which.

## Comments

### Groundwork, September 25, 2026

**Nothing here closes the ticket.** It is blocked by 04, whose run has not
happened, and both of its endings — the render working inside its bound, or
being written down as unavailable with the reason measured — are facts about the
supported host. What follows is the part that can be done without one, and it is
all of the same kind: making sure the host run leaves evidence behind instead of
a number.

**The first bullet's "it just has to be captured" is done.** It was not captured.
`render.js` words its four failures apart — `soffice is not installed`, `soffice
did not finish within 30s`, `LibreOffice wrote no PDF`, `the renderer produced no
image for slide N` — and `render-deck.js` printed the right one to stderr, but
`noteBlindRender()` recorded a bare count. So the only durable trace of *why* a
run went blind was the chat transcript, and `judge-run.js` read a work directory
that said `renders that showed nothing: 2` and nothing more. That is the same
shape of loss as the September 17 runs: the finding lives somewhere that gets
closed. The converter's own sentence is now stored per attempt in
`run-state.json` and printed under the count, indented, one line per attempt:

```
  renders that showed nothing: 1 — this deck went unseen
    soffice is not installed in this sandbox, so slides cannot be rendered and checked
  Settled for: no visual check (the renderer did not answer)
```

That is from driving the shipped bundle's own entry points on this machine, not
from a fixture. Paired with the `render-deck` mark in the timeline above it, it
answers the first bullet whole — which converter, and whether it was absent,
killed at the bound, or ran and produced nothing. `practice-log.md` says under
"How each run is judged" to copy those lines out, because that is where the next
person judging a run is already looking. Nothing the founder reads changed: the
`Fallbacks:` line is still decision 03's one sentence, and `reply.js` is untouched.

**What this machine can measure, and why it is not the answer.** Neither
`soffice` nor `pdftoppm` is installed here, so the local blind render is an
`ENOENT` at `soffice` in 6ms. The sandbox's failure is a different one: decision
09's probe found both converters present there and measured the whole step at
about two seconds, and a run there still came back with no PDF. So the local
failure cannot stand in for it, and the ticket stays HITL for exactly the reason
it was written.

**The suite would have stopped testing this on the host.** Every entry-point case
in `render.test.js` that needs a blind render provoked one by relying on this
machine having no LibreOffice — which is precisely the machine this ticket exists
to stop being the only one. On a host with a converter they would have started
testing a successful render under the names of blind ones, and passed. They now
run `render-deck.js` with an empty `PATH`, so `soffice` is out of reach on either
machine and the cases assert the same behaviour in both. The one case that is
refused before a converter is spawned — a run with no render round left — is
unaffected either way, which is the point of its being refused first.

**Still owed, and only obtainable on the host,** in the ticket's own order:

- Whether it still fails at 30s, and at which converter. The run now records it;
  someone has to do the run.
- Whether the cover photograph and the base64 logos are what makes the
  conversion slow. This is a build with and without them, timed, and it needs a
  converter that works before the comparison means anything.
- Whether the private `-env:UserInstallation` profile is the cost. One line in
  `render.js`, measured both ways on the host.

**Two things the review pass raised, and where they went.** One is this ticket's
own third bullet from another angle: the 30-second bound's comment calls it
"fifteen times the measurement", but decision 09's two seconds was measured with a
warm profile, and `render.js` hands soffice a fresh `-env:UserInstallation` under
`outDir` on every render — so no run ever pays the warm cost, and against a blind
cap of two a sandbox that merely *starts* LibreOffice slowly now delivers unseen
where the old 120-second bound would have rendered. That is a good argument and it
is still an argument; the ticket says measure rather than assume, so it stays in the
third bullet rather than becoming a change. It does sharpen what to measure: time
the first render of a run separately from the second, because only the first pays
for the profile.

The other two findings were outside this ticket and are now their own, because both
amend decisions rather than patch them:
[06](06-a-slow-run-that-went-blind-is-still-flagged.md) and
[07](07-the-written-form-reaches-the-cover-unexamined.md).

**One finding was fixed here, because it destroyed what this ticket just built.**
`judge-run.js` read the run's state through `openRunState`, which writes a blank
record over any state file it cannot parse — and a sandbox killed mid-save leaves
exactly that file. So the one command a person runs to find out what happened was
the command that destroyed the answer. Measured, before the fix: a truncated
`run-state.json` holding `blind: 2`, its causes and a 30-second `render-deck` mark
came back as `startedAt` set to the moment of looking and every other field empty.
`openRunState` now takes `readOnly`, under which the first-open write is skipped and
any write throws rather than quietly failing, and the harness opens one; it also
reports a damaged record as damaged instead of as a run that recorded nothing,
because those are different findings and only one is worth chasing. The file is left
byte-identical, which is what a test now asserts.

**The package was rebuilt** so the ZIP to install carries the captured cause:
`dist/recur-sell-deck.zip`, 19 files, 2893 KB.

### The cause, found September 25, 2026

**It was never the sandbox, the deck, or the bound.** `render.js` built
LibreOffice's profile argument by concatenating `file://` with a path the run
supplies. A `file:` URL reads whatever follows its two slashes as a host name, so
the documented invocation — `--out work/render`, relative — asked for a profile
on a machine called `work`. LibreOffice does not refuse that. It waits for a host
that never answers, until the 30-second bound kills it and the render goes blind
with nothing to show.

An absolute `outDir` starts with a slash, so `file://` + `/Users/…` is the
correct three-slash form by accident. That is why nothing caught this: decision
09's probe, every test in the suite, and this ticket's own September 25 dry run
all passed absolute directories, while SKILL.md told the model to pass
`work/render`. The bug fired only where nobody was measuring, which was every
real run.

**Measured on the supported host**, driving the same deck by hand: about 3
seconds on a first render and about 1 on a second, against a 30-second bound.
The relative-path form hung past 45 seconds and had to be killed, and the profile
directory was never created.

This answers the ticket's four bullets, in its own order:

- **Whether it still fails, and at which converter.** At `soffice`, every time,
  and for this and nothing else. `ETIMEDOUT` was the honest report of a process
  waiting on a host.
- **What changed since the probe.** Nothing about the deck. The cover photograph
  and the embedded logos convert in three seconds. The probe passed an absolute
  directory and a real run did not.
- **Whether the private profile directory is the cost.** It costs about two
  seconds — the difference between a run's first render and its second — so the
  30s bound has ten times the headroom it needs. The review pass's argument that
  a cold profile might not fit inside 30 seconds was a good argument and is now
  measured false. The profile stays.
- **Whether a different route is warranted.** No. The LibreOffice route was never
  broken, so the resvg question set aside in grilling stays set aside.

`render.js` now builds the URL with `pathToFileURL` from an absolute path, which
also escapes the spaces and non-ASCII a built path can carry. The test drives a
relative `outDir`, because the absolute case is the one that was always passing.
SKILL.md, `visual-rules.md` and `design.js` carry the host's measurement in place
of the probe's.

**Still owed before this closes:** one run of the fixed package on the supported
host, showing three images and a `render-deck` mark in seconds. Everything above
is a measurement of `soffice` driven by hand; no run has yet rendered through the
package itself.
