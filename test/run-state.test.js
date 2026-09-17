// The repair budget, and the run's memory of what it has already spent.
//
// Decision 07 bounds a run at 3 content rounds, 2 render rounds, and no new
// round after about 12 minutes, which is what keeps a run inside the 15-minute
// limit. The limits are written here as the decision's own numbers rather than
// read back out of the module, so a test can disagree with the code instead of
// agreeing with it by construction.
//
// The reason any of this is written to a file: every entry point the skill ships
// is its own `node` process. A counter held in memory would reset between the
// content gate and the build, and a budget that resets is not a budget.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { openRunState } = require('../skill/src/run-state.js');
const { tempDir } = require('./helpers.js');

/** A fresh state file, in a directory of its own. */
const stateFile = () => path.join(tempDir('recur-state-'), 'run-state.json');

test('the content budget is spent across processes, not inside one', () => {
  const file = stateFile();

  // Each round is a separate open, because in a real run each one is a separate
  // invocation of check-content.js. This is the behaviour the file exists for.
  for (const round of [1, 2, 3]) {
    const spent = openRunState({ file }).spend('content');
    assert.equal(spent.allowed, true, `content round ${round} is inside the budget`);
    assert.equal(spent.round, round, 'the round number survives the process that spent it');
  }

  const fourth = openRunState({ file }).spend('content');
  assert.equal(fourth.allowed, false, 'decision 07 allows three content rounds, not four');
  assert.match(String(fourth.reason), /3 content/, 'and the reason says what ran out');
});

test('no round starts once the run is out of time, however many are left', () => {
  // The other half of the budget. Three content rounds can each be cheap and
  // still leave a run past its fifteen minutes, because the research and the
  // renders in between are not free. Decision 07 stops a new round at about
  // twelve, which leaves time for the round already running to finish.
  const file = stateFile();
  let clock = 0;
  const now = () => clock;

  const started = openRunState({ file, now });
  assert.equal(started.startedAt, 0);

  clock = 12 * 60 * 1000 + 1;

  const later = openRunState({ file, now });
  assert.equal(
    later.startedAt,
    0,
    'the run started when it started, not when this process opened the file',
  );

  const late = later.spend('content');
  assert.equal(late.allowed, false, 'a round starting now would outlast the run');
  assert.equal(late.round, 0, 'and no round was spent finding that out');
  assert.match(String(late.reason), /12 minutes/, 'the reason names the cutoff');
});

test('what the run fell back to outlives the process that noticed it', () => {
  // The ladder is walked and the competitor wordmarks are counted during the
  // build. The reply that has to name them is written by a different process,
  // minutes later, and decision 07 requires it to name them exactly - so this
  // is the other thing the file is for.
  const file = stateFile();

  const building = openRunState({ file });
  building.noteFallback('metro landmark (Dallas, Texas)');
  building.noteFallback('2 competitor wordmarks');
  building.noteDefect({ slide: 3, message: 'only four competitors are placed' });

  const replying = openRunState({ file });

  assert.deepEqual(
    replying.fallbacks,
    ['metro landmark (Dallas, Texas)', '2 competitor wordmarks'],
    'in the order they happened, which is the order the reply lists them',
  );
  assert.deepEqual(replying.defects, [
    { slide: 3, message: 'only four competitors are placed' },
  ]);
});
