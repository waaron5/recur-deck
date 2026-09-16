# 02: Cover slide with a real headquarters landmark

**What to build:** The cover stops being a placeholder. A run establishes the target company's headquarters city from the company's own site, finds a photo of a recognisable landmark in that city, and builds the cover from it: the photo fills the slide, largely desaturated and tinted with a premium navy duotone, with the white Recur wordmark, a thin white divider, and the target company's name centred over it. The target's name is set as a text wordmark for now; the logo pipeline arrives in ticket 03.

Slide 1's speaker notes start carrying their part of the source record: how the company was identified, the headquarters city and the source that states it, and the landmark photo's file name, author, and licence. None of that appears on the slide.

The photo comes from Wikimedia Commons through its API, downloaded at 1920 px wide and falling back to 1280 px, then cropped to 16:9. Every sandbox fetch sends a full Chrome user-agent string; without it ordinary sites answer 403. The landmark fallback ladder and the no-photo outcome belong to ticket 08 — this ticket needs only the happy path plus an honest failure when no photo is found.

Decisions this implements: the cover layout and landmark treatment in [Choose the slide layouts and asset strategy](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md), the headquarters evidence rule in [Define the evidence and investment judgment behind each pitch](../../recur-sell-deck/issues/05-define-investment-judgment.md), and the user-agent constraint recorded in [Choose the demonstration and fresh-user validation plan](../../recur-sell-deck/issues/08-define-submission-validation.md).

**Blocked by:** 01 (Skill package skeleton that delivers a nine-slide deck).

**Status:** ready-for-agent

- [x] For a covered target, the cover shows a photo clearly tied to that company's headquarters city, at least ~1600 px wide and unwatermarked.
- [x] The photo is desaturated and navy-tinted so the city reads cleanly and the white wordmarks stand out.
- [x] The Recur wordmark is placed from the bundled prerendered PNG and never depends on a font being installed.
- [x] The target's name renders as a clean text wordmark sized to its slot, never a broken image or placeholder.
- [x] Slide 1's speaker notes name the headquarters city with its source, and the photo's file name, author, and licence.
- [x] Nothing about the photo's credit or source appears on the visible slide.

## Comments

**Built September 16, 2026.** Two new modules, `skill/src/landmark.js` (Commons
search and download) and `skill/src/cover-photo.js` (crop and duotone), plus a
rebuilt cover in `deck.js`. 35 tests, typecheck clean, `npm run build` produces
an 11-file, 1759 KB ZIP.

**The run now carries research.** The generator takes `--input run.json` rather
than `--company`, because the model has to hand over what it established:
company, headquarters city, the source page that states it, and one line on how
the company was identified. Decision 07 already specifies structured JSON at
stage 2, and tickets 04 and 05 will add a thesis and a market map to the same
file. `SKILL.md` now tells the model to establish the headquarters from the
company's own site, and nothing else. A run file may also carry a
`landmark.file`, which skips the search: a rebuild after a repair should not
re-download a photo it already has, and it keeps the package test offline.

**Image processing is pure JavaScript, by constraint rather than preference.**
The skill ships as one bundled script with no package installs at run time, so a
native library like sharp cannot be used, and the sandbox has no binding the
bundle could call. `jpeg-js` bundles cleanly and runs anywhere the generator
does. That is also why the Commons search filters to `filemime:image/jpeg`: a
PNG or WebP candidate would arrive undecodable.

**Cover geometry, measured off Slide1.png** (1300 x 731 px, 130 px/in), not
estimated: the Recur wordmark's ink runs x 2.823-4.638in with a cap height of
0.400in centred on y 2.835; the divider sits at x 4.927 running y 2.508-3.108;
the company name's ink runs x 5.323-8.146in centred on y 2.808. The test asserts
these as literals rather than importing the constants, so it checks the deck
against the reference instead of against its own value.

**Judgment call to revisit.** The bundled wordmark PNG cannot match both of the
reference's dimensions: its ink is 5.41 wide to 1 high against the reference
wordmark's 4.54, because it is tracked wider. Cap height and the right-hand edge
are held to the reference, so the mark reaches about 0.35in further left than
the original's does. Matching the reference's 1.815in width instead would drop
RECUR's cap height to 0.335in, 16% under the original's 0.400in. Say so if the
other trade is wanted.

