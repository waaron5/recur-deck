// The render check: slides 1-3 rasterised so the model can look at them before
// the deck is offered to anyone.
//
// This machine has no LibreOffice, and the sandbox that runs the skill does.
// The converters are therefore driven through a seam: these tests hand
// renderSlides their own runner and check what it is asked to do, which is the
// part this package is responsible for. Whether soffice then draws the slide
// correctly is a question only a real run can answer.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { renderSlides, execute } = require('../skill/src/render.js');
const { GENERATED_SLIDE_NUMBERS, RENDER } = require('../skill/src/design.js');
const { tempDir } = require('./helpers.js');

/** A deck file to point the renderer at. Nothing reads its contents here. */
function deckFile(name = 'Recur x Acme.pptx') {
  const file = path.join(tempDir('recur-render-'), name);
  fs.writeFileSync(file, Buffer.from('PK'));
  return file;
}

/**
 * A stand-in for the sandbox's converters: it records what it was asked to run
 * and produces the files the real tools would have produced.
 *
 * @param {{pages?: number[], writePdf?: boolean, pad?: number}} [behaviour]
 */
function fakeRenderer({ pages, writePdf = true, pad = 0 } = {}) {
  const calls = [];

  /** @type {(command: string, args: string[], options: {timeoutMs: number, cwd: string}) => void} */
  const run = (command, args, options) => {
    calls.push({ command, args, options });

    if (command === 'soffice' && writePdf) {
      const outDir = args[args.indexOf('--outdir') + 1];
      const source = args[args.length - 1];
      fs.writeFileSync(
        path.join(outDir, `${path.basename(source, path.extname(source))}.pdf`),
        Buffer.from('%PDF-1.4'),
      );
    }

    if (command === 'pdftoppm') {
      const prefix = args[args.length - 1];
      const first = Number(args[args.indexOf('-f') + 1]);
      const last = Number(args[args.indexOf('-l') + 1]);
      const written = pages ?? Array.from({ length: last - first + 1 }, (_, i) => first + i);
      for (const page of written) {
        // pdftoppm pads its page numbers to the width of the document's own
        // page count, which is what `pad` reproduces.
        const name = pad ? String(page).padStart(pad, '0') : String(page);
        fs.writeFileSync(`${prefix}-${name}.png`, Buffer.from('PNG'));
      }
    }
  };

  return { run, calls };
}

test('the deck is converted to PDF and only slides 1-3 are rasterised', () => {
  const file = deckFile();
  const outDir = path.join(path.dirname(file), 'render');
  const { run, calls } = fakeRenderer();

  renderSlides({ file, outDir, run });

  const [convert, rasterise] = calls;
  assert.equal(convert.command, 'soffice');
  assert.ok(convert.args.includes('--headless'), 'the converter must not try to open a window');
  assert.deepEqual(convert.args.slice(-4), ['pdf', '--outdir', outDir, file]);

  assert.equal(rasterise.command, 'pdftoppm');
  const first = Math.min(...GENERATED_SLIDE_NUMBERS);
  const last = Math.max(...GENERATED_SLIDE_NUMBERS);
  assert.equal(rasterise.args[rasterise.args.indexOf('-f') + 1], String(first));
  assert.equal(
    rasterise.args[rasterise.args.indexOf('-l') + 1],
    String(last),
    'the six fixed Recur slides never change, so rendering them would be wasted time',
  );
  assert.equal(rasterise.args[rasterise.args.indexOf('-r') + 1], String(RENDER.dpi));
});

test('LibreOffice gets a profile of its own, so a running copy cannot block it', () => {
  const file = deckFile();
  const outDir = path.join(path.dirname(file), 'render');
  const { run, calls } = fakeRenderer();

  renderSlides({ file, outDir, run });

  const profile = calls[0].args.find((arg) => arg.startsWith('-env:UserInstallation='));
  assert.ok(profile, 'the converter should be given its own user installation');
  assert.ok(profile.startsWith('-env:UserInstallation=file://'), 'which has to be a file URL');
});

test('both converters are bounded, so a hung one cannot eat the run', () => {
  const file = deckFile();
  const { run, calls } = fakeRenderer();

  renderSlides({ file, outDir: path.join(path.dirname(file), 'render'), run });

  for (const call of calls) {
    assert.equal(call.options.timeoutMs, RENDER.timeoutMs);
  }
});

test('the images come back paired with the slides they show', () => {
  const file = deckFile();
  const outDir = path.join(path.dirname(file), 'render');
  const { run } = fakeRenderer();

  const images = renderSlides({ file, outDir, run });

  assert.deepEqual(
    images.map((image) => image.slide),
    GENERATED_SLIDE_NUMBERS,
  );
  for (const image of images) {
    assert.ok(fs.existsSync(image.file), `slide ${image.slide} should have an image on disk`);
  }
});

