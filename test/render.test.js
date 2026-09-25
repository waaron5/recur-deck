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
const { pathToFileURL } = require('node:url');

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

test('the profile URL names a path and never a host, so a relative --out still renders', () => {
  // The bug this exists for: `file://` + `work/render/.soffice-profile` is a
  // profile on a machine called `work`. LibreOffice does not refuse it - it
  // waits for that host until the bound kills it, and the run goes blind with
  // nothing to show. Every earlier measurement passed an absolute directory,
  // where the same concatenation happens to be correct, while SKILL.md told the
  // model to pass `--out work/render`. So the relative case is the one asserted.
  const cwd = process.cwd();
  const dir = tempDir('recur-render-rel-');
  process.chdir(dir);

  try {
    const file = deckFile();
    const { run, calls } = fakeRenderer();

    renderSlides({ file, outDir: 'work/render', run });

    const profile = String(
      calls[0].args.find((arg) => arg.startsWith('-env:UserInstallation=')),
    ).replace('-env:UserInstallation=', '');

    assert.equal(new URL(profile).host, '', 'a host here is a machine that will never answer');
    assert.equal(
      new URL(profile).pathname,
      pathToFileURL(path.resolve('work/render/.soffice-profile')).pathname,
      'and the profile is the directory the run asked for, resolved',
    );
  } finally {
    process.chdir(cwd);
  }
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

test("the converter's bound is seconds, not minutes", () => {
  // Decision 03 of the tightening map. The capability probe in decision 09
  // measured this whole step at about 2 seconds; the old two-minute bound meant
  // a sandbox whose converter hung cost the run four minutes of its fifteen for
  // nothing. Thirty seconds is written here as the decision's own number, so
  // this test can disagree with design.js rather than agree by construction.
  assert.equal(RENDER.timeoutMs, 30000);
});

/**
 * Run render-deck.js the way the skill does, and hand back what it printed.
 *
 * The converter is put out of reach rather than assumed absent. This machine has
 * no LibreOffice, which is what these cases were first written against, but
 * ticket 05 of the tightening map exists to get the skill onto a host that does
 * have one - and there this suite would quietly stop testing the blind render and
 * start testing a real one. An empty PATH gives soffice no chance of being found
 * on either machine, so what is asserted below is the same behaviour in both.
 *
 * @param {string} work
 * @param {string} deck
 */
function renderDeckEntry(work, deck) {
  const { execFileSync } = require('node:child_process');
  const entry = path.join(__dirname, '..', 'skill', 'src', 'render-deck.js');

  try {
    const stdout = execFileSync(
      process.execPath,
      [entry, '--input', deck, '--out', path.join(work, 'render'), '--work', work],
      { encoding: 'utf8', env: { PATH: '' } },
    );
    return { ok: true, output: stdout };
  } catch (error) {
    const failed = /** @type {{stdout?: string, stderr?: string}} */ (error);
    return { ok: false, output: `${failed.stdout ?? ''}${failed.stderr ?? ''}` };
  }
}

/** A started run with a deck beside it, for the entry-point tests. */
function startedRun(rounds = {}) {
  const work = tempDir('recur-render-run-');
  fs.writeFileSync(
    path.join(work, 'run-state.json'),
    JSON.stringify({ startedAt: Date.now(), rounds, fallbacks: [], defects: [], stages: [] }),
  );

  const deck = path.join(work, 'Recur x Acme.pptx');
  fs.writeFileSync(deck, Buffer.from('PK'));

  return { work, deck };
}

/** What the run has written down about itself. */
const runState = (work) => JSON.parse(fs.readFileSync(path.join(work, 'run-state.json'), 'utf8'));

test('a render that answers nothing costs no repair round, and says so', () => {
  // Whether the advice then says to render again or to deliver depends on why the
  // converter went quiet, and this machine has no LibreOffice at all - so what is
  // asserted here is the part that holds either way: the repair budget is
  // untouched, and the output says as much rather than leaving the model to
  // assume a failed step was a repair it has now paid for.
  const { work, deck } = startedRun();

  const first = renderDeckEntry(work, deck);

  assert.equal(first.ok, false, 'a render with no images to show has not succeeded');
  assert.equal(
    runState(work).rounds.render ?? 0,
    0,
    'a render that produced nothing gave the model nothing to repair from',
  );
  assert.match(first.output, /no repair round/i, 'and it says so');
  assert.match(first.output, /do not rewrite/i, 'because rewriting is the intuitive wrong move');
});

test('a run that has waited out two blind renders is refused, and delivers clean', () => {
  // Decision 03: turning a sandbox hiccup into a failed run is too harsh when
  // every deterministic check passed. The deck ships clean with one honest line.
  const { work, deck } = startedRun();

  renderDeckEntry(work, deck);
  renderDeckEntry(work, deck);
  const third = renderDeckEntry(work, deck);

  assert.equal(third.ok, false);
  assert.equal(runState(work).rounds.render ?? 0, 0, 'none of the three touched the repair budget');
  assert.match(third.output, /deliver/i, 'it says to hand the deck over');
  assert.doesNotMatch(
    third.output,
    /--flagged|NOT READY/,
    'a deck every deterministic check passed is not flagged for a renderer that hung',
  );
  // The two facts the reply is derived from, named rather than compared whole:
  // the record also carries why each render went quiet, which is a different
  // question - it is the diagnosis, not the line the founder reads - and is
  // asserted where that behaviour is tested.
  const { blind, answered } = runState(work).renders;
  assert.equal(blind, 2, 'both renders showed nothing');
  assert.equal(answered, false, 'so the run remembers its eyes never opened');
});

test('a run out of render rounds is still told to flag the deck', () => {
  // The two refusals are different. A run whose renders answered and whose
  // defects outlived its repairs has seen a real problem it could not fix, and
  // decision 07's flagged deck is still the right outcome for that one.
  const { work, deck } = startedRun({ render: 2 });

  const refused = renderDeckEntry(work, deck);

  assert.equal(refused.ok, false);
  assert.match(refused.output, /render rounds are spent/, 'it says which budget ran out');
  assert.match(refused.output, /flag/i, 'and what to do instead of rendering again');
  assert.doesNotMatch(
    refused.output,
    /not installed in this sandbox/,
    'the budget is checked first, so this never becomes a missing-converter error',
  );
});

test('a slow run whose renders all went blind delivers clean, and is not flagged', () => {
  // Ticket 06, amending decision 03. The cutoff is checked before the count, so
  // a run past twelve minutes is refused with `cause: 'time'` however its renders
  // went - and every cause but 'blind' used to route to a flagged deck. A run
  // that never once saw its slides was told to hand the founder a NOT READY deck
  // because a converter went quiet, which is the outcome decision 03 exists to
  // prevent.
  const { work, deck } = startedRun();
  const state = runState(work);
  state.startedAt = Date.now() - 13 * 60 * 1000;
  state.renders = { blind: 2, answered: false, reasons: [] };
  fs.writeFileSync(path.join(work, 'run-state.json'), JSON.stringify(state));

  const refused = renderDeckEntry(work, deck);

  assert.equal(refused.ok, false);
  assert.match(refused.output, /past its 12 minutes/, 'the clock is still what refused it');
  assert.match(refused.output, /deliver the deck/i, 'but the deck goes out');
  assert.doesNotMatch(
    refused.output,
    /--flagged|NOT READY/,
    'with nothing to flag, because this run looked at nothing and repaired nothing',
  );
});

test('a slow run that did look at its slides is still told to flag the deck', () => {
  // The other side of the same branch, so the amendment cannot be read as "time
  // never flags". This run rendered, looked, and repaired; the clock then stopped
  // it. It holds a defect that outlived a repair, which is what the flag is for.
  const { work, deck } = startedRun({ render: 1 });
  const state = runState(work);
  state.startedAt = Date.now() - 13 * 60 * 1000;
  fs.writeFileSync(path.join(work, 'run-state.json'), JSON.stringify(state));

  const refused = renderDeckEntry(work, deck);

  assert.equal(refused.ok, false);
  assert.match(refused.output, /past its 12 minutes/);
  assert.match(refused.output, /flag/i, 'a round was spent, so something was seen and not fixed');
});

test('a run refused for blind renders is never told to flag, and its reply carries the line', async () => {
  // The two halves that have to agree. render-deck.js tells the model its
  // Fallbacks: line already says the deck was not visually checked, and reply.js
  // has to actually print that - including for a run that rendered successfully
  // earlier, repaired, and then went blind, which is the case that used to be
  // told one thing and print another.
  const { work, deck } = startedRun();

  // An earlier render of an earlier deck, which the model looked at and repaired.
  const earlier = JSON.parse(fs.readFileSync(path.join(work, 'run-state.json'), 'utf8'));
  earlier.renders = { blind: 0, answered: true };
  earlier.rounds = { render: 1 };
  fs.writeFileSync(path.join(work, 'run-state.json'), JSON.stringify(earlier));

  renderDeckEntry(work, deck);
  const second = renderDeckEntry(work, deck);

  assert.equal(second.ok, false);
  assert.doesNotMatch(second.output, /--flagged|NOT READY/, 'a quiet converter flags nothing');

  const { execFileSync } = require('node:child_process');
  const reply = execFileSync(
    process.execPath,
    [
      path.join(__dirname, '..', 'skill', 'src', 'reply.js'),
      '--work',
      work,
      '--outcome',
      'clean',
      '--company',
      'Acme',
    ],
    { encoding: 'utf8' },
  );

  assert.match(
    reply,
    /Fallbacks: no visual check \(the renderer did not answer\)/,
    'the line render-deck.js promised is the line the user is handed',
  );
});

test('a run writes down which converter went quiet, and what it said', () => {
  // The evidence ticket 05 of the tightening map has to be answered from. The
  // sandbox carries both converters - decision 09's probe measured the whole step
  // at about two seconds - and a run there still delivered a deck nobody looked
  // at. Whether soffice was missing, killed at the 30-second bound, or ran and
  // wrote no PDF are three different findings with three different fixes, and
  // render.js words all three apart already. Until this they were worded only
  // into stderr, which lives in a chat transcript; the work directory a host run
  // is judged from carried a bare count. That is the same shape of loss as the
  // September 2026 run, whose timings went with its deleted work directory.
  const { work, deck } = startedRun();

  const blind = renderDeckEntry(work, deck);

  assert.equal(blind.ok, false, 'no converter means no images');
  const [why] = runState(work).renders.reasons;
  assert.ok(why, 'the run recorded why, not only that');
  assert.match(why, /soffice/, 'named to the converter, because the two fail independently');
  assert.match(
    why,
    /not installed/,
    'and to the cause, which is what tells an absent converter from a slow one',
  );
});

test('two blind renders keep both causes, because they need not be the same one', () => {
  // A sandbox where soffice is slow enough to be killed once and then starts
  // cold the second time is a different story from one where it is simply not
  // there, and only the pair of causes tells them apart. Keeping the last would
  // read as the run's whole experience of its converter.
  const { work, deck } = startedRun();

  renderDeckEntry(work, deck);
  renderDeckEntry(work, deck);

  assert.equal(runState(work).renders.reasons.length, 2, 'one line per attempt');
  assert.equal(runState(work).renders.blind, 2, 'and the cap still counted both');
});
