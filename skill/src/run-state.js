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
 * @typedef {'rounds' | 'time' | 'blind'} Refusal
 * @typedef {{allowed: boolean, round: number, reason?: string, cause?: Refusal}} Spend
 * @typedef {import('./outcome.js').ReportedDefect} ReportedDefect
 * @typedef {{stage: string, ms: number, elapsedMs: number}} StageMark
 * @typedef {{blind: number, answered: boolean, reasons: string[]}} Renders
 *   `blind` counts every render that showed nothing, for the cap. `answered` is
 *   about the *latest* render only, because that is the one that looked at the
 *   deck being delivered: a run that rendered, repaired, and then went blind is
 *   shipping a deck nobody saw, whatever an earlier render managed. `reasons`
 *   says what went quiet each time, in the order it happened, because two blind
 *   renders in one run need not have the same cause and the fix differs by which.
 * @typedef {{
 *   startedAt: number,
 *   rounds: Record<string, number>,
 *   fallbacks: string[],
 *   defects: ReportedDefect[],
 *   stages: StageMark[],
 *   renders: Renders,
 * }} Stored
 */

/**
 * What the reply says about a run whose render check never answered.
 *
 * The one fallback phrase this module words itself. Every other one is worded by
 * the stage that fell back, because that stage is the only thing that knows what
 * it settled for - but no single render knows this. A first attempt that shows
 * nothing and a second that works is a run that saw its slides, and a render that
 * works followed by two that show nothing is a run that saw an earlier deck than
 * the one it is delivering. Only the run's whole record settles which, so the
 * phrase is derived from that record rather than written down at the moment a
 * converter went quiet.
 *
 * Decision 03 of the tightening map: a render that cannot answer is a sandbox
 * hiccup, not a failed run. The deck ships clean, with this line.
 */
const UNSEEN = 'no visual check (the renderer did not answer)';

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
          renders: {
            blind: Number.isFinite(stored?.renders?.blind) ? stored.renders.blind : 0,
            answered: stored?.renders?.answered === true,
            // Absent in every run directory written before causes were recorded,
            // and those directories are exactly what a judging pass reads. No
            // list means none were recorded, never a report that cannot be run.
            // Narrowed to strings for the same reason: these are printed straight
            // into the report, and anything else there would read as `[object
            // Object]` in the one line someone is reading to diagnose a sandbox.
            reasons: Array.isArray(stored?.renders?.reasons)
              ? stored.renders.reasons.filter((why) => typeof why === 'string')
              : [],
          },
        },
      };
    }
  } catch {
    // Unreadable, absent, or not JSON. All three mean the same thing here.
  }

  return {
    fresh: true,
    state: {
      startedAt: now(),
      rounds: {},
      fallbacks: [],
      defects: [],
      stages: [],
      renders: { blind: 0, answered: false, reasons: [] },
    },
  };
}

/**
 * One run's budget and its record of what it fell back to.
 *
 * @param {object} options
 * @param {string} options.file  Where the state is kept, beside the run file.
 * @param {() => number} [options.now]
 * @param {boolean} [options.readOnly]
 *   For a reader that must not disturb what it is reading. A handle opened this
 *   way answers every question and records nothing: the first-open write below
 *   is skipped, and anything that would write throws rather than quietly failing
 *   to. The judging harness opens one, because it runs against a work directory
 *   that is the only evidence a run leaves behind - and the case where someone
 *   most needs to look at that directory is the one where the file is damaged,
 *   which is precisely the case the first-open write would overwrite.
 */
