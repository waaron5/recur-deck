#!/usr/bin/env node
// The content gate's entry point. Bundled to <skill>/scripts/check-content.js,
// so it runs from the bundle alone with no package installs at run time.
//
//   node <skill-dir>/scripts/check-content.js --input run.json
//
// It reads the same run file build-deck.js does and reports what the countable
// writing rules find, without building anything:
//
//   {"ok": true, "findings": []}
//
//   {"ok": false, "findings": [
//     {"slide": 2, "field": "thesis.here.header", "rule": "fit",
//      "message": "needs about 5.91in of a 5.55in line: make it shorter"}
//   ]}
//
// The point of running it before the build is that a run repairs the fields it
// names and runs it again, rather than building a deck and discovering the copy
// was wrong afterwards. Each finding names one field, so a repair rewrites only
// what failed.
//
// It exits non-zero when there is anything to fix, so a run cannot read past a
// failure by accident.

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('./args.js');
const { checkRun } = require('./content-gate.js');
const { openRunState, runStateFile, stageTimer } = require('./run-state.js');

/** Times this stage, which is the countable rules over the run's copy. */
const mark = stageTimer();

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error('usage: check-content.js --input run.json');

  const findings = checkRun(JSON.parse(fs.readFileSync(args.input, 'utf8')));
  const ok = findings.length === 0;

  // A gate that passes is not a repair round. The budget bounds how many times
  // a run may rewrite its way out of trouble, and copy that came out right the
  // first time never asked for one.
  const spend = ok ? undefined : spendRound(args.input);

  mark(path.dirname(path.resolve(args.input)), 'check-content');

  console.log(JSON.stringify({ ok, findings, ...spend }, null, 2));
  if (!ok) process.exitCode = 1;
}

/**
 * Take one of the run's three content rounds, and say what is left.
 *
 * The count lives beside the run file because each round is its own process:
 * this one cannot see the two before it except by reading what they wrote down.
 *
 * @param {string} input  The run file, which the run's state sits beside.
 */
function spendRound(input) {
  const file = runStateFile(path.dirname(path.resolve(input)));

  // The gate stands on its own. A run file with no run beside it is someone
  // trying the rules out, and refusing it would make a started run a
  // precondition for checking copy, which it is not.
  if (!fs.existsSync(file)) return undefined;

  const spent = openRunState({ file }).spend('content');
  if (spent.allowed) return { round: spent.round };

  // Out of rounds, with the copy still failing. Saying so is not enough on its
  // own: a run told only "no" will try the same thing again, so it is told what
  // to do instead.
  return {
    round: spent.round,
    budgetSpent: true,
    advice:
      `${spent.reason}: stop repairing and deliver a flagged deck with ` +
      'build-deck.js --flagged, listing what is still wrong by slide.',
  };
}

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
