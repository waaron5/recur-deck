#!/usr/bin/env node
// The render check's entry point. Bundled to <skill>/scripts/render-deck.js, so
// it runs from the bundle alone with no package installs at run time.
//
//   node <skill-dir>/scripts/render-deck.js --input "Recur x Acme.pptx" --out work/render
//
// It rasterises slides 1-3 of a built deck and prints where the images landed:
//
//   {"ok": true, "images": ["work/render/slide-1.png", ...]}
//
// The point of it is the step that follows: the model opens those images and
// looks at them. No deck is delivered unseen. What the model finds is repaired
// by shortening copy, never by shrinking type, and the deck is rebuilt and
// rendered again.

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('./args.js');
const { renderSlides } = require('./render.js');
const { openRunState, runStateFile, stageTimer } = require('./run-state.js');

const USAGE = 'usage: render-deck.js --input <deck>.pptx [--out <dir>] [--work <dir>]';

/** Times this stage, which is the converter rasterising slides 1-3. */
const mark = stageTimer();

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error(USAGE);

  // Before anything is spawned. A conversion is bounded at two minutes, and
  // starting one for a deck this run has no rounds left to repair would spend
  // them for nothing.
  const round = spendRound(args.work);

  const outDir = args.out || path.join(path.dirname(path.resolve(args.input)), 'render');
  const images = renderSlides({ file: args.input, outDir });

  if (args.work) mark(args.work, 'render-deck');

  console.log(
    JSON.stringify({ ok: true, images: images.map((image) => image.file), ...round }, null, 2),
  );
}

/**
 * Take one of the run's two render rounds.
 *
 * The run's state lives beside its run file rather than beside the deck, which
 * is written to the outputs directory, so the working directory has to be named
 * rather than inferred from the file being rendered.
 *
 * Rendering without a run is allowed, the same way checking copy without one is:
 * it is how someone looks at a deck they already have.
 *
 * @param {string} [work]
 */
function spendRound(work) {
  if (!work) return undefined;

  const file = runStateFile(work);
  if (!fs.existsSync(file)) return undefined;

  // This throws where check-content.js returns its refusal as JSON, and the
  // difference is deliberate: the gate still has findings worth printing when
  // its budget runs out, and this has nothing to show for a render it is not
  // going to start.
  const spent = openRunState({ file }).spend('render');
  if (spent.allowed) return { round: spent.round };

  throw new Error(
    `${spent.reason}: stop rendering and deliver a flagged deck with build-deck.js ` +
      '--flagged, listing what is still wrong by slide.',
  );
}

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
