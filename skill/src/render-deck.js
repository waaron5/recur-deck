#!/usr/bin/env node
// The render check's entry point. Bundled to <skill>/scripts/render-deck.js, so
// it runs from the bundle alone with no package installs at run time.
//
//   node <skill-dir>/scripts/render-deck.js --input "Recur x Acme.pptx" --out work/render
//
// It rasterises slides 1-3 of a built deck and prints where the images landed:
//
//   {"ok": true, "images": ["work/render/slide-1.png", ...]}
//
// The point of it is the step that follows: the model opens those images and
// looks at them. What it finds is repaired by shortening copy, never by shrinking
// type, and the deck is rebuilt and rendered again.
//
// A render that answers nothing is its own outcome, and decision 03 of the
// tightening map is about that one. It costs the run seconds rather than the four
// minutes the old two-minute bound cost the September 2026 run, it takes no
// repair round - there is no image to repair from - and after two of them the run
// stops asking and delivers the deck clean with one line saying it was not seen.
// The deck is not flagged for it: every deterministic check still passed, and the
// fit gate, not this, is what guarantees nothing overflows.

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('./args.js');
const { renderSlides } = require('./render.js');
const { openRunState, runStateFile, stageTimer } = require('./run-state.js');

const USAGE = 'usage: render-deck.js --input <deck>.pptx [--out <dir>] [--work <dir>]';

/**
 * What a run does once its renders have gone quiet for the last time.
 *
 * Written once and shared by both paths that say it - the render that spends the
 * last blind attempt, and the one refused afterwards - because two wordings of
 * the same instruction are two wordings that drift, and the half that would drift
 * first is "do not flag it", which is the half that decides what the founder gets.
 *
 * "For this" is load-bearing. Whether the deck is flagged is decided by what the
 * other checks found, which this stage cannot see: a content gate whose rounds ran
 * out may have findings standing. What a blind render knows is only that it is not
 * itself a reason to flag anything.
 *
 * It is also what a run refused before its first render is told, whatever refused
 * it - see whatToDoInstead.
 */
const DELIVER_UNSEEN =
  'stop rendering and deliver the deck, and do not flag it for this - a render that ' +
  'showed nothing found nothing to flag, and the content gate, not the render, is ' +
  'what guarantees no line overflows its box. Write the reply with reply.js: its ' +
  'Fallbacks: line already carries that this deck was not visually checked.';

/** Times this stage, which is the converter rasterising slides 1-3. */
const mark = stageTimer();

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error(USAGE);

  // A deck that is not there is a mistake in how this was called, not a
  // converter that could not answer, so it is refused before the run's record
  // is touched by it.
  if (!fs.existsSync(args.input)) throw new Error(`--input names no file: ${args.input}`);

  const run = openRun(args.work);

  // Before anything is spawned. Starting a converter for a deck this run has no
  // round left to repair, or one whose renders have already gone quiet twice,
  // would spend time to arrive where it already is.
  const permission = run?.mayRender();
  if (permission && !permission.allowed) {
    // This throws where check-content.js returns its refusal as JSON, and the
    // difference is deliberate: the gate still has findings worth printing when
    // its budget runs out, and this has nothing to show for a render it is not
    // going to start.
    throw new Error(`${permission.reason}: ${whatToDoInstead(permission)}`);
  }

  const outDir = args.out || path.join(path.dirname(path.resolve(args.input)), 'render');

  let images;
  try {
    images = renderSlides({ file: args.input, outDir });
  } catch (error) {
    return reportBlindRender(run, error, args.work);
  }

  run?.noteRenderAnswered();
  const round = run ? { round: run.noteRound('render') } : undefined;

  if (args.work) mark(args.work, 'render-deck');

  console.log(
    JSON.stringify({ ok: true, images: images.map((image) => image.file), ...round }, null, 2),
  );
}

/**
 * The run's state, or nothing when this is not part of a run.
 *
 * The state lives beside the run file rather than beside the deck, which is
 * written to the outputs directory, so the working directory has to be named
 * rather than inferred from the file being rendered.
 *
 * Rendering without a run is allowed, the same way checking copy without one is:
 * it is how someone looks at a deck they already have.
 *
 * @param {string} [work]
 */
