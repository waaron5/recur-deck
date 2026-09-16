# 03: Logo acquisition pipeline

**What to build:** Real company logos, acquired from the company's own site, appear on the deck. A run fetches the site's HTML inside the sandbox with a Chrome user-agent, picks logo candidates in a fixed order (the mark inside the home link, then `logo`-ish images ranked by header position with customer, partner, and award logos excluded, then CSS logo URLs, then the social image or touch icon), normalises the winner to a trimmed transparent PNG, and shows it to the model, which confirms it is that company's current logo and not a customer's, a partner's, or a product sub-brand's.

Two rules then decide whether the image is used at all. Background fit: use the version the company designed for that background, never a whole-logo recolour; a single-colour mark may be whitened through its alpha channel. Resolution: never enlarge a logo past the size at which it stays sharp, so a logo is placed at the smaller of its slot size and its sharp maximum, and a logo whose sharp maximum falls below its slot's legible minimum becomes a text wordmark instead. Every step ends in a text wordmark rather than a missing or broken image.

The cover is where this is demonstrated: the target's logo replaces the text wordmark from ticket 02 when it is verified, sharp, and right for a dark background. The pipeline is written to serve the market map too, which places many logos at much smaller sizes.

Format conversion is the known risk. Logos arrive as SVG and WebP, which the deck generator cannot place directly; SVG goes through a bundled rasterizer and WebP is converted in the sandbox. Whether conversion works there is unverified, and this ticket settles it. If a format cannot be converted, that company gets a text wordmark.

Decisions this implements: the logo acquisition ladder, background-fit rule, resolution rule, and text wordmark definition in [Choose the slide layouts and asset strategy](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md).

**Blocked by:** 02 (Cover slide with a real headquarters landmark).

**Status:** ready-for-agent

- [x] Across the ten logo-trial companies, each run either places that company's own current logo or falls back to a text wordmark; it never places another company's logo.
- [x] SVG and WebP logos are converted to placeable transparent PNGs, or the company falls back to a text wordmark with the reason recorded.
- [x] The model's identity check runs on every normalised logo before it reaches a slide.
- [x] No logo is enlarged past its sharp maximum, and aspect ratio is always preserved.
- [x] On the dark cover, the logo used is one designed for a dark background, or a whitened single-colour mark, or a text wordmark — never a recoloured multicolour mark.
- [x] US Fleet Tracking's low-resolution logo resolves to a text wordmark on the cover, as the resolution rule requires.
- [x] Slide 1's speaker notes record where the logo came from.

## Comments

**Built September 16, 2026.** Four new modules: `skill/src/raster.js` (format
conversion), `skill/src/logo.js` (the candidate ladder and the two rules),
`skill/src/fetch-logo.js` (the CLI the model runs), and `skill/src/http.js` (the
Chrome user agent and one shared download, which the landmark search now uses
too). The cover in `deck.js` places a logo or falls back to type. 55 tests,
typecheck clean, `npm run build` produces a 14-file, 2804 KB ZIP.

**The known risk is settled, and settled in the shipped artifact.** Conversion
runs on two WebAssembly rasterizers carried inside the package: resvg for SVG,
jsquash for WebP, shipped as `assets/resvg.wasm` and `assets/webp-dec.wasm` and
read from disk rather than base64'd into the bundle, because the upload cap
counts files and not bytes. The proof is not a unit test: the built ZIP was
unpacked into a temp directory with no `node_modules` anywhere in reach - the
sandbox's own conditions - and the bundled script converted a real WebP logo and
an SVG logo into nine-slide decks. A package test now does exactly that on every
run, and reads the result back out of the .pptx rather than trusting the
generator's report.

**This supersedes a decision, flagged rather than silently overridden.**
[Decision 06](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md)
planned WebP conversion "in the sandbox, with Python PIL as the planned route".
That route cannot be verified from the build machine, which has neither PIL nor
ImageMagick, so it would have shipped on trust and degraded every WebP logo to a
text wordmark if absent. The bundled decoder costs 138 KB, needs nothing
installed, and is verified offline here. The SVG half follows decision 06's own
"bundled WASM rasterizer (resvg)" unchanged.

**The thresholds are measured, and each sits in a gap rather than on a case.**
Read off the fully opaque core of the real trial logos, because antialiasing
varies a pixel's alpha rather than its ink and would otherwise read as a second
colour:

| Fixture | Mean luminance | Share of core in one ink |
| --- | --- | --- |
| `usft-logo-white.webp` | 225 | 75% |
| `samsara-logo.png` | 17 | **100%** |
| `usft-servapp.png` | 119 | 47% |
| `usft-logo.png` | 59 | 64% |

So "drawn for a dark ground" splits at 225 against 119, and "one ink" at 100%
against 75%. The thresholds are 160 and 0.95.

