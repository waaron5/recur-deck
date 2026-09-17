// Where a run's minutes actually went.
//
// Ticket 09 has to show that a typical run sits around ten minutes and that no
// run exceeds fifteen. Timing the stages alone would answer the wrong question:
// the capability probe measured the render at about two seconds, and every code
// stage is in that range, so the code accounts for seconds out of ten minutes.
// The rest is the model - identifying the company, reading its site, choosing
// competitors - and that time sits in the gaps *between* the stages.
//
// So what is recorded is each stage's own duration and the elapsed time at the
// moment it finished, both measured from the run's start. The gaps between
// consecutive marks are the model's, and they are what a slow run has to be
// diagnosed from.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { openRunState, recordStage, runStateFile } = require('../skill/src/run-state.js');
const { RUN_BUDGET } = require('../skill/src/design.js');
const { tempDir, researchWith } = require('./helpers.js');

const GATE = path.join(__dirname, '..', 'skill', 'src', 'check-content.js');
const LOGO = path.join(__dirname, '..', 'skill', 'src', 'fetch-logo.js');

/** A started run: a state file beside a run file, the way stage 0 leaves it. */
function startedRun({ startedAt = Date.now(), research = researchWith() } = {}) {
  const dir = tempDir('recur-timing-');
  fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify(research));
  fs.writeFileSync(
    path.join(dir, 'run-state.json'),
    JSON.stringify({ startedAt, rounds: {}, fallbacks: [], defects: [], stages: [] }),
  );
  return dir;
}

const stateIn = (dir) => JSON.parse(fs.readFileSync(runStateFile(dir), 'utf8'));

test('a stage records its own duration and the elapsed time it finished at', () => {
  // Both numbers, because they answer different questions. The duration says
  // whether the code is slow; the elapsed mark says how far into the run the
  // stage happened, which is what makes the gap before it measurable.
  const file = path.join(tempDir('recur-stage-'), 'run-state.json');
  let clock = 0;
  const now = () => clock;

  openRunState({ file, now });

  clock = 90 * 1000;
  openRunState({ file, now }).noteStage({ stage: 'check-content', ms: 1200 });

  const [recorded] = openRunState({ file, now }).stages;
  assert.equal(recorded.stage, 'check-content');
  assert.equal(recorded.ms, 1200, "the stage's own duration");
  assert.equal(
    recorded.elapsedMs,
    90 * 1000,
    'measured from when the run began, not from when this process opened the file',
  );
});

test('the stages a run walked outlive the processes that walked them', () => {
  // The same reason the budget lives in a file: every stage is its own node
  // process, so a run's shape can only be read back from what each one wrote
  // down. A timeline held in memory would be one stage long.
  const dir = startedRun();

  recordStage(dir, 'start-run', 40);
  recordStage(dir, 'build-deck', 4200);
  recordStage(dir, 'render-deck', 2100);

  assert.deepEqual(
    openRunState({ file: runStateFile(dir) }).stages.map((entry) => entry.stage),
    ['start-run', 'build-deck', 'render-deck'],
    'in the order they happened, which is the order a timeline reads',
  );
});

test('a stage run without a started run records nothing, and invents nothing', () => {
  // check-content.js and render-deck.js are usable on their own - it is how
  // someone tries the rules out on copy, or looks at a deck they already have.
  // Timing must not be what turns that into a started run: a state file written
  // here would give the next real run a start time from someone's experiment.
  const dir = tempDir('recur-untimed-');

  recordStage(dir, 'check-content', 900);

  assert.equal(
    fs.existsSync(runStateFile(dir)),
    false,
    'no run was started, so there is nothing to record against',
  );
});

test('the gate records its stage as a real run calls it, one process per round', () => {
  // Driven through the command line, because that is the only place the
  // recording has to survive: the process that timed the stage has exited by
  // the time anything reads it back.
  const dir = startedRun({
    research: researchWith({
      thesis: {
        here: {
          header:
            'Commercial fleets are mid-cycle in adopting real-time telematics across every region today',
        },
      },
    }),
  });

  try {
    execFileSync(process.execPath, [GATE, '--input', path.join(dir, 'run.json')], {
      encoding: 'utf8',
    });
  } catch {
    // The gate exits non-zero when it has findings, which this copy does.
  }

  const [recorded] = stateIn(dir).stages;
  assert.equal(recorded.stage, 'check-content', 'the stage names itself');
  assert.ok(Number.isFinite(recorded.ms), 'and carries a duration');
  assert.ok(recorded.elapsedMs >= 0, 'measured against the run it belongs to');
});

test("the logo stage is timed, so its network time is not read as the model's", () => {
  // fetch-logo.js is a page fetch, a download and a raster, and SKILL.md calls
  // it once for the target and again for every competitor on the map. Untimed,
  // all of that would fall into the gap between two other stages - which the
  // judging harness captions as the model researching and judging, because that
  // is what a gap normally is. It would read as thinking time.
  //
  // Its logo goes to work/<competitor>, not to the directory the run's state is
  // in, which is why the stage takes --work rather than inferring it from --out.
  const dir = startedRun();

  try {
    execFileSync(
      process.execPath,
      [LOGO, '--site', 'http://127.0.0.1:1/', '--out', path.join(dir, 'acme'), '--work', dir],
      { encoding: 'utf8' },
    );
  } catch {
    // Nothing listens on port 1, so the fetch is refused at once. That is the
    // case worth testing: a stage that spent time and came back with nothing
    // still has to record having spent it.
  }

  const [recorded] = stateIn(dir).stages;
  assert.equal(recorded.stage, 'fetch-logo', 'a failed logo fetch is still time the run spent');
});

test('the run length a deck is judged against is the decision, not a comment', () => {
  // Decision 04 sets a typical run at about ten minutes and fails one over
  // fifteen. Ticket 09 judges every practice run against both, so they have to
  // be numbers the judging harness can read rather than prose in a ticket.
  assert.equal(RUN_BUDGET.typicalMs, 10 * 60 * 1000, 'a typical run is about ten minutes');
  assert.equal(RUN_BUDGET.limitMs, 15 * 60 * 1000, 'and a run over fifteen minutes fails');
  assert.ok(
    RUN_BUDGET.cutoffMs < RUN_BUDGET.limitMs,
    'the repair cutoff sits inside the limit, which is what it is for',
  );
});
