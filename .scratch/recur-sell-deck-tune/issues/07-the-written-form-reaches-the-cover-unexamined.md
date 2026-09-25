# The written form reaches the cover unexamined

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: task
Labels: wayfinder:task, ready-for-agent
Mode: unattended
Status: resolved
Assignee: unassigned
Blocked by: none

## Question

**This amends decision 01**, which gave the cover a `writtenForm` field and a gate
rule that it must be the given name's own letters. The rule holds. What it does not
constrain is everything *between* the letters, and `coverNameFrom` in `deck.js`
only calls `.trim()` before that string becomes the one piece of type on the cover.

`checkWrittenForm` compares `squash(written) === squash(company)`, and `squash`
deletes every character that is not a letter or digit. That is deliberate — the
cover is allowed to restyle case, spacing and punctuation, which is the whole point
of the field. The consequence is that whitespace and control characters are not
merely permitted, they are invisible to the check.

Measured on the development machine, September 25, 2026. Each of these passes the
gate with zero `written-form` findings, and this is what reaches `slide1.xml`:

| `writtenForm` for "US Fleet Tracking" | cover text runs | illegal XML 1.0 char |
| --- | --- | --- |
| `US Fleet` + LF + `Tracking` | `US Fleet`, `Tracking` | no |
| `US Fleet` + U+0001 + `Tracking` | one run, the U+0001 intact | **yes** |
| `US` + two spaces + `Fleet` + two spaces + `Tracking` | the doubled spaces intact | no |

Two distinct defects, and the second is the serious one:

- **A newline splits the cover into two text runs.** Ticket 02 established that a
  box holding one line is the whole fit ceiling; this puts two lines in it, and the
  fit check cannot see it because it measures the string's advances as a single
  line. A masthead read across two lines — which is how plenty of logos are set —
  is the ordinary way to arrive here.
- **A control character lands in `slide1.xml` verbatim**, which is not valid XML
  1.0. That is a deck PowerPoint refuses to open, produced by a run where every
  deterministic check passed.

**Note what `safeCompany` is and is not.** It strips exactly these things, but its
own doc comment says it keeps a name "usable as a file name", and `deck.js` calls
it once, on `company`, at the top of `buildDeck`. Routing `writtenForm` through it
would work but would also strip the characters a file name cannot hold, and a
written form legitimately containing a slash or a colon is not far-fetched. Settle
whether the cover wants the filename rule or a rule of its own; if the latter, say
in `design.js` which characters a line of cover type may contain and why, the way
every other number there carries its measurement.

**Done when** a `writtenForm` carrying a newline, a doubled space or a control
character either cannot pass the gate or cannot reach the slide as-is, a test holds
each of the three cases above, and decision 01's entry on the map says it was
amended and how.

## Comments

### Found in review, September 25, 2026

Raised by the review pass over ticket 05's groundwork, and the three rows above
were measured rather than taken on the reviewer's word — the control-character row
is worse than reported, since it yields a file PowerPoint will not open. Not fixed
there: it amends a landed decision, and which rule the cover should hold is a
decision with reasoning attached, not a patch.

### Settled, September 25, 2026

**A rule of the cover's own, not the filename rule.** `safeCompany` strips what a
file name cannot hold, and a written form may legitimately carry a slash or a
colon - the cover has no reason to refuse one. So `design.js` now says which
characters a line of cover type may contain, with the September 25 measurements
that produced the rule, the way every other value there does.

The three rows are answered by two different mechanisms, because they are two
different kinds of wrong:

- **A newline and a doubled space are restyled, not refused.** Decision 01 already
  lets the cover restyle case, spacing and punctuation, and a newline is spacing:
  a masthead set across two lines becomes the one line the slot holds, which is
  ticket 02's ceiling kept rather than breached. Any run of whitespace collapses
  to one space in `coverNameFrom`.
- **A control character is reported by the gate and stripped by the cover.** It
  cannot be restyled into anything, so the model is told to write the form again.
  It is also stripped, because a flagged build is asked for after the repair budget
  ran out and skips the gate's refusal by design - and a file PowerPoint will not
  open is the one outcome no exhausted budget should be able to produce.

The two patterns deliberately do not overlap: tab, line feed, vertical tab, form
feed and carriage return are control characters that are also whitespace, and they
belong to the rule that restyles. What is left has no printable form and no
spacing meaning.

Five tests hold it - the three measured rows, a written form with more than one
control character, and the spacing cases still passing the gate.
