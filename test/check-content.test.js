// The content gate as a run actually calls it: one process per round, spending
// from a budget that outlives each of them.
//
// content-gate.test.js covers what the rules find. This covers what the gate
// does about running out of chances to fix it, which is the half that decides
// whether a run stops or loops - and it has to be driven through the command
// line, because the budget only means anything across separate processes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { tempDir, researchWith } = require('./helpers.js');

const GATE = path.join(__dirname, '..', 'skill', 'src', 'check-content.js');

/**
 * Run the gate over a run file and read back what it printed.
 *
 * It exits non-zero whenever there is anything to fix, which is deliberate, so
 * the output has to be recovered from the thrown error as well.
 */
function check(runFile) {
  try {
    return JSON.parse(execFileSync(process.execPath, [GATE, '--input', runFile], { encoding: 'utf8' }));
  } catch (error) {
    const failed = /** @type {{stdout?: string, stderr?: string}} */ (error);
    return JSON.parse(failed.stdout || failed.stderr || '{}');
  }
}

/** A run file whose copy breaks a countable rule, beside a started run's state. */
function runThatFailsTheGate() {
  const dir = tempDir('recur-rounds-');
  const runFile = path.join(dir, 'run.json');

  fs.writeFileSync(
    runFile,
    JSON.stringify(
      researchWith({
        thesis: {
          here: {
            header:
              'Commercial fleets are mid-cycle in adopting real-time telematics across every single region today',
          },
        },
      }),
    ),
  );

  // Stage 0 wrote this beside the run file when the run began.
  fs.writeFileSync(
    path.join(dir, 'run-state.json'),
    JSON.stringify({ startedAt: Date.now(), rounds: {}, fallbacks: [], defects: [] }),
  );

  return runFile;
}

test('the gate spends a content round each time, and stops at three', () => {
  const runFile = runThatFailsTheGate();

  for (const round of [1, 2, 3]) {
    const result = check(runFile);
    assert.equal(result.ok, false, 'the copy still breaks a countable rule');
    assert.equal(result.round, round, `this is content round ${round} of the run, not of the process`);
  }

  // Decision 07 stops here. A fourth rewrite is not offered, because the run
  // has fifteen minutes and has now spent its chances of talking its way out.
  const spent = check(runFile);
  assert.equal(spent.budgetSpent, true);
  assert.match(
    String(spent.advice),
    /flag/i,
    'and the run is told what to do instead, rather than left to loop',
  );
});

test('a run with no state file is checked, not refused', () => {
  // check-content.js is useful on its own, and a run file with no run beside it
  // is how someone tries the gate out. Refusing would make the budget a
  // precondition for checking copy, which it is not.
  const dir = tempDir('recur-nostate-');
  const runFile = path.join(dir, 'run.json');
  fs.writeFileSync(runFile, JSON.stringify(researchWith()));

  const result = check(runFile);

  assert.equal(result.ok, true, 'the clean fixture passes on its own merits');
  assert.equal(result.round, undefined, 'and no round was invented to account for it');
});