**The duotone was tuned against the reference, not by eye.** The reference
cover's own ground measures a mean luminance of 77 of 255; the treatment lands a
real Commons skyline at the same figure. Saturation turned out to be the wrong
thing to assert - the navy ramp has its own cast, so a real photo only moves
from 0.41 to 0.33 - and the test now measures hue concentration, which moves
from 0.42 to 0.99 and distinguishes a duotone from a merely dimmed photo. The
first version of that test passed only because its synthetic input was made of
raw primaries no photograph contains.

**What the two reviews changed.** A standards and a spec review ran over the
finished work. Three findings were real and are fixed:

1. **The company name was set at half the reference's size, and this ticket's
   notes claimed the opposite.** The cause was a measurement error compounded by
   an estimate. `COVER.name.capHeight` was set to 0.354in, which is the name's
   *ink* including the descender of "USFleetTracking"; the actual cap height,
   cap-top to baseline, is **0.269in**. On top of that, `wordmarkFontSize`
   inherited a guessed 0.58 em average character width, which overrode the
   measured cap height and produced 21pt, a 0.206in cap against RECUR's 0.400in.
   The reference's own character width, measured from it, is **0.495 em**. The
   name now renders at 27pt / 0.265in for "USFleetTracking", and a test asserts
   the rendered cap height against the reference instead of only its position.
   The reference does set the name smaller than RECUR, 0.269 against 0.400, so
   that part of the original design holds.
2. **The 1280px retry could ship a photo under the 1600px floor unremarked.**
   The width now goes into slide 1's source record, so a short photo is visible
   in the evidence rather than silent, and a test covers the retry pass.
   Grading it stays with ticket 08's ladder.
3. **`SKILL.md` sent the model to the company's own website without the Chrome
   user-agent constraint** that decision 08 verified a 403 against. That
   instruction is now in the file; it had only ever been in the generator's own
   fetches.

Dead code the standards review found is gone: unused exports, an unused search
limit, and a `readRun` fallback that could never produce a runnable run. Two of
its judgement calls are deliberately deferred: the run fields that travel
together want to be one type, and that is better settled in ticket 04 when the
thesis actually grows the parameter list; and the two test photo builders share
a buffer loop but serve different purposes.

**Verified here:** a live run from the built package produced a nine-slide deck
with a real 1920px Commons photo of Oklahoma City, and slide 1's notes carried
the city, its source URL, the file name, the photographer, the licence and the
photo's width, with none of it on the slide. The cover image was extracted from
the .pptx and looked at. The search generalises to Columbus, Ohio. 38 tests,
typecheck clean.

**The duotone's claims are now asserted, not just measured once.** A 512px CC0
Commons photo ships as a test fixture, because synthetic colour bands alone
could not hold this honest: the first version of the treatment test passed on
primaries no photograph contains while leaving a real photo barely touched.

**Evidence handed to [ticket 08](08-unattended-orchestration-and-failure.md).**
The happy path uses one phrase, `<city> downtown skyline`, which is the skyline
rung. Newport, Rhode Island and Morgan Hill, California find nothing with it and
fail honestly, which is this ticket's specified behaviour but leaves Dockwa and
Shopmonkey without a cover until the ladder exists. Measured while checking
whether one broader phrase could serve instead:

- `"<city>" (skyline OR landmark)` finds real photos for Newport (Old Colony
  House, Hunter House) and Morgan Hill (21-Mile House), but **degrades the
  cities that already work**: Oklahoma City falls to the State Capitol and
  Columbus returns a scanned book. It is a good second rung, not a replacement.
- A bare `skyline OR landmark` is broken, not just worse: CirrusSearch drops the
  city terms and returns the same Dutch sculpture for every city. Quote the city
  and bracket the alternatives.
- Commons rate-limits repeated searches with HTTP 429. A run makes one search,
  so this only bites when probing.

**Not verified, all needing a person or the real sandbox:** the deck opened in
real PowerPoint, and a run inside the claude.ai sandbox. In particular the
cover's type has never been seen rendered - the font is not installed on the
build machine and there is no local renderer, so the name's size is correct by
measurement and arithmetic, not by eye. The 1280px retry has a test but has
never been seen against live Commons. Watermark and "too somber" screening is
not implemented; decision 07 makes both a rung of ticket 08's ladder.