test('a zero-padded page number still maps to the slide it shows', () => {
  // pdftoppm pads its page numbers to the width of the document's own page
  // count, so the name is "slide-1.png" in one deck and "slide-01.png" in
  // another. Predicting the name would break on a deck of a different length.
  const file = deckFile();
  const outDir = path.join(path.dirname(file), 'render');
  const { run } = fakeRenderer({ pad: 2 });

  const images = renderSlides({ file, outDir, run });

  assert.deepEqual(
    images.map((image) => image.slide),
    GENERATED_SLIDE_NUMBERS,
    'slide-01.png is slide 1, not slide 01',
  );
  for (const image of images) assert.ok(fs.existsSync(image.file));
});

test('images from a previous round are cleared before rendering again', () => {
  // A render round repairs copy and renders again into the same directory. A
  // stale "slide-01.png" left beside a fresh "slide-1.png" would be collected
  // as a second slide 1, and the model would inspect the copy it just fixed.
  const file = deckFile();
  const outDir = path.join(path.dirname(file), 'render');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'slide-01.png'), Buffer.from('STALE'));

  const { run } = fakeRenderer();
  const images = renderSlides({ file, outDir, run });

  assert.deepEqual(
    images.map((image) => image.slide),
    GENERATED_SLIDE_NUMBERS,
    'the stale image must not come back as a fourth slide',
  );
  for (const image of images) {
    assert.notEqual(fs.readFileSync(image.file).toString(), 'STALE');
  }
});

test('a converter that writes no PDF fails, and names the deck', () => {
  const file = deckFile();
  const { run } = fakeRenderer({ writePdf: false });

  assert.throws(
    () => renderSlides({ file, outDir: path.join(path.dirname(file), 'render'), run }),
    /Recur x Acme\.pptx/,
  );
});

test('a slide that produced no image fails rather than going uninspected', () => {
  // Silently returning two images where three were asked for would mean a slide
  // reached a founder unseen, which is the one thing this step exists to stop.
  const file = deckFile();
  const { run } = fakeRenderer({ pages: [1, 2] });

  assert.throws(
    () => renderSlides({ file, outDir: path.join(path.dirname(file), 'render'), run }),
    /slide 3/,
  );
});

test('a deck that is not there is refused before anything is run', () => {
  const { run, calls } = fakeRenderer();
  assert.throws(
    () =>
      renderSlides({
        file: path.join(tempDir('recur-absent-'), 'nothing.pptx'),
        outDir: tempDir('recur-absent-out-'),
        run,
      }),
    /no deck to render/,
  );
  assert.equal(calls.length, 0, 'nothing should be spawned for a deck that does not exist');
});

test('a run out of render rounds is refused before a converter is ever started', () => {
  // The other half of decision 07's budget. Two render rounds, and the refusal
  // has to come before anything is spawned - both because starting a two-minute
  // conversion for a deck the run may not repair is wasted time, and because it
  // is what makes this testable on a machine with no LibreOffice at all.
  const { execFileSync } = require('node:child_process');
  const entry = path.join(__dirname, '..', 'skill', 'src', 'render-deck.js');

  const work = tempDir('recur-render-budget-');
  fs.writeFileSync(
    path.join(work, 'run-state.json'),
    JSON.stringify({
      startedAt: Date.now(),
      rounds: { render: 2 },
      fallbacks: [],
      defects: [],
    }),
  );

  const deck = path.join(work, 'Recur x Acme.pptx');
  fs.writeFileSync(deck, Buffer.from('PK'));

  let output = '';
  try {
    execFileSync(
      process.execPath,
      [entry, '--input', deck, '--out', path.join(work, 'render'), '--work', work],
      { encoding: 'utf8' },
    );
    assert.fail('a run with no render rounds left should not succeed');
  } catch (error) {
    const failed = /** @type {{stdout?: string, stderr?: string}} */ (error);
    output = `${failed.stdout ?? ''}${failed.stderr ?? ''}`;
  }

  assert.match(output, /render rounds are spent/, 'it says which budget ran out');
  assert.match(output, /flag/i, 'and what to do instead of rendering again');
  assert.doesNotMatch(
    output,
    /not installed in this sandbox/,
    'the budget is checked first, so this never becomes a missing-converter error',
  );
});

test('a converter missing from the sandbox says so, rather than failing obscurely', () => {
  // This is the failure a run has to be able to tell apart from a badly drawn
  // slide: one means repair the copy, the other means this sandbox cannot
  // render at all. Decision 07's preflight reports it, so the words matter.
  assert.throws(
    () =>
      execute('recur-no-such-converter', [], { timeoutMs: 1000, cwd: tempDir('recur-enoent-') }),
    /not installed in this sandbox/,
  );
});