function openRun(work) {
  if (!work) return undefined;

  const file = runStateFile(work);
  if (!fs.existsSync(file)) return undefined;

  return openRunState({ file });
}

/**
 * A render that produced no image: record it, and say what the run should do.
 *
 * The distinction this holds on to is the one the September 2026 run lost. A
 * render that came back with pictures showing bad copy is a repair job. A render
 * that came back with nothing is a converter problem, and rewriting copy in
 * response to it changes copy that was never shown to be wrong.
 *
 * The converter's own sentence goes into the run's record as well as onto
 * stderr. Both say the same thing to different readers and only one of them
 * lasts: stderr is read by the model in the chat, and the record is read later
 * out of the work directory, which is the only evidence a host run leaves behind.
 * Ticket 05 of the tightening map turns on that difference - the sandbox has both
 * converters and still produced no PDF, and an absent soffice, one killed at its
 * bound, and one that ran and wrote nothing are three findings that a bare count
 * of blind renders cannot tell apart.
 *
 * @param {ReturnType<typeof openRun>} run
 * @param {unknown} error
 * @param {string} [work]
 */
function reportBlindRender(run, error, work) {
  const failure = /** @type {import('./render.js').RenderFailure} */ (
    error instanceof Error ? error : new Error(String(error))
  );
  const blind = run?.noteBlindRender(failure.message);

  if (work) mark(work, 'render-deck');

  console.error(
    JSON.stringify(
      {
        ok: false,
        error: failure.message,
        ...(blind ? { blindRenders: blind.blind, attemptsLeft: blind.left } : {}),
        advice: adviceForBlindRender(failure, blind),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}

/**
 * What to do about a render that answered nothing.
 *
 * Said here rather than left to the model, because the wrong response to this is
 * the intuitive one: a failed step looks like something to repair, and the copy
 * is the only thing a run can repair. Naming "do not rewrite" is the whole point
 * of the line.
 *
 * @param {import('./render.js').RenderFailure} failure
 * @param {{blind: number, left: number}} [blind]
 * @returns {string}
 */
function adviceForBlindRender(failure, blind) {
  // Every branch opens on the same fact, because it is the one a model reading a
  // failed step is most likely to get wrong, whatever it then does about it.
  const noRound =
    'No repair round was spent: a render with no image gave you nothing to repair ' +
    'from, so do not rewrite any copy for this.';

  // A converter that is absent will not become present on a second ask, so the
  // one honest retry here is no retry at all.
  if (failure.missingConverter) {
    return `${noRound} This sandbox cannot render at all, so rendering again fails the same way: ${DELIVER_UNSEEN}`;
  }

  if (blind && blind.left === 0) return `${noRound} Now ${DELIVER_UNSEEN}`;

  return `${noRound} Render again with the same command.`;
}

/**
 * What a refused render is told to do instead, which is one of two opposite
 * things.
 *
 * A run out of render rounds has looked at its slides twice and still has a
 * defect it could not repair, which is what decision 07's flagged deck is for. A
 * run whose renders answered nothing has looked at nothing, and has no defect to
 * flag; its deck goes out clean and the reply says it was not seen.
 *
 * @param {{cause?: 'rounds' | 'time' | 'blind', round: number}} refusal
 * @returns {string}
 */
function whatToDoInstead({ cause, round }) {
  if (cause === 'blind') return DELIVER_UNSEEN;

  // The question this branch is really asking is whether the run holds a defect
  // that outlived a repair, and no cause answers that on its own: a run past the
  // twelve-minute cutoff is refused with `cause: 'time'` whether it has looked at
  // its slides twice or not at all. A render round is only ever spent once a
  // converter answered, so the count of them is exactly how many times this run
  // looked at something - and a run at round 0 has looked at nothing, repaired
  // nothing, and has nothing for a flag to be about. It went quiet or it ran out
  // of clock; either way the deck is sound as far as anything here knows, and
  // decision 03's reasoning for the flagged deck - "rendered twice, looked twice,
  // and still has a defect it could not repair" - describes none of it.
  //
  // Ticket 06 of the tightening map, amending decision 03.
  if (round === 0) return DELIVER_UNSEEN;

  return (
    'stop rendering and deliver a flagged deck with build-deck.js --flagged, ' +
    'listing what is still wrong by slide.'
  );
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
