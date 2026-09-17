// What one run remembers about itself: when it started, and what it has spent.
//
// Decision 07 bounds repairs at 3 content rounds and 2 render rounds, with no
// new round after about 12 minutes. Every one of those limits spans stages, and
// every stage the skill ships is its own `node` process - check-content.js,
// build-deck.js, render-deck.js. A counter held in memory resets between them,
// so it would report "round 1" three times over and bound nothing at all. The
// count lives in a file beside the run file for that reason alone.
//
// The start time is written at the first open and never rewritten, which is the
// same point: a clock each process started for itself would read zero elapsed
// every time, and the cutoff would never once fire.
//
// This module decides nothing about what to repair. It answers whether there is
// a round left to spend, and remembers what the run has had to fall back to, so
// the reply at the end can say so without the model keeping notes.

const fs = require('node:fs');
const path = require('node:path');

const { RUN_BUDGET } = require('./design.js');

/**
 * @typedef {'content' | 'render'} RoundKind
 * @typedef {{allowed: boolean, round: number, reason?: string}} Spend
 * @typedef {import('./outcome.js').ReportedDefect} ReportedDefect
 * @typedef {{stage: string, ms: number, elapsedMs: number}} StageMark
 * @typedef {{
 *   startedAt: number,
 *   rounds: Record<string, number>,
 *   fallbacks: string[],
 *   defects: ReportedDefect[],
 *   stages: StageMark[],
 * }} Stored
 */

/** The cutoff as a person says it, so a reason can name the rule it applied. */
const CUTOFF_MINUTES = Math.round(RUN_BUDGET.cutoffMs / 60000);

/**
 * Where a run keeps its state, given the directory its run file sits in.
 *
 * Every stage has to arrive at the same path or the budget silently splits in
 * two, and they arrive from different directions: some know the run file and
 * take its directory, others are told the working directory outright. Naming it
 * once is what makes those the same answer.
 *
 * @param {string} dir
 * @returns {string}
 */
const runStateFile = (dir) => path.join(path.resolve(dir), 'run-state.json');

/**
 * Read the run's state, and say whether this is the run's first sight of it.
 *
 * A state file that is missing, unreadable, or carrying no usable start time
 * begins a fresh run rather than failing one. This is bookkeeping: losing it
 * should cost a run its memory of how many rounds it has spent, which is bad,
 * and never cost it its deck, which would be worse.
 *
 * @param {string} file
 * @param {() => number} now
 * @returns {{state: Stored, fresh: boolean}}
 */
function readState(file, now) {
  try {
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Number.isFinite(stored?.startedAt)) {
      return {
        fresh: false,
        state: {
          startedAt: stored.startedAt,
          rounds: stored.rounds && typeof stored.rounds === 'object' ? stored.rounds : {},
          fallbacks: Array.isArray(stored.fallbacks) ? stored.fallbacks : [],
          defects: Array.isArray(stored.defects) ? stored.defects : [],
          stages: Array.isArray(stored.stages) ? stored.stages : [],
        },
      };
    }
  } catch {
    // Unreadable, absent, or not JSON. All three mean the same thing here.
  }

  return {
    fresh: true,
    state: { startedAt: now(), rounds: {}, fallbacks: [], defects: [], stages: [] },
  };
}

/**
 * One run's budget and its record of what it fell back to.
 *
 * @param {object} options
 * @param {string} options.file  Where the state is kept, beside the run file.
 * @param {() => number} [options.now]
 */
