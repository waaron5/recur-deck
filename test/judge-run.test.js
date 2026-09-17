// The judging harness ticket 09 does its practice pass with.
//
// The ticket's judgment is a person's: the deck is opened in real PowerPoint and
// checked against the critical-defect list, with facts and competitor choices
// spot-checked against the run's speaker notes. None of that is automatable, and
// this does not try to automate it. What it does is put everything mechanical in
// front of the person at once - the structural verdict, the notes carrying the
// sources, and where the run's minutes went - so the judgment is the only part
// left to do by hand.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { buildDeck } = require('../skill/src/deck.js');
const { readNotes } = require('../skill/src/structure.js');
const { runStateFile } = require('../skill/src/run-state.js');
const { GENERATED_SLIDE_NUMBERS } = require('../skill/src/design.js');
const {
  ensureBuilt,
  tempDir,
  testPhoto,
  TEST_HEADQUARTERS,
  TEST_CREDIT,
  TEST_THESIS,
  TEST_MARKET_MAP,
} = require('./helpers.js');

const JUDGE = path.join(__dirname, '..', 'scripts', 'judge-run.js');

/** One real deck, built once for every case here. */
let deck = null;

async function built() {
  if (!deck) {
    deck = (async () => {
      const { stageDir } = await ensureBuilt();
      const work = tempDir('recur-judge-');
      const file = await buildDeck({
        company: 'US Fleet Tracking',
        assetsDir: path.join(stageDir, 'assets'),
        outDir: work,
        headquarters: TEST_HEADQUARTERS,
        identification: 'Matched the prompt to usfleettracking.com.',
        rejected: ['US Fleet Tracking LLC of Tulsa: no website of its own'],
        landmark: { photo: testPhoto(), credit: TEST_CREDIT },
        thesis: TEST_THESIS,
        marketMap: TEST_MARKET_MAP,
      });
      return { file, work };
    })();
  }
  return deck;
}

/** The harness, as a person runs it over a delivered deck. */
function judge(args) {
  return execFileSync(process.execPath, [JUDGE, ...args], { encoding: 'utf8' });
}

test('the notes reader returns what slides 1-3 carry, by slide', async () => {
  // The harness needs the notes, and structure.js already reads them to check
  // they are there. Reading them a second way would be a second parser to keep
  // in step with the first.
  const { file } = await built();
  const notes = await readNotes(file);

  for (const slide of GENERATED_SLIDE_NUMBERS) {
    assert.ok(notes[slide], `slide ${slide} carries the run's source record`);
  }
  assert.match(notes[1], /usfleettracking\.com/, 'slide 1 records how the company was identified');
  assert.match(notes[3], /samsara\.com/i, 'slide 3 records the evidence behind each competitor');
});

test('the harness puts the source record in front of the person judging', async () => {
  // Criterion 2: facts and competitor choices are spot-checked against the
  // run's speaker notes. This is the step that makes that possible without
  // opening the notes pane on three slides by hand.
  const { file } = await built();
  const printed = judge(['--deck', file]);

  assert.match(printed, /US Fleet Tracking/, 'the deck says which company it is for');
  assert.match(printed, /usfleettracking\.com/, "slide 1's identification is shown");
  assert.match(printed, /Tulsa/, 'including the candidates the run rejected');
  assert.match(printed, /samsara\.com/i, "slide 3's competitor evidence is shown");
});

test('the harness reports the structural verdict rather than making the person look', async () => {
  const { file } = await built();
  const printed = judge(['--deck', file]);

  assert.match(printed, /\b9 slides\b/, 'the slide count is stated');
  assert.match(printed, /passes|no structural/i, 'a sound deck is reported as sound');
});

test('a deck with a structural defect is reported as one, and the harness still runs', async () => {
  // A broken deck is exactly when a person most needs the rest of the report,
  // so a defect is something to print rather than something to throw over.
  const broken = path.join(tempDir('recur-judge-broken-'), 'Recur x Acme.pptx');
  fs.writeFileSync(broken, Buffer.from('this is not a PowerPoint package'));

  const printed = judge(['--deck', broken]);
  assert.match(printed, /does not reopen|unopenable/i, 'the file is named as the defect');
});

test('the harness says where the run\'s minutes went, against the fifteen-minute limit', async () => {
  // Criteria 4 and 5: stage timings recorded, a typical run around ten minutes,
  // none over fifteen. The gaps between stages are the model's time, which is
  // most of a run, so they are what the report has to show.
  const { file, work } = await built();

  // A run's length is the last mark it recorded, not the time since it started:
  // a deck judged the morning after a run did not take all night.
  fs.writeFileSync(
    runStateFile(work),
    JSON.stringify({
      startedAt: Date.now() - 40 * 60 * 1000,
      rounds: { content: 1 },
      fallbacks: ['metro landmark (Dallas, Texas)'],
      defects: [],
      stages: [
        { stage: 'start-run', ms: 40, elapsedMs: 40 },
        { stage: 'check-content', ms: 1200, elapsedMs: 5 * 60 * 1000 },
        { stage: 'build-deck', ms: 4200, elapsedMs: 8 * 60 * 1000 },
      ],
    }),
  );

  const printed = judge(['--deck', file, '--work', work]);

  assert.match(printed, /start-run/, 'each stage is named');
  assert.match(printed, /build-deck/);
  assert.match(printed, /metro landmark/, 'what the run fell back to is shown, for the quality notes');
  assert.match(printed, /\b8m\b/, "the total is the run's last mark, reported in minutes");
  assert.match(printed, /within|under/i, 'and judged against the limit rather than left to the reader');
  // The 4m gap between the gate and the build is the model's research time, and
  // it is the biggest single thing in this run.
  assert.match(printed, /model/i, "the time that is not the code's is attributed");
});

test('a run that went over fifteen minutes is called a failure, not a long run', async () => {
  // Decision 04: "a run over 15 minutes fails". The harness must not soften
  // that into an observation, because it is the bar the practice pass judges by.
  const { file } = await built();
  const work = tempDir('recur-judge-slow-');

  fs.writeFileSync(
    runStateFile(work),
    JSON.stringify({
      startedAt: Date.now() - 16 * 60 * 1000,
      rounds: {},
      fallbacks: [],
      defects: [],
      stages: [
        { stage: 'start-run', ms: 40, elapsedMs: 40 },
        { stage: 'reply', ms: 30, elapsedMs: 16 * 60 * 1000 },
      ],
    }),
  );

  const printed = judge(['--deck', file, '--work', work]);
  assert.match(printed, /fail/i, 'over fifteen minutes is a failed run');
});

test('the harness lists what only a person can judge, so the pass is not half done', async () => {
  // The critical-defect list from decision 04. Four of its six entries cannot be
  // checked by code at all - invented facts, another company's logo, a
  // competitor that does not compete, text that is illegible - and a report that
  // printed only the mechanical half would read as a pass.
  const { file } = await built();
  const printed = judge(['--deck', file]);

  assert.match(printed, /PowerPoint/, 'the person is told to open it in PowerPoint');
  for (const pattern of [/invented|false/i, /logo/i, /compet/i, /overflow|illegible/i]) {
    assert.match(printed, pattern, 'every defect only an eye catches is listed to check');
  }
});