function openRunState({ file, now = Date.now, readOnly = false }) {
  // Asked before the read, because `fresh` alone cannot tell an absent file from
  // an unreadable one, and a reader has to be able to report the difference: no
  // file is a stage that was never part of a run, and a damaged one is a run
  // whose record was lost, which is the finding worth chasing.
  const existed = fs.existsSync(file);
  const { state, fresh } = readState(file, now);

  const save = () => {
    if (readOnly) {
      throw new Error('this run state was opened read-only, so nothing can be written to it');
    }
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
  };

  // Written at the first open rather than at the first spend. The run's start
  // time is what the cutoff is measured from, and a run that reached its third
  // stage before recording one would measure the cutoff from there.
  if (fresh && !readOnly) save();

  /**
   * Whether there is a round of this kind left to take, without taking one.
   *
   * The answer is a decision rather than a number, because every caller is
   * asking the same question - may I rewrite this and try again? - and a
   * caller left to compare counts itself is one that can compare them wrongly.
   *
   * @param {RoundKind} kind
   * @returns {Spend}
   */
  function decide(kind) {
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
        cause: 'time',
        reason: `the run is past its ${CUTOFF_MINUTES} minutes, so no new round starts`,
      };
    }

    if (spent >= limit) {
      return {
        allowed: false,
        round: spent,
        cause: 'rounds',
        reason: `all ${limit} ${kind} rounds are spent`,
      };
    }

    return { allowed: true, round: spent + 1 };
  }

  /**
   * Write down a round of this kind, and say which one it was.
   *
   * @param {RoundKind} kind
   * @returns {number}
   */
  function noteRound(kind) {
    const round = (state.rounds[kind] ?? 0) + 1;
    state.rounds[kind] = round;
    save();
    return round;
  }

  return {
    /** When the run began, which is what the cutoff is measured from. */
    get startedAt() {
      return state.startedAt;
    },

    /**
     * Whether there was a state file here that could not be read.
     *
     * A run opens over the wreckage and carries on, because losing the record
     * must never cost a deck. A reader has to say so instead: "this run recorded
     * nothing" and "this run's record was damaged" look the same from the
     * outside and are not the same finding.
     */
    get damaged() {
      return existed && fresh;
    },

    /**
     * Take a repair round, if there is one left to take.
     *
     * Asking and taking in one call, which is what a content round wants: the
     * gate has already found what is wrong by the time it asks, so there is
     * nothing between the permission and the rewrite it pays for.
     *
     * @param {RoundKind} kind
     * @returns {Spend}
     */
    spend(kind) {
      const asked = decide(kind);
      if (!asked.allowed) return asked;
      return { allowed: true, round: noteRound(kind) };
    },

    /**
     * Whether this run may start a converter, without spending anything to ask.
     *
     * The render check asks before it spawns and pays after the converter
     * answers, so its two halves are separate calls. Both limits it can hit are
     * checked here, and the refusal names which - they call for opposite things.
     * A run whose renders answered and whose defects outlived its repairs has
     * seen a real problem it could not fix, and decision 07's flagged deck is
     * the right end for it. A run whose renders answered nothing has seen no
     * problem at all, and flagging its deck over a converter that went quiet
     * would be punishing it for the sandbox.
     *
     * @returns {Spend}
     */
    mayRender() {
      // The repair budget is asked first, because when both have run out it is the
      // one that decides the outcome. A run with no round left has rendered twice,
      // looked twice, and still has a defect it could not repair - a flagged deck,
      // exactly as decision 07 says. Asking the blind cap first would answer
      // "deliver, do not flag" to a run holding a defect it never fixed.
      const round = decide('render');
      if (!round.allowed) return round;

      const blind = state.renders.blind;
      if (blind >= RUN_BUDGET.blindRenders) {
        return {
          allowed: false,
          round: state.rounds.render ?? 0,
          cause: 'blind',
          reason: `${blind} renders answered nothing, which is as long as a run waits`,
        };
      }

      return round;
    },

    /**
     * Record that a round of this kind happened, and say which one it was.
     *
     * Unconditional, because it records rather than asks. The render check's
     * permission was granted before a converter was spawned, and refusing to
     * write down the round it then spent - because the clock crossed the cutoff
     * while the converter worked - would leave a run holding images it had not
     * paid for.
     *
     * @param {RoundKind} kind
     * @returns {number}
     */
    noteRound,

    /**
     * Record a render that produced no image, and say whether to try again.
     *
     * This is not a repair round and is deliberately not charged as one. A round
     * bounds rewriting, and a render with nothing to show gave the model nothing
     * to rewrite from - charging for it is what left the September 2026 run with
     * an unseen deck and an empty repair budget at the same time.
     *
     * `why` is the converter's own sentence, kept because the count answers a
     * different question from the one ticket 05 of the tightening map asks. The
     * cap needs to know only that a render showed nothing; diagnosing the sandbox
     * needs to know whether soffice was absent, killed at its bound, or writing
     * no PDF after running - which render.js already words apart and which, until
     * now, only ever reached stderr. A chat transcript is not a record, and the
     * transcript is what the September 2026 run's evidence was lost with.
     *
     * @param {string} [why]  What the converter said, if the caller knows.
     * @returns {{blind: number, left: number}}
     */
    noteBlindRender(why) {
      state.renders.blind += 1;
      if (why) state.renders.reasons.push(String(why));
      // The deck as it now stands went unseen, whatever an earlier render of an
      // earlier deck managed. Without this, a run that rendered, found a defect,
      // repaired it and then went blind would report itself as having been looked
      // at - and the one line saying otherwise would be the line that went missing.
      state.renders.answered = false;
      save();
      return {
        blind: state.renders.blind,
        left: Math.max(0, RUN_BUDGET.blindRenders - state.renders.blind),
      };
    },

    /**
     * Record that a render produced the images it was asked for.
     *
     * This does not clear the blind count. The count is the cap on waiting and is
     * spent for the run, not for the deck: a sandbox that has already gone quiet
     * twice has said what it is, and a run should not earn its waiting back.
     */
    noteRenderAnswered() {
      state.renders.answered = true;
      save();
    },

    /**
     * What this run's renders came to.
     *
     * The causes are copied out, not handed over: a caller that pushed onto the
     * returned array would add a cause nothing ever saves, and the whole point of
     * recording them is that they survive the process that saw them.
     *
     * @returns {Renders}
     */
    get renders() {
      return { ...state.renders, reasons: [...state.renders.reasons] };
    },

    /**
     * Rounds spent, by kind.
     *
     * For reporting only. A caller deciding whether it may render asks
     * `mayRender()`: one that compared these counts itself would be the caller
     * `decide()` exists to stop existing.
     *
     * @returns {Record<string, number>}
     */
    get rounds() {
      return { ...state.rounds };
    },

    /**
     * What the run has had to settle for, in the order it settled for it.
     *
     * Copies, so that a caller cannot add to the record without writing it
     * down: a fallback that lives only in one process's array is a fallback the
     * reply will not mention.
     *
     * The unseen render is appended rather than stored, for the reason given
     * where UNSEEN is declared: whether a run ended up unseen is a fact about
     * all of its renders, not about any one of them. `blind` rather than
     * `!answered` alone, so that a run which simply never rendered - someone
     * rebuilding a deck by hand - claims nothing either way.
     *
     * @returns {string[]}
     */
    get fallbacks() {
      const unseen = state.renders.blind > 0 && !state.renders.answered;
      return [...state.fallbacks, ...(unseen ? [UNSEEN] : [])];
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
