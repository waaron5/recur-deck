// The content gate: the countable writing rules, checked before a deck is built.
//
// Decision 05 split enforcement in two, and this module is the deterministic
// half. It checks everything countable - word counts, the question mark,
// unsourced numbers, name spelling, the source record's completeness, the map's
// distribution, whether the copy fits the box it has to sit in, and whether the
// six thesis bullets are all built the same flat way. The model then judges what
// code cannot: whether the copy sounds like the voice exemplar, the swap test,
// and whether each claim matches its source.
//
// Vocabulary is deliberately not policed here. Decision 05's September 18
// amendment deleted the banned word list, its phrase patterns and every
// punctuation rule but the question mark: forbidding a word only moves a model
// to the next one, and Recur's own introduction failed those rules on
// "unlock", an en dash, parentheses and a semicolon. That bet is provisional,
// and rules come back here only if the practice runs show the writing needs
// them.
//
// Two things separate this module from thesis.js and market-map.js, which also
// refuse bad input. Those check an object's *shape* and throw on the first hole,
// because a deck cannot be built around a missing section. This checks an
// object's *copy* and returns every problem at once, because a repair round
// rewrites the failing fields together and a run only gets three of them.
//
// That is also why this walks the raw research object rather than the values
// thesisSections and marketMap hand back. Those throw, so building the copy
// list from them would mean a run with one missing axis reasoning had that hole
// reported and none of its copy problems - which is the opposite of reporting
// everything at once.
//
// Nothing here ever suggests a smaller type size. Type sizes are fixed design
// values; text that does not fit gets shorter.

const { textWidth, wrapLines } = require('./font-metrics.js');
const { thesisSections } = require('./thesis.js');
const { marketMap, checkDistribution } = require('./market-map.js');
const { MAP, MAP_LAYOUT, THESIS_GEOMETRY, THESIS_SECTIONS } = require('./design.js');

/**
 * @typedef {{
 *   width: number,
 *   fontSize: number,
 *   bold?: boolean,
 *   lines?: number,
 *   prefix?: string,
 *   uppercase?: boolean,
 *   tracking?: number,
 * }} Box
 * @typedef {{field: string, slide: number, rule: string, message: string}} Finding
 * @typedef {{
 *   field: string,
 *   slide: number,
 *   kind: 'header' | 'bullet',
 *   text: string,
 *   sources: string[],
 *   box?: Box,
 * }} CopyField
 */

/**
 * One problem, named by the field that has to change.
 *
 * @param {string} field
 * @param {number} slide
 * @param {string} rule
 * @param {string} message
 * @returns {Finding}
 */
const finding = (field, slide, rule, message) => ({ field, slide, rule, message });

// Decision 05's limits, as amended. A header is a claim and a bullet is its
// support, and both stop working at the length where a founder has to re-read
// them. Sixteen is what a bullet's box holds; the header's twelve never binds,
// because after its bold section label the fit estimate stops it first.
const LIMITS = { header: 12, bullet: 16 };

// The one punctuation rule left. A question mark stands in for decision 05's
// ban on rhetorical questions: every line on these slides is a statement, so a
// question mark in one is the rhetorical kind.
const QUESTION = /\?/;

// How many of the six thesis bullets must hang a second clause off the main
// one. The reference deck sits at 3 of 6 and what the practice runs shipped sat
// at 0. It is a floor and nothing more: there is no ceiling, and no rule about
// length, because the reference's bullets vary less in length than the flat
// ones did and a length target is one a model would write to.
const MIN_CLAUSED_BULLETS = 2;

