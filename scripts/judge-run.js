#!/usr/bin/env node
// The practice pass, with everything mechanical already done.
//
//   node scripts/judge-run.js --deck "Recur x Acme.pptx" [--work work]
//
// Ticket 09 judges each practice run the way a release run will be judged:
// opened in real PowerPoint, checked against the critical-defect list, with
// facts and competitor choices spot-checked against the sources in the speaker
// notes. That judgment is a person's and this does not pretend otherwise. Four
// of decision 04's six critical defects - invented facts, another company's
// logo, a competitor that does not compete, text that is illegible - cannot be
// checked by code at all.
//
// What this does is remove every reason to do the mechanical half by hand: the
// structural verdict, the notes carrying the run's sources, and where the run's
// minutes went, printed together so the only thing left is the looking.
//
// It is a developer tool and is deliberately not bundled into the skill ZIP.
// Nobody at Recur runs a judging pass; the package stays the six entry points a
// run actually calls.

const fs = require('node:fs');
const path = require('node:path');

const { parseArgs } = require('../skill/src/args.js');
const { checkStructure, readNotes, SLIDE_COUNT } = require('../skill/src/structure.js');
const { openRunState, runStateFile } = require('../skill/src/run-state.js');
const {
  RUN_BUDGET,
  GENERATED_SLIDE_NUMBERS,
  FIXED_SLIDE_NUMBERS,
  SKILL_NAME,
} = require('../skill/src/design.js');
const { buildPackage } = require('./build-package.js');

const USAGE = 'usage: judge-run.js --deck <deck>.pptx [--work <dir>] [--assets <dir>]';

const REPO_ROOT = path.resolve(__dirname, '..');
const STAGED_ASSETS = path.join(REPO_ROOT, 'dist', SKILL_NAME, 'assets');

/**
 * The critical defects no code in this repo can see, in decision 04's own
 * order. They are printed every time, because a report that showed only the
 * mechanical half would read as a pass.
 */
const ONLY_AN_EYE_CATCHES = [
  'every company fact on slides 1-3 is true and supported by the source beside it in the notes, and none is invented',
  "the cover logo is this company's own current logo, not a customer's, a partner's, or a product sub-brand's",
  'every competitor on slide 3 exists, still trades under the name shown, and actually competes for the same buyer',
  'no text overflows its box, is clipped, overlaps another element, or is too small or too low-contrast to read',
  'each thesis bullet says something true of this company and not of any company (the swap test)',
  'the market map axes are dimensions buyers choose on, and every placement is defensible',
];

