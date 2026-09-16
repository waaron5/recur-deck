# 01: Skill package skeleton that delivers a nine-slide deck

**What to build:** Someone installs the workflow package in Claude's browser chat, starts a fresh chat, and sends `Create a Recur sell deck for US Fleet Tracking`. With no further turns they get a download card for a nine-slide PPTX that opens in real PowerPoint. Slides 4–9 are the six supplied reference PNGs, full-bleed and in order. Slides 1–3 are placeholders with the right page geometry and empty speaker notes; their real content arrives in later tickets.

This ticket sets the shape of the package everything else is built inside: the skill folder with its instructions, one bundled generation script, the reference documents, and the fixed Recur assets. The build step that produces the uploadable ZIP lives in this repo and the ZIP it produces depends on nothing outside itself — no repository checkout, no local runtime, no external server, no recipient credentials. The 200-file upload cap is the reason generation ships as a single bundled script rather than a vendored dependency tree.

Decisions this implements: [Choose the supported AI tool and package handoff](../../recur-sell-deck/issues/03-choose-host-and-package.md), [Verify the selected account's execution and file capabilities](../../recur-sell-deck/issues/09-verify-account-capabilities.md), and the rendering approach in [Choose the slide layouts and asset strategy](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A repeatable build step in this repo produces the uploadable ZIP with one top-level skill folder, and the ZIP holds at most 200 files.
- [ ] The ZIP uploads through Customize > Skills, passes the security scan, and shows as enabled.
- [ ] One prompt in a fresh chat, with no user turns after it, ends in a download card for a PPTX.
- [ ] The file has exactly nine slides, opens in real PowerPoint, and slides 4–9 are the supplied reference PNGs in order.
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