// The shapes a clause hung off the main one takes on slide 2, each the way the
// reference deck writes it.
//
// These lean generous, because a clause the gate failed to see spends a repair
// round rewriting copy that was already right. The one exception is a list of
// nouns: "tracking, routing and billing" has an -ing word after a comma, and
// counting it would let six flat bullets through on two lists.
const CLAUSE_SHAPES = [
  // "Once installed in every vehicle, it becomes ...": a subordinate clause set
  // in front of the main one, closed by its comma.
  /^(?:once|when|whenever|while|if|unless|because|although|though|since|as|after|before|until|wherever|whereas)\b[^,]*,/i,
  // "Installed in every vehicle, the tracker ...", "Built for small fleets, ...".
  /^(?:[a-z]+(?:ing|ed)|built|made|sold|known|grown|run|held|kept|paid|bought)\b[^,]*,/i,
  // "..., leaving SMBs out" - but not "..., routing and billing", where the
  // word after the comma is the next item in a list.
  /,\s+(?:[a-z]+(?:ing|ed)\b(?!,|\s+(?:and|or)\b)|(?:which|so)\b)/i,
  // "... that commodity trackers can't match", "... because contracts rarely
  // bind them". Only mid-sentence: at the start these words are a fronted
  // clause or a demonstrative, and both are covered or not a clause.
  /\s(?:that|which|who|whose|where|when|while|because|although|though|unless|until|whereas|if)\s/i,
];

// Decision 05 bans aggregator *estimates* - Crunchbase and ZoomInfo revenue,
// headcount and funding - as facts. LinkedIn is deliberately not here: the same
// decision ranks a founder's LinkedIn as one of the company's own channels.
const AGGREGATORS = ['crunchbase', 'zoominfo'];

// How much wider the estimate is allowed to run than the box before a field is
// called overlong.
//
// The estimate sums advance widths, which is an upper bound on what a renderer
// draws: it ignores pair kerning, which only pulls glyphs together, and an
// advance includes the last glyph's right side bearing while the ink a reader
// sees stops short of it. Measured against the reference slides, the estimate
// ran wide by 0.4% on the cover name, 1.4% on a bullet and 2.2% on the title,
// but by 4.6%, 6.1% and 6.5% on the three thesis headers, which are the only
// lines that mix a bold run with a regular one. Why those three run wider is
// not settled - the header text could not be split from its label on the
// reference PNG to attribute it - so the allowance is set above the worst case
// rather than tuned to a cause.
//
// The direction matters more than the number. Firing late costs a render round
// on copy that was nearly too long; firing early would spend a repair round on
// every run, because the reference deck's own headers estimate over their box.
const FIT_ALLOWANCE = 0.1;

/**
 * Every problem the countable rules find, in the order a reader meets them on
 * the slides.
 *
 * @param {any} research  The run's company, thesis and market map.
 * @returns {Finding[]}
 */
function checkRun(research) {
  /** @type {Finding[]} */
  const findings = [];
  const company = typeof research?.company === 'string' ? research.company.trim() : '';

  findings.push(...checkSourceRecord(research));
  findings.push(...checkCrowding(research?.marketMap));

  for (const field of copyFields(research)) {
    findings.push(...checkWordCount(field));
    findings.push(...checkQuestion(field));
    findings.push(...checkUnsourcedNumber(field));
    findings.push(...checkCompanyName(field, company));
    findings.push(...checkFit(field));
  }

  findings.push(...checkTargetName(research?.marketMap, company));
  findings.push(...checkCalloutFit(research?.marketMap));

  // The shape backstop comes last, and only for a slide nothing else caught.
  // thesisSections and marketMap throw on their first hole, so on a slide that
  // already has findings their message is almost certainly one of those holes
  // restated. Anything only they can see - a wrong bullet count, a coordinate
  // that is not a number - resurfaces next round once the named fields are
  // repaired.
  //
  // The clause floor is added after the slides are noted, because it is not a
  // hole restated: a thesis with a missing bullet and a flat set should hear
  // about both in one round.
  const caught = new Set(findings.map((problem) => problem.slide));
  findings.push(...checkClauses(research?.thesis));
  findings.push(...checkShape(research).filter((problem) => !caught.has(problem.slide)));

  return findings;
}

