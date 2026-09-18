# 12: Copy that sounds like the Recur introduction

**What to build:** A run's slide 2 and slide 3 copy reads as though the company
that wrote slides 4-9 also wrote it. The workflow stops policing vocabulary with
lists and starts holding its copy against Recur's own writing, which ships inside
the package as the voice exemplar.

The content gate loses its banned word list, the suffix matcher behind it, its
two banned phrase patterns, and its punctuation rules — all but the question
mark, which still stands in for the ban on rhetorical questions. A bullet may run
to 16 words rather than 14. The header limit stays at 12, where the fit estimate
binds first anyway.

In their place goes one rule the old gate could not express: across the six
thesis bullets, at least two must carry a subordinate or participial clause — a
fronted condition, a trailing consequence, or a qualifier. Every rule the gate
had was a rule about one field, and the defect that shipped was a property of all
six bullets at once. The reference deck sits at 3 of 6; what shipped sat at 0.

SKILL.md's writing rules are rewritten around the exemplar rather than around a
list of prohibitions, and its step 6 copy review names the failures the practice
runs actually produced: one word opening several bullets in a row, and six
bullets built to the same pattern.

Decisions this implements: the September 18, 2026 amendment to [Define the
evidence and investment judgment behind each
pitch](../../recur-sell-deck/issues/05-define-investment-judgment.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The banned word list, the suffix matcher, the banned phrase patterns and the punctuation rules are gone from the content gate, and the question-mark rule remains.
- [ ] A bullet may run to 16 words; a header stays at 12.
- [ ] The gate refuses a thesis whose six bullets carry fewer than two subordinate or participial clauses, reporting it against the slide rather than one field, because no single bullet is at fault.
- [ ] `reference/voice.md` is bundled into the ZIP and reachable from SKILL.md's reference list.
- [ ] SKILL.md states the writing rules as "sound like the exemplar" rather than as a list of banned words, and step 6 measures the copy against it by name.
- [ ] Tests covering the deleted rules are deleted rather than skipped, and the new structural rule has tests of its own.
- [ ] The copy from the next practice run is read against the exemplar by eye. _Needs a run on the supported host; belongs with ticket 09's reruns, not to a terminal session._

## Comments

**Written September 18, 2026**, out of a grilling session over the ticket 09
practice runs. `reference/voice.md` already exists — it was written in that
session, from the reference PNGs, while the analysis of why those lines work was
still in context. This ticket wires it in; it does not author it.

Three things worth knowing before starting. The first is that this ticket makes the
content gate substantially smaller, and that is the point rather than a side
effect: decision 05's original position was that "leaving all judgment to the
model drifts", and the amendment bets the other way on purpose, provisionally.
The user's instruction was to start with few regulations and add them back if the
writing turns out bad. Do not quietly keep a list because it seems safer.

The second is a trap worth knowing before starting: `scripts/build-package.js`
bundles the ZIP from an explicit list of files, naming `reference/visual-rules.md`
one line at a time. A file dropped into `skill/reference/` does not ship by
itself. `voice.md` has to be added to that list, or the package will pass every
test and arrive at Recur without the one document this ticket is about.

The third is that the structural check is the one new rule, and it is easy to
over-build. It needs no upper bound — the reference sits at 3 of 6 with nothing
stopping it going higher — and it must not grow into a check on sentence length.
Length variance was measured and is not what separates the human copy from the
generated copy: the reference's bullets vary *less* in length than the generated
ones. A floor on length was considered and rejected, because a minimum is a
target and models write to targets.
