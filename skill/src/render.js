// Rendering slides to images, so the model can look at the deck it just built.
//
// Stage 7 of the unattended-run decision (issues/07-define-unattended-run.md):
// every deck is looked at. Slides 1-3 are rasterised and the model checks them
// for text that overflows, is clipped, overlaps something or is illegible, and
// for logos that landed wrong. What it finds is repaired by shortening copy -
// never by shrinking type - and the deck is built and rendered again.
//
// This is the second opinion rather than the guarantee. Decision 02 of the
// tightening map made the content gate authoritative on fit, so a line that does
// not fit its box never reaches a build, let alone a render. What is left here is
// what a measurement cannot see - and being a second opinion is what lets a run
// be honestly denied one: a converter that goes quiet costs the run seconds and
// no repair round, and the deck ships clean with the reply saying it was not
// looked at. Decision 03, and render-deck.js holds that half.
//
// The route is LibreOffice to PDF, then pdftoppm to PNG. Both tools were
// confirmed present in the sandbox by the capability check in decision 09, which
// measured the whole step at about 2 seconds. That is why this is a routine part
// of every run rather than something kept for when a deck looks wrong - and why
// the bound on it is 30 seconds rather than the two minutes it once was.
//
// What makes the image worth trusting is the typeface. The renderer has
// Liberation, Carlito and DejaVu and no Arial, so it substitutes - and
// Liberation Sans is metric-compatible with the Arial the deck declares, so
// every line breaks in the rendered image where PowerPoint will break it. That
// property is the reason design.js names Arial, and it is why this check
// predicts anything at all rather than just producing a picture.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { GENERATED_SLIDE_NUMBERS, RENDER } = require('./design.js');

/**
 * @typedef {{slide: number, file: string}} RenderedSlide
 * @typedef {(command: string, args: string[], options: {timeoutMs: number, cwd: string}) => void} Run
 * @typedef {Error & {missingConverter?: true}} RenderFailure
 */

/**
 * Render the generated slides to PNGs and return where they landed.
 *
 * Which slides and at what resolution are design values rather than arguments:
 * the six fixed Recur slides never change between runs, so rendering them would
 * be time a run has better uses for.
 *
 * `run` is a seam: the real one shells out, and a test passes its own to check
 * what this asks for without needing LibreOffice on the machine.
 *
 * @param {object} options
 * @param {string} options.file    The .pptx to render.
 * @param {string} options.outDir  Where the PDF and PNGs are written.
 * @param {Run} [options.run]
 * @returns {RenderedSlide[]}
 */
function renderSlides({ file, outDir, run = execute }) {
  if (!fs.existsSync(file)) throw new Error(`there is no deck to render at ${file}`);

  fs.mkdirSync(outDir, { recursive: true });

  const first = Math.min(...GENERATED_SLIDE_NUMBERS);
  const last = Math.max(...GENERATED_SLIDE_NUMBERS);

  // A repair round renders again into the same directory. Images from the last
  // round have to go first: pdftoppm pads its page numbers to the document's
  // page count, so a stale "slide-01.png" beside a fresh "slide-1.png" would be
  // collected as a second slide 1 - and the model would inspect the copy it
  // just repaired.
  for (const name of fs.readdirSync(outDir)) {
    if (/^slide-\d+\.png$/.test(name)) fs.rmSync(path.join(outDir, name), { force: true });
  }

  // A private profile directory, so this never contends with a LibreOffice that
  // is already running or leaves one behind holding a lock on the default one.
  //
  // The URL is built rather than concatenated, and from an absolute path. A
  // file: URL reads whatever follows its two slashes as a host name, so a
  // relative outDir made `file://work/render/.soffice-profile` - a profile on a
  // machine named `work`. LibreOffice does not refuse that. It waits for a host
  // that does not answer, until the bound below kills it and the run goes blind.
  // Every measurement of this step used an absolute directory and so never saw
  // it, while SKILL.md told the model to pass `--out work/render`: the September
  // 2026 ServiceTitan run went blind twice for this and nothing else, and the
  // same deck converts in about 3 seconds cold once the URL is well formed.
  // pathToFileURL also escapes the spaces and non-ASCII a built path can carry.
  const profile = pathToFileURL(path.resolve(outDir, '.soffice-profile')).href;
  run(
    'soffice',
    [
      '--headless',
      `-env:UserInstallation=${profile}`,
      '--convert-to',
      'pdf',
      '--outdir',
      outDir,
      file,
    ],
    { timeoutMs: RENDER.timeoutMs, cwd: outDir },
  );

  const pdf = path.join(outDir, `${path.basename(file, path.extname(file))}.pdf`);
  if (!fs.existsSync(pdf)) {
    throw new Error(`LibreOffice wrote no PDF for ${path.basename(file)}, so no slide could be rendered`);
  }

  const prefix = path.join(outDir, 'slide');
  run(
    'pdftoppm',
    ['-png', '-r', String(RENDER.dpi), '-f', String(first), '-l', String(last), pdf, prefix],
    { timeoutMs: RENDER.timeoutMs, cwd: outDir },
  );

  return collect(outDir, first, last);
}