/**
 * The source record, field by field: every thesis bullet's sources, every
 * company's evidence and placement, and both axes' reasoning.
 *
 * These are checked here, rather than left to thesis.js and market-map.js,
 * because those throw on the first hole. A run with three unevidenced
 * competitors would spend three of its three repair rounds discovering them one
 * at a time; this names all three at once.
 *
 * @param {any} research
 * @returns {Finding[]}
 */
function checkSourceRecord(research) {
  /** @type {Finding[]} */
  const findings = [];

  const thesis = research?.thesis;
  if (thesis && typeof thesis === 'object') {
    for (const section of THESIS_SECTIONS) {
      const bullets = Array.isArray(thesis[section.key]?.bullets) ? thesis[section.key].bullets : [];
      bullets.forEach((bullet, i) => {
        if (!bullet || typeof bullet !== 'object') return;
        const sources = (Array.isArray(bullet.sources) ? bullet.sources : []).filter(
          (source) => String(source).trim().length > 0,
        );
        if (sources.length > 0) return;
        findings.push(
          finding(
            `thesis.${section.key}.bullets.${i}.sources`,
            2,
            'source-record',
            "has no source, and slide 2's notes pair every bullet with the evidence behind it",
          ),
        );
      });
    }
  }

  const map = research?.marketMap;
  if (map && typeof map === 'object') {
    for (const axis of /** @type {const} */ (['x', 'y'])) {
      const side = map.axes?.[axis];
      if (!side || typeof side !== 'object') continue;
      if (String(side.reasoning ?? '').trim()) continue;
      findings.push(
        finding(
          `marketMap.axes.${axis}.reasoning`,
          3,
          'source-record',
          `the ${axis} axis has no reasoning, and slide 3's notes record why both axes were chosen`,
        ),
      );
    }

    const companies = Array.isArray(map.companies) ? map.companies : [];
    companies.forEach((company, i) => {
      if (!company || typeof company !== 'object') return;
      const name = String(company.name ?? '').trim() || `company ${i + 1}`;

      if (!String(company.evidence ?? '').trim()) {
        findings.push(
          finding(
            `marketMap.companies.${i}.evidence`,
            3,
            'source-record',
            `${name} has no evidence, and every company on the map is evidenced from its own site`,
          ),
        );
      }
      if (!String(company.placement ?? '').trim()) {
        findings.push(
          finding(
            `marketMap.companies.${i}.placement`,
            3,
            'source-record',
            `${name} has no placement reasoning, and every placement has to be defensible`,
          ),
        );
      }
    });
  }

  return findings;
}

/**
 * The crowding rules from decision 10, checked directly rather than through the
 * whole map walker, so a distribution problem is reported even when something
 * else on the map is also wrong.
 *
 * Decision 10 capped crowding in the brief precisely so a bad distribution is
 * repaired with words: the nudge at build time may move a logo inside its own
 * quadrant and may never move one across an axis, so a crowded quadrant is a
 * judgment to rewrite rather than a picture to tidy.
 *
 * @param {any} map
 * @returns {Finding[]}
 */
function checkCrowding(map) {
  const companies = Array.isArray(map?.companies) ? map.companies : [];
  // Coordinates that are not numbers are a shape problem, and the backstop
  // reports those in the words market-map.js already uses for them.
  const placed = companies.filter(
    (company) =>
      company &&
      typeof company === 'object' &&
      Number.isFinite(company.x) &&
      Number.isFinite(company.y),
  );
  if (placed.length === 0 || placed.length !== companies.length) return [];

  try {
    checkDistribution(placed);
    return [];
  } catch (error) {
    return [finding('marketMap.companies', 3, 'distribution', reason(error))];
  }
}

/**
 * The shape backstop: everything thesis.js and market-map.js refuse that the
 * field-level checks above do not cover, such as a section with the wrong
 * number of bullets or a competitor count outside five to nine.
 *
 * @param {any} research
 * @returns {Finding[]}
 */