**One rule produces both required outcomes.** US Fleet Tracking's mark trims to
258 x 27px, so at 150px per placed inch it stays sharp to 1.72in wide, which is
0.180in tall. On the cover that is under the 0.269in the wordmark it replaces
sets, so the cover gets type. On the market map the same mark sizes by optical
area to 1.45 x 0.152in, above that slot's 0.14in floor, so it stays a logo -
which is what [decision 10](../../recur-sell-deck/issues/10-prototype-market-map-chart.md)
says it should.

**Verified live across the ten logo-trial companies**, against the real sites:

| Outcome | Companies |
| --- | --- |
| Own logo placed from the home link, whitened | Geotab, Verizon Connect, Motive, Force Fleet |
| Text wordmark, multicolour mark | US Fleet Tracking, Azuga, GPS Insight, Teletrac Navman, Linxup |
| Text wordmark, too coarse | Samsara |

**Nothing placed another company's logo.** The prototype's first heuristic got
that wrong on 3 of 10 sites and picked a product sub-brand on a fourth; excluding
customer and partner blocks by their enclosing container, not just by the words
in the image tag, is what fixed it. Six of ten reaching a wordmark is expected on
a dark cover, where a multicolour mark cannot be used without the recolouring the
rules forbid; the market map's pale ground will place most of them.

**What the two reviews changed.** A standards and a spec review ran over the
finished work. Three findings were real defects and are fixed, each with a test
that fails without the fix:

1. **A logo that could not be converted killed the run.** `readLogo` was called
   outside any try/catch and `normaliseLogo` throws, so a run whose logo file was
   a GIF exited 1 with **no deck at all** - a critical defect by CONTEXT.md's own
   definition, and the exact opposite of this ticket's "every step ends in a text
   wordmark". The claim that every path ended in something placeable was true of
   `logo.js` alone and false of the assembled run. The conversion failure is now
   caught, the cover falls back to type, and the reason reaches slide 1's notes.
2. **A mark drawn entirely in soft edges was refused for a reason that was not
   true.** Ink is read from pixels at alpha 250 or above; a mark that is
   semi-transparent everywhere has no such core, and the code reported "0% of its
   ink is one shade" and refused it as multicolour. The reading now falls back to
   every visible pixel.
3. **The ladder was truncated to a top-four.** `acquireLogo` sliced the flat
   candidate list, so a header carrying four or more logo-ish images used up every
   attempt and the stylesheet and social rungs were never reached. Attempts are
   now capped per rung, so the ladder stays a ladder.

Also removed: an invented rule that had no caller and no test (what a *pale*
ground asks of a logo, which decision 06 does not set and which belongs to ticket
05), a duplicated `download`, a dead `inlineSvg` that re-did work the rasterizer
already does, and a re-declared `CoverLogo` type that would have drifted. The
cover's decision moved into `logo.js` as `chooseMark`, which is what lets the
market map reuse it.

One review finding is **not** accepted. The `slot.area` branch was called
speculative generality, to delete until the market map has a caller. This
ticket's own brief says the pipeline "is written to serve the market map too,
which places many logos at much smaller sizes", and decision 10 fixes its
numbers, so the capability is specified and tested. What was wrong was the
*documentation*: `reference/visual-rules.md` stated a market-map logo rule as
though the generator followed it today, while slide 3 places no logos at all.
That claim is gone; the shipped reference now describes only the cover.

**Judgment calls to revisit.**

- **The cover's logo height bounds are not measured.** The reference cover sets
  this company as type, so there was nothing to measure. A logo there may not
  outgrow the divider beside it (0.600in) and may not read smaller than the
  wordmark it replaces (0.269in). The second number decides criterion 6: US Fleet
  Tracking lands at 0.180in, so any minimum at or below 0.18in flips it to a
  placed logo. It also compares the wordmark's *cap height* against a logo's
  *full ink height*, which is not quite like for like. Say so if a different
  floor is wanted.
- **The last rung can return something that is not a logo.** For US Fleet
  Tracking the ladder found no logo-ish image and fell through to the social
  image, which was a marketing photograph of a phone. Nothing broken reached a
  slide - the colour rule refused it - but what is *designed* to catch that is
  the model looking at the image, which is why that gate exists.
- **`verified` is an honour-system flag.** Code refuses to place a logo without
  it, but nothing ties the flag to the image the model actually looked at:
  `readLogo` re-reads whatever path the run file names. Tightening that would
  mean carrying a digest from `fetch-logo.js` into the run file.

**Not verified, all needing a person or the real sandbox:** the deck opened in
real PowerPoint, a run inside the claude.ai sandbox, and the market-map sizing
against an actual slide 3, which does not exist until ticket 05. No logo has ever
been seen rendered on a cover here - the placements above are correct by
measurement and arithmetic, not by eye.
