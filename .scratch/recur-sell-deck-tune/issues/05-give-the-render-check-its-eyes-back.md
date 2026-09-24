# Give the render check its eyes back

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: task
Labels: wayfinder:task
Mode: HITL
Status: open
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