function checkShape(research) {
  /** @type {Finding[]} */
  const findings = [];

  try {
    thesisSections(research?.thesis);
  } catch (error) {
    findings.push(finding('thesis', 2, 'structure', reason(error)));
  }

  try {
    marketMap(research?.marketMap);
  } catch (error) {
    findings.push(finding('marketMap', 3, 'structure', reason(error)));
  }

  return findings;
}

/** @param {unknown} error */
const reason = (error) => (error instanceof Error ? error.message : String(error));

/**
 * One field against its word limit.
 *
 * @param {CopyField} field
 * @returns {Finding[]}
 */
function checkWordCount({ field, slide, kind, text }) {
  const limit = LIMITS[kind];
  const words = countWords(text);
  if (words <= limit) return [];

  return [
    finding(field, slide, 'word-count', `${words} words, and a ${kind} stays within ${limit} words: shorten it`),
  ];
}

/**
 * One field against the question mark.
 *
 * @param {CopyField} field
 * @returns {Finding[]}
 */
function checkQuestion({ field, slide, text }) {
  if (!QUESTION.test(text)) return [];
  return [
    finding(
      field,
      slide,
      'punctuation',
      'asks a question, and every line on these slides is a statement: say what the question was getting at',
    ),
  ];
}

/**
 * The six thesis bullets as a set: at least two must hang a second clause off
 * the main one.
 *
 * This is the one rule here about more than one field, and it exists because
 * the defect the practice runs shipped was a property of all six at once. Each
 * bullet was fine alone; six built subject-verb-object, one after another, read
 * as a form. So the finding names the slide, and the repair chooses which
 * bullets to rebuild.
 *
 * @param {any} thesis
 * @returns {Finding[]}
 */
function checkClauses(thesis) {
  const texts = thesisFields(thesis)
    .filter((field) => field.kind === 'bullet')
    .map((field) => field.text);
  // No bullets at all is a shape problem, and the backstop says so in its own
  // words.
  if (texts.length === 0) return [];

  const claused = texts.filter((text) => CLAUSE_SHAPES.some((shape) => shape.test(text)));
  if (claused.length >= MIN_CLAUSED_BULLETS) return [];

  return [
    finding(
      'thesis',
      2,
      'sentence-structure',
      `${claused.length} of the ${texts.length} thesis bullets hang a second clause off the main one, ` +
        `and at least ${MIN_CLAUSED_BULLETS} must: rebuild ${MIN_CLAUSED_BULLETS - claused.length} more around ` +
        'a fronted condition ("Once ..., ..."), a trailing consequence ("..., leaving ...") ' +
        'or a qualifier ("... that ..."), the way reference/voice.md varies its sentences',
    ),
  ];
}

/**
 * Numbers, against the sources recorded for the field that carries them.
 *
 * A bullet records its own sources, so a bullet is where a number can live. The
 * subtitle, the axis labels and the callout have nowhere to record one, so a
 * number on them cannot be traced and is refused outright - which is a rule
 * about where a number goes, not a reason to drop the fact.
 *
 * @param {CopyField} field
 * @returns {Finding[]}
 */
function checkUnsourcedNumber({ field, slide, text, sources }) {
  const numbers = text.match(/\d[\d,.]*/g);
  if (!numbers) return [];

  if (sources.length === 0) {
    return [
      finding(
        field,
        slide,
        'unsourced-number',
        `states ${list(numbers)} with no source entry behind it: use a number only where a ` +
          'primary source states it, or say it without the number',
      ),
    ];
  }

  // A single primary source is enough. It is only when every source behind the
  // number is an aggregator that the number has nothing real under it.
  const leaning = sources.filter((source) =>
    AGGREGATORS.some((name) => source.toLowerCase().includes(name)),
  );
  if (leaning.length === sources.length) {
    return [
      finding(
        field,
        slide,
        'unsourced-number',
        `states ${list(numbers)} on ${list(leaning)} alone, and aggregator estimates are ` +
          'never facts: find a primary source or drop the number',
      ),
    ];
  }

  return [];
}

