// The thesis page's content model: the structured research object the model
// fills in and the deck consumes.
//
// The sections are keyed by role rather than ordered in a list, because the
// roles cannot drift between them. "here" is a market or category observation
// stated as Recur's view, "excited" is company facts only with every bullet
// traceable to a source, and "help" is Recur proposals phrased as offers drawn
// from Recur's go-to-market, product, payments and AI strengths.
//
// Every bullet carries its own sources, because slide 2's speaker notes pair
// each bullet with the evidence behind it. That pairing is the whole point of
// the source record: a reviewer reads the claim beside what backs it.
//
// What this module checks is the object's shape, so a malformed research object
// fails before a deck is built from it. The copy itself - word counts, banned
// words, punctuation, and whether a number has a source - is the content gate's
// job in ticket 06. Ticket 05 extends this object with the market map.

const { THESIS_SECTIONS } = require('./design.js');

/**
 * @typedef {{text: string, sources: string[]}} ThesisBullet
 * @typedef {{header: string, bullets: ThesisBullet[]}} ThesisSectionCopy
 * @typedef {Record<'here' | 'excited' | 'help', ThesisSectionCopy>} Thesis
 * @typedef {{
 *   key: string,
 *   label: string,
 *   header: string,
 *   bullets: ThesisBullet[],
 *   text: string,
 *   circle: string,
 *   numeral: string,
 * }} LaidOutSection
 */

/** The section roles, in the order they are stacked on the slide. */
const SECTION_KEYS = THESIS_SECTIONS.map((section) => section.key);

// Fixed by the brief. Sparse evidence means saying less inside a bullet, never
// dropping one: all six stay required.
const BULLETS_PER_SECTION = 2;

/**
 * The three sections, checked and paired with the colours the reference sets.
 *
 * Throws, naming the section, rather than building a deck around a hole. A
 * thesis page missing a header or a bullet is a critical defect, and the run
 * that produced it needs to hear which part is missing.
 *
 * @param {any} thesis  The run file's `thesis`, as parsed from JSON.
 * @returns {LaidOutSection[]}
 */
function thesisSections(thesis) {
  if (!thesis || typeof thesis !== 'object') {
    throw new Error(
      'the run has no thesis: slide 2 needs three sections, each a header and two bullets',
    );
  }

  return THESIS_SECTIONS.map((section) => {
    const copy = thesis[section.key];
    if (!copy || typeof copy !== 'object') {
      throw new Error(`the thesis has no "${section.key}" section (${section.label})`);
    }

    const header = typeof copy.header === 'string' ? copy.header.trim() : '';
    if (!header) throw new Error(`the "${section.key}" section has no header`);

    const written = Array.isArray(copy.bullets) ? copy.bullets : [];
    if (written.length !== BULLETS_PER_SECTION) {
      throw new Error(
        `the "${section.key}" section has ${written.length} bullets, ` +
          'and needs exactly two bullets',
      );
    }

    // Each bullet keeps its own sources rather than being split into a pair of
    // arrays lined up by index: the notes have to put the two back together,
    // and tickets 05 and 06 extend this shape.
    /** @type {ThesisBullet[]} */
    const bullets = written.map((bullet, i) => {
      const text = typeof bullet?.text === 'string' ? bullet.text.trim() : '';
      if (!text) {
        throw new Error(`bullet ${i + 1} of the "${section.key}" section has no text`);
      }

      const sources = (Array.isArray(bullet.sources) ? bullet.sources : [])
        .map((source) => String(source).trim())
        .filter(Boolean);
      if (sources.length === 0) {
        throw new Error(
          `bullet ${i + 1} of the "${section.key}" section has no source, and every ` +
            "bullet is paired with its sources in slide 2's speaker notes",
        );
      }

      return { text, sources };
    });

    return { ...section, header, bullets };
  });
}

/**
 * Slide 2's share of the source record: each section, then each of its bullets
 * followed by the sources behind it.
 *
 * The sources follow their own bullet rather than collecting at the end, so a
 * reviewer can tell which claim each one backs.
 *
 * Takes sections that have already been through thesisSections, so that
 * building a deck does not check the same research object twice.
 *
 * @param {LaidOutSection[]} sections
 * @returns {string}
 */
function thesisNotes(sections) {
  const lines = [];
  for (const section of sections) {
    lines.push(`${section.label}: ${section.header}`);
    for (const bullet of section.bullets) {
      lines.push(`- ${bullet.text}`);
      lines.push(`  Sources: ${bullet.sources.join(' ; ')}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

module.exports = { SECTION_KEYS, thesisSections, thesisNotes };
