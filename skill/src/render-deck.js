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

const USAGE = 'usage: render-deck.js --input <deck>.pptx [--out <dir>]';

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error(USAGE);

  const outDir = args.out || path.join(path.dirname(path.resolve(args.input)), 'render');
  const images = renderSlides({ file: args.input, outDir });

  console.log(JSON.stringify({ ok: true, images: images.map((image) => image.file) }, null, 2));
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