/**
 * The company's name, spelled the way the run received it.
 *
 * Two ways a name goes wrong, and both are caught. A run can restyle it -
 * "USFleetTracking" for "US Fleet Tracking" - which has the same letters in the
 * same order and is found by squashing both. Or it can misspell it outright -
 * "US Fleet Traking" - which is found by comparing each run of words against
 * the name and allowing a character or two of difference.
 *
 * A name the field never mentions is not a finding, and neither is the
 * company's own short form: a window has to be close to the name before its
 * difference counts as a misspelling.
 *
 * @param {CopyField} field
 * @param {string} company
 * @returns {Finding[]}
 */
function checkCompanyName({ field, slide, text }, company) {
  if (!company || text.includes(company)) return [];

  const wanted = squash(company);
  // Too short a name cannot be told apart from an ordinary word one letter out.
  if (wanted.length < 5) return [];

  const said = squash(text);
  if (said.includes(wanted)) {
    return [
      finding(
        field,
        slide,
        'company-name',
        `spells the company differently from "${company}", which is the name the run was given`,
      ),
    ];
  }

  const near = nearestSpelling(text, wanted);
  if (!near) return [];

  return [
    finding(
      field,
      slide,
      'company-name',
      `writes "${near}" where the run was given "${company}": spell the company's name exactly`,
    ),
  ];
}

/**
 * The run of words in the text closest to the company's name without being it,
 * or nothing if none is close enough to be a misspelling rather than a
 * different phrase.
 *
 * @param {string} text
 * @param {string} wanted  The company's name, squashed.
 * @returns {string | undefined}
 */
function nearestSpelling(text, wanted) {
  const words = text.split(/\s+/).filter(Boolean);
  // A longer name tolerates one more slip before the match stops being credible.
  const tolerance = wanted.length >= 12 ? 2 : 1;

  for (let span = 1; span <= 4; span += 1) {
    for (let at = 0; at + span <= words.length; at += 1) {
      const window = words.slice(at, at + span).join(' ');
      const squashed = squash(window);
      // Only a window of about the name's own length can be a misspelling of it.
      if (Math.abs(squashed.length - wanted.length) > tolerance) continue;

      const apart = distance(squashed, wanted);
      if (apart > 0 && apart <= tolerance) return window;
    }
  }

  return undefined;
}

/**
 * Levenshtein distance: how many single-character edits separate two strings.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function distance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(
        previous[j] + 1,
        row[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = row;
  }

  return previous[b.length];
}

/**
 * The target's own name on the map, which is the first thing a founder looks
 * for on slide 3.
 *
 * @param {any} map
 * @param {string} company
 * @returns {Finding[]}
 */
function checkTargetName(map, company) {
  const companies = Array.isArray(map?.companies) ? map.companies : [];
  const at = companies.findIndex((entry) => entry?.target === true);
  if (at < 0 || !company) return [];

  const name = typeof companies[at].name === 'string' ? companies[at].name : '';
  if (name === company || !squash(name).includes(squash(company))) return [];

  return [
    finding(
      `marketMap.companies.${at}.name`,
      3,
      'company-name',
      `the target is named "${name}" on the map, and the run was given "${company}"`,
    ),
  ];
}

/**
 * One field against the box the slide gives it.
 *
 * This is the whole point of estimating fit before rendering: overflow is
 * repaired by shortening text, and knowing about it here saves a render round.
 *
 * @param {CopyField} field
 * @returns {Finding[]}
 */
