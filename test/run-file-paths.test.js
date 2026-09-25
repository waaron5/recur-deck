// What the paths inside a run file are read against.
//
// The model writes them as it makes them - `work/buildops/logo.png` beside
// `work/run.json` - and a short path carries no start point of its own. The
// build used to take that start point from the folder it was invoked in, so the
// same run file meant different files from different folders. A September 2026
// run recorded its logos that way and was built from inside `work`; every path
// resolved one level too deep, every company fell back to a text wordmark, and
// the deck shipped with eight of them. Nothing failed: a logo that cannot be
// read is a designed fallback, so the run had no reason to stop.
//
// These drive the entry point from a directory that is not the run file's, which
// is the only place the difference shows.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  tempDir,
  openPptx,
  ensureBuilt,
  researchWith,
  TEST_HEADQUARTERS,
  TEST_CREDIT,
} = require('./helpers.js');

/** The bundled entry point, because the sandbox runs that one and not the source. */
async function buildScript() {
  const { stageDir } = await ensureBuilt();
  return path.join(stageDir, 'scripts', 'build-deck.js');
}
const fixture = (name) => path.join(__dirname, 'fixtures', name);

/**
 * A run file whose logo and photo are named the way the model names them:
 * relative to the run file, in a folder underneath it.
 *
 * The target is the only company given a logo, because slide 3 places the
 * target's mark by the same path rule as every competitor's - decision 01 of the
 * tightening map left the market map as the only slide that places one at all.
 */
function runWithRelativePaths() {
  const dir = tempDir('recur-paths-');
  fs.mkdirSync(path.join(dir, 'usft'), { recursive: true });
  fs.copyFileSync(fixture('usft-logo.png'), path.join(dir, 'usft', 'logo.png'));
  fs.copyFileSync(fixture('oklahoma-city-skyline.jpg'), path.join(dir, 'landmark.jpg'));

  const research = researchWith();
  const companies = research.marketMap.companies.map((company) =>
    /** @type {{target?: boolean}} */ (company).target
      ? {
          ...company,
          logo: {
            file: 'usft/logo.png',
            source: 'https://www.usfleettracking.com/',
            verified: true,
          },
        }
      : company,
  );

  fs.writeFileSync(
    path.join(dir, 'run.json'),
    JSON.stringify({
      ...research,
      headquarters: TEST_HEADQUARTERS,
      identification: 'Matched the prompt to usfleettracking.com.',
      landmark: { file: 'landmark.jpg', credit: TEST_CREDIT },
      marketMap: { ...research.marketMap, companies },
    }),
  );
  return dir;
}

/**
 * One company's own lines out of slide 3's notes.
 *
 * Every company is a heading with its lines indented under it, so a block ends
 * at the next unindented line. Read with a plain search instead, a `Mark:` line
 * belonging to the company below would answer for the one above.
 *
 * @param {string} notes
 * @param {string} company
 */
function blockFor(notes, company) {
  // The notes part writes CRLF, so the carriage return goes before anything is
  // compared: a heading read with one on the end matches no company at all.
  const lines = notes.split(/\r?\n/);
  const at = lines.findIndex((line) => line.replace(/ \(target\)$/, '') === company);
  assert.notEqual(at, -1, `slide 3's notes name ${company}`);

  const rest = lines.slice(at + 1);
  const ends = rest.findIndex((line) => line.length > 0 && !line.startsWith('  '));
  return rest.slice(0, ends === -1 ? rest.length : ends).join('\n');
}

/** Build from `cwd`, which is never the run file's own directory here. */
async function build(runDir, cwd) {
  const outDir = tempDir('recur-paths-out-');
  const printed = execFileSync(
    process.execPath,
    [await buildScript(), '--input', path.join(runDir, 'run.json'), '--out', outDir],
    { cwd, encoding: 'utf8' },
  );
  return JSON.parse(printed).file;
}

test('a logo named relative to the run file is placed, whatever folder the build runs in', async () => {
  const runDir = runWithRelativePaths();

  // The run file's parent: the exact shape that broke the September run, where
  // `usft/logo.png` from here names a file that is not there.
  const deck = await openPptx(await build(runDir, path.dirname(runDir)));
  const notes = await deck.notesText(3);
  assert.ok(notes, 'slide 3 carries speaker notes');
  const target = blockFor(notes, 'US Fleet Tracking');

  assert.match(
    target,
    /Logo: https:\/\/www\.usfleettracking\.com\/ \(258x27px, from png\)/,
    "the target's mark came from the file the run file pointed at",
  );
  assert.doesNotMatch(
    target,
    /Mark: text wordmark/,
    'so the target is not set as type, which is what an unreadable path produces',
  );
});

test('the same run file builds the same deck from every folder', async () => {
  const runDir = runWithRelativePaths();

  const fromParent = await openPptx(await build(runDir, path.dirname(runDir)));
  const fromInside = await openPptx(await build(runDir, runDir));

  // Both decks, not one: a rule that held only where the build happened to be
  // invoked is the rule that was already there.
  assert.deepEqual(
    await fromInside.imageHashes(3),
    await fromParent.imageHashes(3),
    'the same marks land on slide 3 either way',
  );
});
