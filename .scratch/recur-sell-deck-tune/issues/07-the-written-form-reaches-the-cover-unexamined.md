# The written form reaches the cover unexamined

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: task
Labels: wayfinder:task, ready-for-agent
Mode: unattended
Status: open
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