/**
 * The images pdftoppm produced, paired with the slides they show.
 *
 * The directory is read rather than the file names predicted: pdftoppm pads its
 * page numbers to the width of the document's own page count, so the name is
 * "slide-1.png" in one deck and "slide-01.png" in another. Reading back what is
 * there also means a page that failed to render is missing here rather than
 * reported as a file that does not exist.
 *
 * @param {string} outDir
 * @param {number} first
 * @param {number} last
 * @returns {RenderedSlide[]}
 */
function collect(outDir, first, last) {
  const rendered = fs
    .readdirSync(outDir)
    .map((name) => ({ name, page: Number(name.match(/^slide-(\d+)\.png$/)?.[1]) }))
    // Only the pages that were asked for. Anything else in the directory is not
    // this render's business.
    .filter((entry) => Number.isInteger(entry.page) && entry.page >= first && entry.page <= last)
    .sort((a, b) => a.page - b.page)
    .map((entry) => ({ slide: entry.page, file: path.join(outDir, entry.name) }));

  const missing = [];
  for (let page = first; page <= last; page += 1) {
    if (!rendered.some((entry) => entry.slide === page)) missing.push(page);
  }
  if (missing.length > 0) {
    throw new Error(`the renderer produced no image for slide ${missing.join(', ')}`);
  }

  return rendered;
}

/**
 * Run one of the sandbox's converters.
 *
 * A missing tool is the one failure worth naming precisely: it means this
 * sandbox cannot render, which is a different problem from a deck that renders
 * badly, and a run that cannot tell them apart will repair copy that was fine.
 *
 * @type {Run}
 */
function execute(command, args, { timeoutMs, cwd }) {
  try {
    execFileSync(command, args, { cwd, timeout: timeoutMs, stdio: 'pipe' });
  } catch (error) {
    const failure = /** @type {NodeJS.ErrnoException & {killed?: boolean}} */ (error);
    if (failure.code === 'ENOENT') {
      // Tagged, not just worded. render-deck.js has to tell an absent converter
      // from one that merely hung - the second is worth asking again and the
      // first never will be - and recognising it by its sentence would make this
      // string load-bearing from another module.
      throw Object.assign(
        new Error(
          `${command} is not installed in this sandbox, so slides cannot be rendered and checked`,
        ),
        { missingConverter: /** @type {true} */ (true) },
      );
    }
    if (failure.killed) {
      throw new Error(`${command} did not finish within ${Math.round(timeoutMs / 1000)}s`);
    }
    throw new Error(`${command} failed: ${failure.message}`);
  }
}

// execute is exported for the tests: a missing converter is the one failure
// whose wording a run depends on, and the only way to provoke it honestly is to
// ask for a command that is really not there.
module.exports = { renderSlides, execute };