function openRunState({ file, now = Date.now }) {
  const { state, fresh } = readState(file, now);

  const save = () => {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
  };

  // Written at the first open rather than at the first spend. The run's start
  // time is what the cutoff is measured from, and a run that reached its third
  // stage before recording one would measure the cutoff from there.
  if (fresh) save();

  return {
    /** When the run began, which is what the cutoff is measured from. */
    get startedAt() {
      return state.startedAt;
    },

    /**
     * Take a repair round, if there is one left to take.
     *
     * The answer is a decision rather than a number, because every caller is
     * asking the same question - may I rewrite this and try again? - and a
     * caller left to compare counts itself is one that can compare them wrongly.
     *
     * @param {RoundKind} kind
     * @returns {Spend}
     */
    spend(kind) {
      const limit = RUN_BUDGET.rounds[kind];
      if (limit === undefined) throw new Error(`there is no ${kind} budget to spend`);

      const spent = state.rounds[kind] ?? 0;

      // Time is checked before the count, because it is the limit that can stop
      // a run holding every round it started with. Three cheap rounds still sit
      // on either side of research and renders that are not cheap.
      if (now() - state.startedAt >= RUN_BUDGET.cutoffMs) {
        return {
          allowed: false,
          round: spent,
          reason: `the run is past its ${CUTOFF_MINUTES} minutes, so no new round starts`,
        };
      }

      if (spent >= limit) {
        return { allowed: false, round: spent, reason: `all ${limit} ${kind} rounds are spent` };
      }

      const round = spent + 1;
      state.rounds[kind] = round;
      save();
      return { allowed: true, round };
    },

    /**
     * What the run has had to settle for, in the order it settled for it.
     *
     * Copies, so that a caller cannot add to the record without writing it
     * down: a fallback that lives only in one process's array is a fallback the
     * reply will not mention.
     *
     * @returns {string[]}
     */
    get fallbacks() {
      return [...state.fallbacks];
    },

    /** @returns {ReportedDefect[]} */
    get defects() {
      return [...state.defects];
    },

    /**
     * Record a fallback, worded the way the reply will say it.
     *
     * The wording is settled here rather than at the end, by whichever stage
     * actually fell back, because that stage is the only one that knows what it
     * settled for. A reply that reconstructed the phrase later would be
     * guessing at it.
     *
     * @param {string} what
     */
    noteFallback(what) {
      state.fallbacks.push(String(what));
      save();
    },

    /**
     * Record a critical defect that survived its repairs, by slide.
     *
     * @param {ReportedDefect} defect
     */
    noteDefect({ slide, message }) {
      state.defects.push({ slide, message });
      save();
    },

    /** The stages this run has walked, in order. @returns {StageMark[]} */
    get stages() {
      return [...state.stages];
    },

    /**
     * Record that one stage ran, and how long it took.
     *
     * Two numbers, because they answer different questions. `ms` is the stage's
     * own duration and says whether the code is slow. `elapsedMs` is how far
     * into the run it finished, which is the number that makes the gap before it
     * measurable - and those gaps are the model reading sites and choosing
     * competitors, which is most of a ten-minute run. Every code stage here runs
     * in seconds, so durations alone would account for almost none of it.
     *
     * @param {{stage: string, ms: number}} mark
     */
    noteStage({ stage, ms }) {
      state.stages.push({ stage: String(stage), ms, elapsedMs: now() - state.startedAt });
      save();
    },
  };
}

/**
 * Time one stage, from here to wherever it finishes.
 *
 * Every entry point the skill ships is its own process, so each one has to read
 * its own clock and the starting value cannot be shared. What can be shared is
 * the shape - one call at the top of a stage, one at the end - and the reason
 * for it, written down once here instead of once in every entry point.
 *
 * @param {() => number} [now]
 * @returns {(dir: string, stage: string) => void}
 */
function stageTimer(now = Date.now) {
  const began = now();
  return (dir, stage) => recordStage(dir, stage, now() - began);
}

/**
 * Time one stage of a started run, given the directory its run file sits in.
 *
 * A stage run without a started run records nothing. check-content.js and
 * render-deck.js are both usable on their own - it is how someone tries the
 * rules out on copy, or looks at a deck they already have - and timing must not
 * be the thing that turns that into a run. A state file written here would hand
 * the next real run a start time taken from someone's experiment.
 *
 * @param {string} dir
 * @param {string} stage
 * @param {number} ms
 */
function recordStage(dir, stage, ms) {
  const file = runStateFile(dir);
  if (!fs.existsSync(file)) return;

  try {
    openRunState({ file }).noteStage({ stage, ms });
  } catch {
    // Bookkeeping, like the rest of this file. Losing a timing should cost the
    // run its timeline, which is a nuisance, and never cost it its deck.
  }
}

module.exports = { openRunState, recordStage, runStateFile, stageTimer };