function checkFit({ field, slide, text, box }) {
  if (!box) return [];

  const { fontSize, bold = false } = box;
  const written = box.uppercase ? text.toUpperCase() : text;
  // The section label shares its line with the header, and is set bold.
  const prefix = box.prefix ? textWidth(box.prefix, { fontSize, bold: true }) : 0;
  // Tracked type carries its letter spacing on every character.
  const tracking = ((box.tracking ?? 0) * [...written].length) / 72;
  const room = box.width * (1 + FIT_ALLOWANCE) - prefix - tracking;
  const allowed = box.lines ?? 1;

  if (allowed === 1) {
    const needs = textWidth(written, { fontSize, bold });
    if (needs <= room) return [];
    return [
      finding(
        field,
        slide,
        'fit',
        `needs about ${needs.toFixed(2)}in of a ${Math.max(room, 0).toFixed(2)}in line: make it shorter`,
      ),
    ];
  }

  const lines = wrapLines(written, { width: room, fontSize, bold });
  if (lines <= allowed) return [];
  return [
    finding(field, slide, 'fit', `wraps to ${lines} lines where its box holds ${allowed}: make it shorter`),
  ];
}

/**
 * The callout, whose four paragraphs share one box down the sidebar.
 *
 * It is checked as a block rather than field by field, because that is how the
 * slide sets it: no single paragraph has a height of its own. With the word
 * limits in force this has room to spare, which is the point - it holds the
 * line if those limits ever move.
 *
 * @param {any} map
 * @returns {Finding[]}
 */
function checkCalloutFit(map) {
  const callout = map?.callout;
  if (!callout || typeof callout !== 'object') return [];

  const { fontSize, indent, lineSpacing, spaceAfter, height } = MAP.callout;
  const full = MAP_LAYOUT.calloutWidth * (1 + FIT_ALLOWANCE);
  const indented = full - indent / 72;

  /** @param {any} text @param {number} width @param {string} [prefix] */
  const linesOf = (text, width, prefix) => {
    if (typeof text !== 'string') return 0;
    const lead = prefix ? textWidth(prefix, { fontSize, bold: true }) : 0;
    return wrapLines(text, { width: width - lead, fontSize });
  };

  const dynamics = Array.isArray(callout.dynamics) ? callout.dynamics : [];
  const paragraphs = [
    linesOf(callout.take, full, 'Our take: '),
    ...dynamics.map((text) => linesOf(text, indented)),
    linesOf(callout.proposal, indented),
  ];

  const lines = paragraphs.reduce((total, count) => total + count, 0);
  const needs = (lines * fontSize * lineSpacing) / 72 + ((paragraphs.length - 1) * spaceAfter) / 72;
  if (needs <= height) return [];

  return [
    finding(
      'marketMap.callout',
      3,
      'fit',
      `runs to ${lines} lines, about ${needs.toFixed(2)}in of a ${height}in sidebar: make it shorter`,
    ),
  ];
}

