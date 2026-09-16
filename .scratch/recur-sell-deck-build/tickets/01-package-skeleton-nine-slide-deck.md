# 01: Skill package skeleton that delivers a nine-slide deck

**What to build:** Someone installs the workflow package in Claude's browser chat, starts a fresh chat, and sends `Create a Recur sell deck for US Fleet Tracking`. With no further turns they get a download card for a nine-slide PPTX that opens in real PowerPoint. Slides 4–9 are the six supplied reference PNGs, full-bleed and in order. Slides 1–3 are placeholders with the right page geometry and empty speaker notes; their real content arrives in later tickets.

This ticket sets the shape of the package everything else is built inside: the skill folder with its instructions, one bundled generation script, the reference documents, and the fixed Recur assets. The build step that produces the uploadable ZIP lives in this repo and the ZIP it produces depends on nothing outside itself — no repository checkout, no local runtime, no external server, no recipient credentials. The 200-file upload cap is the reason generation ships as a single bundled script rather than a vendored dependency tree.

Decisions this implements: [Choose the supported AI tool and package handoff](../../recur-sell-deck/issues/03-choose-host-and-package.md), [Verify the selected account's execution and file capabilities](../../recur-sell-deck/issues/09-verify-account-capabilities.md), and the rendering approach in [Choose the slide layouts and asset strategy](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A repeatable build step in this repo produces the uploadable ZIP with one top-level skill folder, and the ZIP holds at most 200 files.
- [x] The ZIP uploads through Customize > Skills, passes the security scan, and shows as enabled.
- [x] One prompt in a fresh chat, with no user turns after it, ends in a download card for a PPTX.
- [x] The file has exactly nine slides, opens in real PowerPoint, and slides 4–9 are the supplied reference PNGs in order.
- [x] Generation runs entirely from the bundled script inside the sandbox, with no package installs at run time.
- [x] Placeholder slides 1–3 carry speaker notes fields, so later tickets have somewhere to write the source record.

## Comments

**Built September 16, 2026.** `npm run build` produces `dist/recur-sell-deck.zip`:
one top-level `recur-sell-deck/` folder, 11 files, 1741 KB. Source lives in
`skill/` (instructions, `src/`, `reference/`, wordmark assets); `scripts/build-package.js`
bundles `src/build-deck.js` with esbuild and copies the six supplied PNGs in as
`assets/fixed-slide-4..9.png`. 16 tests, `tsc --noEmit` clean.

**Verified here:** nine slides; slides 4–9 sha256-identical to `Slide4.png`–`Slide9.png`
in order, each full-bleed at (0,0) 13.333 × 7.5; the unzipped skill builds a deck
with no `node_modules` reachable and the bundle retains no non-builtin `require`;
slides 1–3 take a notes value that round-trips into the correct notes part, empty
in this build.

**Left unchecked, all needing a person on claude.ai or PowerPoint:** the upload and
security scan, the one-prompt fresh-chat run, and "opens in real PowerPoint".
AppleScript automation of PowerPoint was attempted and abandoned; the rest of that
criterion (nine slides, slides 4–9 in order) is confirmed above.

**Judgment call to revisit:** slides 1–3 ship a layout frame — wordmark positions,
thesis section labels and numbered circles, the market-map band, L-axes and navy
sidebar, titles and footer — rather than three blank pages. No researched content
is present. A spec review read this as reaching into tickets 02, 04 and 05, which
now start by editing this code rather than filling blanks. Kept because those
tickets replace these slides wholesale and blank pages would make the skeleton's
output untestable by eye; say so if it should be stripped back.

**First install and run, September 16, 2026.** The ZIP was installed in the
developer's own Claude account and the one-line prompt produced the deck with no
follow-up turns, closing the upload and one-prompt criteria. The output was as
designed for this ticket: three laid-out slides carrying only the company name.
Still open: confirming the file opens in real PowerPoint.

**Footer corrected from measurements.** The run showed the confidentiality line
sitting too high against reused slides 4–9, and that the reference market map
carries no such line. Measuring the reference PNGs (1300 × 731, 1 px = 0.01026in)
gave identical footers on every reference slide that has one: the wordmark spans
x 11.805–12.625in and the page number sits at x 12.923, both with their ink
centred on y 7.100; the confidentiality line's ink runs y 7.326–7.408in, centred
on the slide. The line had been at y 7.05 — about 0.28in high — and the page
number was 11pt against a measured ~16pt. Footer geometry now lives in
`design.js` as `FOOTER` with its provenance recorded, and the market map draws no
footer at all. Verified in the generated file: line centre y 7.375 and horizontal
centre 6.666, page number centre y 7.100 / x 12.964, slide 3 free of footer text
and images. Two tests hold the positions.

**Opened in real PowerPoint, September 16, 2026.** Closes the last acceptance
criterion; all six now pass.

**Typeface and page size corrected against the original.** The titles did not
match the headers on slides 4–9. Measuring established that reference slides 1–3
and the slide 4–9 headers share one typeface, and ruled out both Arial (in use)
and Work Sans Light (10% too wide at the reference's cap height). Metric
fingerprinting could not name it, so the developer read it from the source
presentation: **Noto Sans Arabic Light, 20pt, not bold**.

That exposed a units problem. A 20pt cap height of 0.263in implies a cap height
of 0.94 em on a 13.333in-wide slide, which no typeface has; on a 10in-wide slide
it implies 0.706 em, which is normal. **The original deck is 10 × 5.625in**, so
every earlier measurement was 1.333× too large — visually correct, because the
PNGs are full-bleed and everything scaled together, but in the wrong unit system.
The deck now uses the original's 10 × 5.625in, so values measured off it transfer
1:1 and tickets 02, 04 and 05 need no conversion step.

**Supersedes two recorded decisions**, flagged rather than silently overridden:

- [Choose the slide layouts and asset strategy](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md)
  specifies Arial, chosen because it is metric-compatible with the sandbox
  renderer's Liberation Sans so an in-run render predicts PowerPoint's line
  breaks. Noto Sans Arabic Light is not in the sandbox, so **that property no
  longer holds**: render-check line breaks are approximate until the font ships
  inside the ZIP. It is OFL-licensed, so bundling it is open to
  [ticket 07](07-render-and-inspect-loop.md), which owns the render loop.
- [Define first-try success and the release bar](../../recur-sell-deck/issues/04-define-first-try-success.md)
  records slides 4–9 as "about 97 pixels per inch at 13.3 inches wide". At the
  original's page size the same PNGs are **130 px/in**, which improves the print
  softness noted there. The 12pt floor for native text is also expressed in
  13.333in units; the same physical size in 10in units is **9pt**, which is what
  the code now enforces.

Verified in the generated file: page 10.000 × 5.625in; both titles 20pt, not
bold, Noto Sans Arabic Light; confidentiality line centre y 5.532; page number
centre y 5.325; market map free of footer. 18 tests, typecheck clean.

**Not verified locally:** no Noto face is installed on the build machine and
there is no local renderer, so the titles' rendered position could not be checked
here — only their font, size, weight and box geometry. It needs an eye in
PowerPoint.