/** Seconds and minutes, the way a person reads a run length. */
function asClock(ms) {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/** A stage's own duration, which is milliseconds or a few seconds. */
const asDuration = (ms) => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`);

const out = [];
const line = (text = '') => out.push(text);
const heading = (text) => {
  line();
  line(text);
};

/**
 * Where the shipped reference slides are, for the structural check to compare
 * against. The staged package if it is built, and built if it is not: a check
 * that silently skipped slides 4-9 would report an out-of-order deck as sound.
 *
 * @param {string} [given]
 */
async function assetsDir(given) {
  if (given) return given;
  if (fs.existsSync(path.join(STAGED_ASSETS, `fixed-slide-${FIXED_SLIDE_NUMBERS[0]}.png`))) {
    return STAGED_ASSETS;
  }
  const { stageDir } = await buildPackage();
  return path.join(stageDir, 'assets');
}

/**
 * What the deterministic check says, so nobody counts slides by hand.
 *
 * A defect is printed rather than thrown over: a deck with something wrong with
 * it is exactly when the rest of this report is worth reading.
 *
 * @param {string} deck
 * @param {string} assets
 */
async function reportStructure(deck, assets) {
  heading('STRUCTURE');

  const defects = await checkStructure(deck, { assetsDir: assets });

  if (defects.length === 0) {
    line(
      `  ${SLIDE_COUNT} slides, slides ${FIXED_SLIDE_NUMBERS[0]}-${
        FIXED_SLIDE_NUMBERS[FIXED_SLIDE_NUMBERS.length - 1]
      } in order, speaker notes on slides ${GENERATED_SLIDE_NUMBERS[0]}-${
        GENERATED_SLIDE_NUMBERS[GENERATED_SLIDE_NUMBERS.length - 1]
      } — passes`,
    );
    return;
  }

  line(`  ${defects.length} structural defect${defects.length === 1 ? '' : 's'}, each a critical defect:`);
  for (const defect of defects) {
    line(`  - ${defect.slide === 0 ? 'the file' : `slide ${defect.slide}`}: ${defect.message}`);
  }
}

/**
 * Where the run's minutes went.
 *
 * The gaps between the marks are the point. Every code stage runs in seconds, so
 * a report of stage durations alone would account for a few seconds out of ten
 * minutes and explain nothing about a slow run. The time between one stage
 * finishing and the next starting is the model reading sites, choosing
 * competitors and writing copy, and that is where a run goes over.
 *
 * @param {string} work
 */
function reportTiming(work) {
  heading('TIMING');

  const file = runStateFile(work);
  if (!fs.existsSync(file)) {
    line(`  no run state beside ${work}, so this run recorded no timings`);
    return;
  }

  // Read through openRunState rather than straight out of the JSON. One of the
  // fallbacks a run reports is derived from its record rather than stored in it -
  // the missing visual check - so a reader that parsed the file itself would print
  // a different list from the one reply.js hands the user, which is the one thing
  // a judging pass must not do.
  //
  // Read-only, because this is the only thing that reads a host run's evidence
  // once the chat is closed. An ordinary open writes a blank record over any
  // state file it cannot parse - which a sandbox killed mid-save leaves - so the
  // command someone runs to find out what happened was the command that
  // destroyed the answer.
  const state = openRunState({ file, readOnly: true });

  if (state.damaged) {
    line(`  ${file} could not be read, so this run's record is damaged rather than empty`);
    line('  the file is left exactly as it was found; open it and see how far it got');
    return;
  }

  const stages = state.stages;

  if (stages.length === 0) {
    line('  the run recorded no stage marks, so it has no measured length');
    return;
  }

  let previous = 0;
  for (const mark of stages) {
    const waiting = Math.max(0, mark.elapsedMs - previous - mark.ms);
    const attributed = waiting > 1000 ? `   ${asClock(waiting)} of the model's time before it` : '';
    line(
      `  ${asClock(mark.elapsedMs).padStart(8)}  ${mark.stage.padEnd(14)} ${asDuration(mark.ms).padStart(7)}${attributed}`,
    );
    previous = mark.elapsedMs;
  }

  // The run's length is its last mark, not the time since it started: a deck
  // judged the morning after a run did not take all night.
  const total = stages[stages.length - 1].elapsedMs;
  const code = stages.reduce((sum, mark) => sum + mark.ms, 0);

  line();
  if (total > RUN_BUDGET.limitMs) {
    line(
      `  ${asClock(total)} total — FAILS the ${RUN_BUDGET.limitMs / 60000}-minute limit, so this run failed`,
    );
  } else if (total <= RUN_BUDGET.typicalMs) {
    line(
      `  ${asClock(total)} total — within the ${RUN_BUDGET.limitMs / 60000}-minute limit, and inside the ${
        RUN_BUDGET.typicalMs / 60000
      }-minute typical`,
    );
  } else {
    line(
      `  ${asClock(total)} total — within the ${RUN_BUDGET.limitMs / 60000}-minute limit, but over the ${
        RUN_BUDGET.typicalMs / 60000
      }-minute typical`,
    );
  }
  line(`  ${asDuration(code)} of that was code; the rest is the model researching and judging`);

  const rounds = Object.entries(state.rounds).filter(([, spent]) => spent > 0);
  if (rounds.length > 0) {
    line(`  repair rounds spent: ${rounds.map(([kind, spent]) => `${spent} ${kind}`).join(', ')}`);
  }

  // Blind renders are not repair rounds and are not counted as ones, so they would
  // otherwise vanish from the judged run - and a deck nobody could look at is
  // exactly what a judging pass wants flagged for the person doing the looking.
  const { blind, answered, reasons } = state.renders;
  if (blind > 0) {
    line(
      `  renders that showed nothing: ${blind}${
        answered ? ' (a later render answered)' : ' — this deck went unseen'
      }`,
    );
    // Each converter's own sentence, because the count says a render failed and
    // ticket 05 of the tightening map asks which one and why. An absent soffice
    // is a sandbox that cannot render at all; one killed at its bound is a
    // conversion that is too slow for the deck it was given; one that ran and
    // wrote no PDF is neither. They are three findings with three different
    // fixes, and this is the only place the distinction survives a closed chat.
    for (const why of reasons) line(`    ${why}`);
  }

  for (const fallback of state.fallbacks) line(`  Settled for: ${fallback}`);
  for (const defect of state.defects) {
    line(`  Recorded defect, slide ${defect.slide}: ${defect.message}`);
  }
}

/**
 * The run's source record, which is what the spot-check reads against.
 *
 * @param {string} deck
 */
async function reportNotes(deck) {
  heading('SOURCE RECORD  (check every fact and competitor on the slides against this)');

  let notes;
  try {
    notes = await readNotes(deck);
  } catch (error) {
    line(`  the deck does not open, so it carries no readable notes: ${message(error)}`);
    return;
  }

  for (const slide of GENERATED_SLIDE_NUMBERS) {
    const text = notes[slide];
    line();
    line(text ? `  slide ${slide} — ${text}` : `  slide ${slide} — no notes, which is a critical defect`);
  }
}

/** What is left after the code has said everything it can. */
function reportWhatOnlyAPersonCanJudge() {
  heading('NOW OPEN IT IN PowerPoint — the rest is judgment, not code');
  for (const check of ONLY_AN_EYE_CATCHES) line(`  [ ] ${check}`);
  line();
  line('  A critical defect fails the run. Anything else is a quality note, which does');
  line('  not - but a quality note that keeps appearing across runs is a workflow fix.');
}

const message = (error) => (error instanceof Error ? error.message : String(error));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.deck) throw new Error(USAGE);

  const deck = path.resolve(args.deck);
  if (!fs.existsSync(deck)) throw new Error(`no deck at ${deck}`);

  line(path.basename(deck));

  await reportStructure(deck, await assetsDir(args.assets));
  if (args.work) reportTiming(args.work);
  await reportNotes(deck);
  reportWhatOnlyAPersonCanJudge();

  console.log(out.join('\n'));
}

main().catch((error) => {
  console.error(message(error));
  process.exitCode = 1;
});
