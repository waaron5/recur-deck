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

test('a render round is taken when the converter answers, and not before', () => {
  // Decision 03 of the tightening map splits the render round in two. Asking
  // whether one is available happens before a converter is spawned; taking one
  // happens only once images exist. A round bounds repair, and a render with no
  // image produced nothing to repair from.
  const file = stateFile();

  const asking = openRunState({ file });
  assert.equal(asking.mayRender().allowed, true, 'the first render is inside the budget');
  assert.equal(asking.mayRender().allowed, true, 'and asking twice spends nothing');

  assert.equal(openRunState({ file }).noteRound('render'), 1, 'the answered render is round 1');
  assert.equal(openRunState({ file }).noteRound('render'), 2, 'and the next one is round 2');

  const third = openRunState({ file }).mayRender();
  assert.equal(third.allowed, false, 'decision 07 allows two render rounds, not three');
  assert.match(String(third.reason), /2 render/, 'and the reason says what ran out');
  assert.equal(third.cause, 'rounds', 'named so the caller can say what to do instead');
});

test('a render that answers nothing costs no repair round', () => {
  // The September 2026 failure: the renderer timed out twice, both rounds were
  // charged, and the deck went out unseen with its repair budget already gone.
  const file = stateFile();

  openRunState({ file }).noteBlindRender();

  const after = openRunState({ file });
  assert.equal(after.mayRender().allowed, true, 'a render that showed nothing bought no round');
  assert.equal(after.noteRound('render'), 1, 'so the first repair round is still round 1');
});

test('two renders that answer nothing are all a run waits for', () => {
  // Not charging a round cannot mean retrying forever. Two blind renders at the
  // 30-second bound cost about a minute, and then the run stops asking.
  const file = stateFile();

  const first = openRunState({ file }).noteBlindRender();
  assert.equal(first.blind, 1);
  assert.equal(first.left, 1, 'one more attempt is worth making');

  const second = openRunState({ file }).noteBlindRender();
  assert.equal(second.blind, 2);
  assert.equal(second.left, 0, 'and then no more');

  const third = openRunState({ file }).mayRender();
  assert.equal(third.allowed, false, 'the third is refused before a converter is spawned');
  assert.equal(third.cause, 'blind', 'for a different reason than a spent repair round');
  assert.equal(third.round, 0, 'and none of it touched the repair budget');
});

test('a run whose eyes never opened says so on its own Fallbacks line', () => {
  // The honest line decision 03 asks for, built from what the run recorded
  // rather than from the model remembering to mention it.
  const file = stateFile();

  openRunState({ file }).noteBlindRender();

  assert.deepEqual(openRunState({ file }).fallbacks, [
    'no visual check (the renderer did not answer)',
  ]);
});

test('a render that did answer leaves no claim that nothing was seen', () => {
  // A first attempt that timed out and a second that worked is a run that saw
  // its slides. Saying otherwise would make the line stop carrying information.
  const file = stateFile();

  openRunState({ file }).noteBlindRender();

  const answered = openRunState({ file });
  answered.noteRenderAnswered();
  answered.noteRound('render');

  assert.deepEqual(openRunState({ file }).fallbacks, [], 'nothing was fallen back to');
});

test('the unseen line sits beside the fallbacks a run wrote down itself', () => {
  // The unseen line is derived and the others are stored, so they reach the
  // reply by two different routes. A getter that returned only one of them would
  // drop either a ladder rung or the missing check from the Fallbacks: line, and
  // that line is what someone reads before mailing the deck.
  const file = stateFile();

  const building = openRunState({ file });
  building.noteFallback('metro landmark (Dallas, Texas)');
  building.noteBlindRender();

  assert.deepEqual(openRunState({ file }).fallbacks, [
    'metro landmark (Dallas, Texas)',
    'no visual check (the renderer did not answer)',
  ]);
});

test('a run that rendered, repaired, then went blind is a run whose deck went unseen', () => {
  // The case that made the advice lie. An earlier render looked at an earlier
  // deck; the one being delivered was repaired after it and never seen. Reporting
  // that this run was visually checked would put the reassurance on the wrong
  // deck, and drop the only line saying otherwise.
  const file = stateFile();

  const first = openRunState({ file });
  first.noteRenderAnswered();
  first.noteRound('render');

  openRunState({ file }).noteBlindRender();

  assert.deepEqual(
    openRunState({ file }).fallbacks,
    ['no visual check (the renderer did not answer)'],
    'the deck on the table is the one the line is about',
  );
});

test('when both limits are gone, the spent repair rounds are what decides', () => {
  // A run that rendered twice has looked at its slides twice, and a defect that
  // outlived both is decision 07's flagged deck. Answering "deliver, do not flag"
  // to that run - because its converter also went quiet twice - would hand over a
  // deck with a known defect and no warning on it.
  const file = stateFile();

  const run = openRunState({ file });
  run.noteRenderAnswered();
  run.noteRound('render');
  run.noteRenderAnswered();
  run.noteRound('render');
  run.noteBlindRender();
  run.noteBlindRender();

  const refused = openRunState({ file }).mayRender();
  assert.equal(refused.allowed, false);
  assert.equal(refused.cause, 'rounds', 'the repair budget is the answer, not the blind cap');
  assert.match(String(refused.reason), /2 render/);
});

test('a render that answers does not buy back a run it already spent waiting', () => {
  // The blind cap bounds how long a run waits, and waiting already happened. A
  // sandbox that has gone quiet twice has said what it is.
  const file = stateFile();

  openRunState({ file }).noteBlindRender();
  openRunState({ file }).noteRenderAnswered();

  assert.equal(openRunState({ file }).renders.blind, 1, 'the count is spent for the run');
});
