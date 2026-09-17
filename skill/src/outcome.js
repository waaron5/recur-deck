// What the run says when it is done.
//
// Decision 07 fixes a template of about six lines for each of the three
// outcomes, and forbids progress narration in between. Both halves of that
// matter to the same person: someone who asked for a deck wants the deck and the
// one or two facts that decide whether they can mail it, and a run that reports
// its own diligence buries those facts in the middle of a paragraph.
//
// The reply is assembled here rather than written by the model each time,
// because a template a model rewrites from memory is a template that drifts -
// and the lines that drift first are the conditional ones, which are exactly the
// lines that carry bad news.
//
// The download card is not text this builds. It is the file itself, presented by
// the host; these are the lines that go around it.

/**
 * A defect as the reply prints it. Narrower than structure.js's `Defect`, which
 * also carries the rule it broke: by the time a run is writing its reply, what
 * is left to say is which slide and what is wrong with it.
 *
 * @typedef {{slide: number, message: string}} ReportedDefect
 * @typedef {{
 *   outcome: 'clean' | 'flagged' | 'evidence-failure',
 *   company?: string,
 *   headquarters?: string,
 *   assumption?: string,
 *   fallbacks?: string[],
 *   bestEffort?: string,
 *   defects?: ReportedDefect[],
 *   couldNotEstablish?: string,
 *   tried?: string,
 *   fix?: string,
 * }} Outcome
 */

/**
 * The reply for one finished run.
 *
 * @param {Outcome} state
 * @returns {string}
 */
function outcomeReply(state) {
  switch (state.outcome) {
    case 'clean':
      return deliveredLines(state).join('\n');

    case 'flagged':
      return [...flaggedLines(state), ...deliveredLines(state)].join('\n');

    case 'evidence-failure':
      return evidenceFailureLines(state).join('\n');

    default:
      throw new Error(`there is no reply for a ${state.outcome} run`);
  }
}

/**
 * The lines that describe a delivered deck.
 *
 * Every line after the first is conditional on something having actually
 * happened. A run that states an assumption it never made, or names a fallback
 * it never took, reads as though something went wrong when nothing did - and
 * the next one that really did fall back reads the same, so the line stops
 * carrying information.
 *
 * @param {Outcome} state
 * @returns {string[]}
 */
function deliveredLines({ company, headquarters, assumption, fallbacks = [], bestEffort }) {
  const lines = [`Company: ${company}${headquarters ? `, ${headquarters}` : ''}`];

  if (assumption) lines.push(`Assumed: ${assumption}`);
  if (fallbacks.length > 0) lines.push(`Fallbacks: ${fallbacks.join(', ')}`);

  // A target outside the covered scope gets the same pipeline and the same
  // gates, and one line saying so. It belongs on a delivered deck rather than
  // on an evidence failure, which has no deck to qualify.
  if (bestEffort) lines.push(`Outside the covered scope (${bestEffort}); treat as best-effort.`);

  return lines;
}

/**
 * What is wrong with a flagged deck, above the deck itself.
 *
 * The order is decision 07's and it is not cosmetic. The file is about to be
 * forwarded to someone who never saw this reply, so the warning has to be the
 * part that is hardest to scroll past - and each line names the slide, because
 * "fix the market map" is a different job from "fix something, somewhere".
 *
 * @param {Outcome} state
 * @returns {string[]}
 */
function flaggedLines({ defects = [] }) {
  const count = defects.length;

  return [
    `⚠ Not ready to mail. ${count} ${count === 1 ? 'issue remains' : 'issues remain'}:`,
    ...defects.map((defect) => `- slide ${defect.slide}: ${defect.message}`),
  ];
}

/**
 * A run that established too little to build anything.
 *
 * No deck is named here, and deliberately so: a "Company:" line beside no
 * download is a person hunting their conversation for a file that was never
 * written. What goes in its place is the three things that let someone act -
 * what could not be established, what was already tried so nobody repeats it by
 * hand, and the one thing to send instead.
 *
 * @param {Outcome} state
 * @returns {string[]}
 */
function evidenceFailureLines({ couldNotEstablish, tried, fix }) {
  const lines = [`No deck this time. I could not establish ${couldNotEstablish}.`];

  if (tried) lines.push(`Tried: ${tried}`);
  if (fix) lines.push(`Fix: ${fix}`);

  return lines;
}

module.exports = { outcomeReply };
