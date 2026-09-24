# Set the cover's company name in the brand's own written form

Parent: [Tighten the run: no text over text, no minutes spent unseen](../map.md)
Type: prototype
Labels: wayfinder:prototype
Mode: HITL
Status: resolved
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

## Answer

**The cover sets the company's name as type, in the company's own written form,
bold and white. That is the whole treatment** — no logo, no tracking, no
two-tone split, no invented case.

The size is the reference's 0.269in cap height wherever the name fits the
2.831in slot at it, which is every one of the five written forms and the
reference's own. `wordmarkFontSize` already sizes a name too long for that by
width instead, down to the 9pt floor, and then the box wraps it; that behaviour
is untouched and is why a cover with no written form at all — "US Fleet
Tracking" set as given — lands at 24pt rather than 27pt. The cap height is the
treatment's target, not a guarantee the slot can always keep.

### Where the written form comes from

A new top-level string in `run.json` called **`writtenForm`**, read off the
company's own masthead in step 2 of SKILL.md — the same step that already puts
the model in front of the logo.

**How far it may depart from the name the user typed: not at all, in letters.**
It must be the same letters in the same order; only case, spacing and
punctuation may change. `US Fleet Tracking` → `USFleetTracking`, `GPS Insight` →
`GPSINSIGHT`, `Shopmonkey` → `shopmonkey`. Nothing comes along from the
masthead that is not the name: not a tagline (`Experience you can trust`,
`a Bridgestone Company`), not a legal suffix, and nothing is dropped.

This is enforced, not just written down. `checkWrittenForm` in
`content-gate.js` squashes both sides to their letters and digits and reports a
`written-form` finding on slide 1 when they differ, so a masthead's tagline
cannot reach the cover of a deck being mailed to that company's founder.

**When the masthead is an image with no readable letters, the run leaves
`writtenForm` out** and the cover sets the name exactly as the user typed it. That
is a designed outcome, not a fallback to report: an absent field and a blank one
mean the same thing and produce the same cover. The case is real — the ranking
picked Google's logo off Shopmonkey's page during this prototype, and the mark it
did find is a 31px symbol with no letters in it at all.

### What brand styling is allowed to mean: bold, and nothing else

Four treatments were built and looked at on the five companies, on a skyline and
on a bright landmark. Prototypes in the scratch run; the strips are what decided
it.

| Lever | Verdict |
| --- | --- |
| **Bold, written form** | **Chosen.** What the reference does, measured. |
| Bold + 1pt tracking | Rejected. It pulls the target's name toward RECUR's own tracked mark across the divider, so the two stop reading as "Recur \| the company" and start reading as one lockup in one voice. It is also a lever the reference does not pull. |
| Two-tone split at an internal capital | Rejected on measurement. The cyan half lands at **5.20:1** over a bright photograph, under the **5.83:1** the reference cover holds and that decision 13's whole duotone exists to clear. It also has no answer at all for `linxup`, `azuga` or `shopmonkey`, which have no internal capital — a treatment that cannot be applied to three of six companies is a special case, not a treatment. |
| The typed name instead of the written form | Rejected. `Shopmonkey` and `GPS Insight` read as a document title; `shopmonkey` and `GPSINSIGHT` read as those companies. This is the whole premise of the ticket, and it holds up. |

The written forms were measured, not assumed: each company's masthead was
fetched with the skill's own `fetch-logo.js` and looked at. They differ in
exactly the ways that matter — case (`shopmonkey`, `azuga`, `linxup` lowercase;
`GPSINSIGHT` all caps), spacing (`GPSINSIGHT` closed up against `Teletrac
Navman` spaced), and decoration that has to be dropped (symbols, taglines, ™).

**Looked at:** all five built through the shipped bundle, then rendered with
macOS Quick Look, since LibreOffice is not on this machine — the same way ticket
13's covers were looked at. All five read; the marks stand clear on both
photographs. `Teletrac Navman` wraps to two lines inside its 0.9in box, which is
what that box is for — the slot's geometry is untouched and the render check is
where a bad wrap gets caught.

The strips and the measurements behind them are kept at
[assets/01-cover-written-form/](../assets/01-cover-written-form/), because a
claim that someone looked is worth less than the thing they looked at.

**Still owed: a real render on the supported host.** A Quick Look thumbnail is
not the render check SKILL.md step 8 defines, and the map puts anything needing
a real render behind HITL. The decision does not depend on it — the contrast
numbers are measured off the treated photographs themselves, not off a render —
but the next practice run should put one of these covers in front of the
supported host's own renderer before the release runs lean on it.

### What happened to the cover logo code: deleted

- `COVER.logo` and its maxWidth / maxHeight / minHeight bounds — **gone**.
- The `coverMark.kind === 'logo'` branch in `deck.js`, and the `chooseMark` call
  that fed it — **gone**. `coverSlide` takes a name and sets it.
- `LOGO.sharpPixelsPerInch` — **kept at 150, with a narrower justification.**
  The number used to be defended by what it did on two slots at once: US Fleet
  Tracking's 258 x 27px mark failed the cover and passed the map from one rule.
  With the cover gone only the map's half is left, so the constant now decides
  one thing — whether one of nine small marks on slide 3 is placed or set as
  type. `design.js` and the practice log both say so now, rather than leaving
  the old two-slot argument standing as though it still held.
- **Also gone, decided with the user:** the dark-ground machinery the cover was
  the only caller of — `backgroundFit`, `whitenMark`, `inkSummary`, and
  `LOGO.lightMarkLuminance` / `singleInkShare` / `singleInkDistance`. The market
  map's pale band was always "use the company's own version as it is", so with
  slide 1 gone these had no reachable caller. `chooseMark` loses its
  `background` argument and `LOGO` collapses to one value.

### What the run file still asks for: the top-level `logo` block goes

The market map already carries a per-company `logo`, the target's included, and
slide 3 is now the only slide that places one. Keeping a second copy at the top
level would be a field whose only job was to feed a slot that no longer exists.

The provenance had to move with it, or deleting the block would have dropped the
target's logo source out of the deck entirely. Slide 3's notes carry it now.

**This was widened past what the ticket asked, deliberately: the note is written
for every company on the map, not only the target.** A per-company note that
skipped eight of nine companies would be a stranger rule than the one it saved,
and the record is better for it — a reviewer could not previously check the
eight competitors' marks from the deck at all. It is speaker notes only: the
marks on slide 3 are byte-identical, so the map's "Slide 3's competitor logos
stay exactly as they are" still holds. Worth knowing it was a choice.

Slide 1's notes gain one line in exchange, and only when it is needed:
`Cover sets: GPSINSIGHT, the company's own written form`. A cover that sets the
name unchanged has nothing to explain and says nothing.

### Whether the reply changes: no

Nothing did report it. A cover falling back to type was never written into
`Fallbacks:` — only the landmark ladder calls `noteFallback`, which is still
true. With type as the only outcome there is genuinely nothing to report, so the
reply template is correct as it stands and was left alone.

### The glossary

`CONTEXT.md`'s **text wordmark** entry now carries both readings: the treatment
on the cover, the fallback on the market map. A new **written form** entry
defines the name-as-the-company-writes-it and the letters rule, since three
files now depend on that term meaning one thing.
