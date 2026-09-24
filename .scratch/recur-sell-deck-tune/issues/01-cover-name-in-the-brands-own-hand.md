# Set the cover's company name in the brand's own written form

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: prototype
Labels: wayfinder:prototype
Mode: HITL
Status: open
Assignee: unassigned
Blocked by: none

## Question

The cover stops carrying the target company's logo. What replaces it, exactly?

**Why the logo goes.** It asks the model to make one large mark look right in a
2.831in slot on a photograph, and the September 2026 runs showed that is too
much to ask: a mark that is the wrong shape, the wrong weight for a dark ground,
or too coarse to scale takes the whole cover down with it. The failure is
unforgiving because there is exactly one mark and it is the thing the eye lands
on. The same logo on slide 3 is one of nine small marks and fails softly, which
is why slide 3 keeps its logos and slide 1 does not.

**What the reference actually does, measured.** On `Slide1.png` the company is
set as white bold type reading "USFleetTracking" — closed up, internal capitals,
no spaces. That is the company's own written form, not a licensed typeface: the
deriving script already established the reference deck's Latin metric is Arial
(`scripts/derive-font-metrics.js`, four samples across two weights). So what
makes that cover read as the company's brand is the *lettering convention*, not
the font file. `deck.js:317` already sets the text-wordmark fallback as bold
white Arial at the reference cap height — the machinery is there and the missing
input is the name's written form.

Settle:

- **Where the written form comes from.** A new field in `run.json` the model
  fills from the company's own site — the name as the company writes it on its
  own masthead. Name it, and write the SKILL.md instruction that gets it right:
  how far may it depart from the name the user typed, and what does the model do
  when the site's masthead is an image with no text?
- **What "brand styling" is allowed to mean** beyond bold. Tracking, case, a
  two-tone split at an internal capital? Each is a lever the reference does not
  pull, and each is another thing to get wrong. Prototype covers for five
  practice-set companies whose written forms differ — Shopmonkey, GPS Insight,
  Teletrac Navman, Linxup, Azuga — and choose from what they look like.
- **What happens to the cover logo code.** `COVER.logo` and its maxWidth /
  maxHeight / minHeight bounds, the `coverMark.kind === 'logo'` branch in
  `deck.js`, and the cover half of `LOGO.sharpPixelsPerInch`. Delete or keep?
  Note that the sharpness threshold's *stated justification* in the practice log
  is a cover-versus-map argument, so removing the cover side changes what that
  constant is for.
- **What the run file still asks for.** The top-level `logo` block currently
  feeds the cover; the market map carries its own per-company `logo`. If the
  cover no longer takes one, does the top-level block go, or does it stay as the
  target's marker on slide 3?
- **Whether the reply changes.** Today a cover that falls back to type is a
  designed outcome and is not named in `Fallbacks:`. Once type is the *only*
  outcome, there is nothing to report and that wording may need revisiting.

Amends [Choose the slide layouts and asset strategy through a rough
prototype](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md),
which put a verified logo in the cover slot, and supersedes the cover half of
[the logo acquisition
pipeline](../../recur-sell-deck-build/tickets/03-logo-acquisition-pipeline.md).

**The glossary moves with this.** CONTEXT.md defines **text wordmark** as what
is used *when* a logo cannot be verified, converted or kept sharp — a fallback.
On the cover it stops being a fallback and becomes the treatment, while on the
market map it stays exactly what it is. Rewrite the entry to carry both, as part
of this ticket and not after it.

**Done when** the cover's logo path is gone from code and from SKILL.md, the
name's written form has a home in `run.json` and an instruction that fills it,
and a built cover has been looked at for each of the five prototype companies.
