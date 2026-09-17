#!/usr/bin/env node
// The run's last word. Bundled to <skill>/scripts/reply.js, so it runs from the
// bundle alone with no package installs at run time.
//
//   node <skill-dir>/scripts/reply.js --work work --outcome clean \
//     --company "US Fleet Tracking" --headquarters "Oklahoma City, Oklahoma"
//
// It prints the reply to say, and nothing else. Copy it out as it comes.
//
// Two things make this worth a script rather than a paragraph of instructions.
// The template is fixed by decision 07 and a template rewritten from memory each
// time is one that drifts - and the lines that drift first are the conditional
// ones, which are exactly the lines carrying bad news. And the facts those lines
// need were recorded by processes that have since exited: the ladder wrote down
// what it settled for during the build, and the gate wrote down what it could
// not repair. Reading them back is more reliable than carrying them.
//
//   --outcome   clean | flagged | evidence-failure
//   --work      the directory holding run.json, for what the run recorded
//   --company, --headquarters, --assumption
//   --defects   "3:only four competitors|1:no usable cover photo", added to
//               whatever the run already recorded
//   --best-effort  why the target sits outside the covered scope
//   --could-not-establish, --tried, --fix   (evidence failures)

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('./args.js');
const { outcomeReply } = require('./outcome.js');
const { openRunState, runStateFile } = require('./run-state.js');

const USAGE =
  'usage: reply.js --outcome clean|flagged|evidence-failure [--work <dir>] ' +
  '[--company <name>] [--headquarters <city>] [--assumption <line>] ' +
  '[--defects "<slide>:<what>|<slide>:<what>"] [--best-effort <reason>] ' +
  '[--could-not-establish <what>] [--tried <where>] [--fix <what to send>]';

/**
 * Defects named on the command line, as "3:only four competitors|1:no photo".
 *
 * These are the ones the model is still holding when the budget runs out, and
 * they join whatever earlier stages already wrote down. A reply carrying only
 * one of the two sources would under-report, which on this template is the
 * failure that matters: it is the list someone checks before mailing.
 *
 * @param {string} [value]
 * @returns {{slide: number, message: string}[]}
 */
function defectsNamed(value) {
  if (!value) return [];

  return String(value)
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const at = entry.indexOf(':');
      if (at < 0) return { slide: 0, message: entry };

      const slide = Number(entry.slice(0, at).trim());
      return {
        slide: Number.isFinite(slide) ? slide : 0,
        message: entry.slice(at + 1).trim(),
      };
    });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.outcome) throw new Error(USAGE);

  const recorded = whatTheRunRecorded(args.work);

  console.log(
    outcomeReply({
      outcome: /** @type {'clean' | 'flagged' | 'evidence-failure'} */ (args.outcome),
      company: args.company,
      headquarters: args.headquarters,
      assumption: args.assumption,
      fallbacks: recorded.fallbacks,
      bestEffort: args['best-effort'],
      // What the run wrote down as it went, then what the model is still
      // holding at the end.
      defects: [...recorded.defects, ...defectsNamed(args.defects)],
      couldNotEstablish: args['could-not-establish'],
      tried: args.tried,
      fix: args.fix,
    }),
  );
}

/**
 * The fallbacks and defects earlier stages wrote down.
 *
 * A reply asked for without a run behind it is still a reply: it simply has
 * nothing recorded to add, which is the right answer for an evidence failure
 * that ended before any state existed.
 *
 * @param {string} [work]
 */
function whatTheRunRecorded(work) {
  if (!work) return { fallbacks: [], defects: [] };

  const file = runStateFile(work);
  if (!fs.existsSync(file)) return { fallbacks: [], defects: [] };

  const state = openRunState({ file });
  return { fallbacks: state.fallbacks, defects: state.defects };
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