/** A name with its case and spacing taken out, so two spellings can be compared. */
const squash = (/** @type {string} */ value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Words, the way a reader counts them. A hyphenated compound like
 * "go-to-market" is one word, because it is one idea and one thing to read.
 *
 * @param {string} text
 */
function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * A list a person would read: "a, b and c".
 *
 * @param {(string | undefined)[]} items
 */
function list(items) {
  const parts = items.map((item) => `"${item}"`);
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * Every piece of copy a run writes, paired with the slide it lands on, the
 * limit that applies to it, whatever sources the run recorded for it, and the
 * box the slide gives it.
 *
 * Collecting the copy once, here, is what lets each rule stay a small function
 * over one field instead of its own walk of the research object. Every rule
 * this gate grows reads the same list.
 *
 * @param {any} research
 * @returns {CopyField[]}
 */
function copyFields(research) {
  return [...thesisFields(research?.thesis), ...marketMapFields(research?.marketMap)];
}

/**
 * Slide 2: three headers and six bullets. Only the bullets carry sources, which
 * is what decides where a number is allowed to appear.
 *
 * @param {any} thesis
 * @returns {CopyField[]}
 */
function thesisFields(thesis) {
  if (!thesis || typeof thesis !== 'object') return [];

  const { header, bullet } = THESIS_GEOMETRY;
  /** @type {CopyField[]} */
  const fields = [];

  for (const section of THESIS_SECTIONS) {
    const copy = thesis[section.key];
    if (!copy || typeof copy !== 'object') continue;

    if (typeof copy.header === 'string') {
      fields.push({
        field: `thesis.${section.key}.header`,
        slide: 2,
        kind: 'header',
        text: copy.header,
        sources: [],
        // The bold label and the header share one line, so the label is part of
        // what has to fit.
        box: { width: header.w, fontSize: header.fontSize, prefix: `${section.label}: ` },
      });
    }

    const bullets = Array.isArray(copy.bullets) ? copy.bullets : [];
    bullets.forEach((written, i) => {
      if (typeof written?.text !== 'string') return;
      fields.push({
        field: `thesis.${section.key}.bullets.${i}`,
        slide: 2,
        kind: 'bullet',
        text: written.text,
        sources: (Array.isArray(written.sources) ? written.sources : []).map(String),
        // The square marker indents the text, so the column is that much
        // narrower than the box.
        box: { width: bullet.w - bullet.indent / 72, fontSize: bullet.fontSize },
      });
    });
  }

  return fields;
}

/**
 * Slide 3: the subtitle, both axes with their two sides each, and the callout.
 *
 * The axis names and their sides are labels a reader scans rather than reads,
 * so they take the header's shorter limit. The subtitle and the callout's lines
 * are sentences, and take the bullet's. None of them records a source: the
 * evidence for slide 3 hangs off each company and each axis, not off its copy.
 *
 * The callout's own fit is checked as a block, because its paragraphs share one
 * box, so its fields carry no box of their own here.
 *
 * @param {any} map
 * @returns {CopyField[]}
 */
function marketMapFields(map) {
  if (!map || typeof map !== 'object') return [];

  const { label, subtitle } = MAP;
  const half = (MAP_LAYOUT.axisEnd - MAP.plot.x) / 2;

  /** @type {CopyField[]} */
  const fields = [];
  /**
   * @param {string} field
   * @param {any} text
   * @param {'header' | 'bullet'} kind
   * @param {Box} [box]
   */
  const add = (field, text, kind, box) => {
    if (typeof text === 'string') fields.push({ field, slide: 3, kind, text, sources: [], box });
  };

  add('marketMap.subtitle', map.subtitle, 'bullet', {
    width: MAP_LAYOUT.column,
    fontSize: subtitle.fontSize,
  });

  for (const axis of /** @type {const} */ (['x', 'y'])) {
    const side = map.axes?.[axis];
    if (!side || typeof side !== 'object') continue;

    // The axis name is set in tracked capitals, which is wider than the string
    // it was written as.
    add(`marketMap.axes.${axis}.name`, side.name, 'header', {
      width: axis === 'y' ? MAP_LAYOUT.gutter : MAP_LAYOUT.axisEnd - MAP.plot.x,
      fontSize: label.name.fontSize,
      uppercase: true,
      tracking: label.name.tracking,
    });

    // A category label's box is deep enough for two lines, and the reference
    // sets one of them on two.
    const category = {
      width: axis === 'y' ? MAP_LAYOUT.gutter : half,
      fontSize: label.category.fontSize,
      bold: true,
      lines: 2,
    };
    add(`marketMap.axes.${axis}.low`, side.low, 'header', category);
    add(`marketMap.axes.${axis}.high`, side.high, 'header', category);
  }

  const callout = map.callout;
  if (callout && typeof callout === 'object') {
    add('marketMap.callout.take', callout.take, 'bullet');
    const dynamics = Array.isArray(callout.dynamics) ? callout.dynamics : [];
    dynamics.forEach((text, i) => add(`marketMap.callout.dynamics.${i}`, text, 'bullet'));
    add('marketMap.callout.proposal', callout.proposal, 'bullet');
  }

  return fields;
}

module.exports = { LIMITS, FIT_ALLOWANCE, checkRun };
