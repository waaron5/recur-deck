// The market map's content model, and the code that keeps its picture clean.
//
// Two jobs live here, and keeping them apart is the point. `marketMap` checks
// that the judgment a run wrote is a legal one: two two-sided categorical axes,
// six to nine competitors plus the target, every company evidenced and every
// placement reasoned. `placeOnMap` then tidies the picture without touching
// that judgment - it may move a logo within the quadrant its coordinates chose,
// and it may never move one out of it.
//
// Free placement was chosen over packed cells knowing the model crowds its
// coordinates, so crowding is capped in the brief instead: at most four logos
// in any quadrant, with at least three quadrants carrying a competitor. A map
// that breaks the cap is repaired with text, not with pixels.
//
// As in thesis.js, what this module checks is the object's shape and its
// countable rules. The copy itself - word counts, banned words, the swap test -
// is the content gate's job in ticket 06.

const { MAP } = require('./design.js');

/**
 * @typedef {{
 *   name: string,
 *   low: string,
 *   high: string,
 *   reasoning: string,
 * }} Axis
 * @typedef {{
 *   name: string,
 *   target: boolean,
 *   x: number,
 *   y: number,
 *   evidence: string,
 *   placement: string,
 *   logo?: any,
 *   logoNote?: string,
 * }} MapCompany
 * @typedef {{
 *   subtitle: string,
 *   axes: {x: Axis, y: Axis},
 *   companies: MapCompany[],
 *   callout: {take: string, dynamics: string[], proposal: string},
 * }} MarketMap
 */

// Fixed by the brief: a landscape, not a duel and not a crowd.
const COMPETITORS = { min: 6, max: 9 };
// Decided in ticket 10, so the deterministic nudge can always succeed.
const QUADRANT_CAP = 4;
const QUADRANTS_USED = 3;
const DYNAMICS = 2;

/** @param {unknown} value */
const text = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * The market map, checked and ready for the slide.
 *
 * Throws, naming the company or the axis at fault, rather than building a slide
 * around a hole. A competitor that cannot be evidenced, or a distribution the
 * nudge cannot resolve, is a critical defect and the run needs to hear which.
 *
 * @param {any} map  The run file's `marketMap`, as parsed from JSON.
 * @returns {MarketMap}
 */
function marketMap(map) {
  if (!map || typeof map !== 'object') {
    throw new Error(
      'the run has no market map: slide 3 needs two axes, six to nine competitors ' +
        'plus the target, and a callout',
    );
  }

  const subtitle = text(map.subtitle);
  if (!subtitle) {
    throw new Error(
      'the market map has no subtitle, which is the one neutral sentence on how the ' +
        'market divides',
    );
  }

  const axes = { x: axisOf(map.axes?.x, 'x'), y: axisOf(map.axes?.y, 'y') };
  const companies = (Array.isArray(map.companies) ? map.companies : []).map(companyOf);

  const targets = companies.filter((company) => company.target);
  if (targets.length !== 1) {
    throw new Error(
      `the market map marks ${targets.length} companies as the target, and needs exactly one`,
    );
  }

  const rivals = companies.length - 1;
  if (rivals < COMPETITORS.min || rivals > COMPETITORS.max) {
    throw new Error(
      `the market map has ${rivals} competitors, and needs six to nine competitors ` +
        'plus the target',
    );
  }

  checkDistribution(companies);

  return { subtitle, axes, companies, callout: calloutOf(map.callout) };
}

/**
 * One axis: a two-sided categorical dimension buyers actually choose on, and
 * the reasoning that slide 3's notes record for it.
 *
 * @param {any} axis
 * @param {'x'|'y'} which
 * @returns {Axis}
 */
function axisOf(axis, which) {
  if (!axis || typeof axis !== 'object') {
    throw new Error(`the market map has no ${which} axis`);
  }

  const name = text(axis.name);
  if (!name) throw new Error(`the ${which} axis has no name`);

  const low = text(axis.low);
  const high = text(axis.high);
  if (!low || !high) {
    throw new Error(
      `the ${which} axis needs both of its sides named, because a one-sided axis is not ` +
        'a dimension a buyer chooses on',
    );
  }

  const reasoning = text(axis.reasoning);
  if (!reasoning) {
    throw new Error(
      `the ${which} axis has no reasoning, and slide 3's notes record why both axes were chosen`,
    );
  }

  return { name, low, high, reasoning };
}

/**
 * One company on the map, with the coordinates the model chose for it.
 *
 * @param {any} company
 * @param {number} index
 * @returns {MapCompany}
 */
function companyOf(company, index) {
  const name = text(company?.name);
  if (!name) throw new Error(`company ${index + 1} on the market map has no name`);

  for (const axis of /** @type {const} */ (['x', 'y'])) {
    const at = company[axis];
    if (typeof at !== 'number' || !Number.isFinite(at) || at < 0 || at > 1) {
      throw new Error(
        `${name} has no usable ${axis} coordinate: every company is placed by two numbers ` +
          'between 0 and 1',
      );
    }
  }

  const evidence = text(company.evidence);
  if (!evidence) {
    throw new Error(
      `${name} has no evidence, and every company on the map is evidenced from its own site ` +
        "in slide 3's notes",
    );
  }

  const placement = text(company.placement);
  if (!placement) {
    throw new Error(
      `${name} has no placement reasoning, and every placement on the map is defensible ` +
        'from that company’s public material',
    );
  }

  return {
    name,
    target: company.target === true,
    x: company.x,
    y: company.y,
    evidence,
    placement,
    logo: company.logo,
    // Why there is no logo, when one was tried and could not be read.
    logoNote: text(company.logoNote) || undefined,
  };
}

/**
 * Which quadrant a company's coordinates put it in. The halves are the axes'
 * own midpoints, so this is the judgment the run expressed and not a reading of
 * where the logo ended up.
 *
 * @param {{x: number, y: number}} company
 */
function quadrantOf(company) {
  return `${company.x >= 0.5 ? 'right' : 'left'}-${company.y >= 0.5 ? 'top' : 'bottom'}`;
}

/**
 * The crowding rules from ticket 10, checked here so a bad distribution is
 * repaired with text rather than absorbed by the render budget.
 *
 * There is no separate check that the target has something comparable to it.
 * Decision 05 allows the target to sit alone only if a competitor shares one of
 * its axis positions, and with at least six competitors and at most four to a
 * quadrant that is guaranteed: stranding the target would need every competitor
 * in the one diagonally opposite quadrant, which the cap forbids.
 *
 * @param {MapCompany[]} companies
 */
function checkDistribution(companies) {
  /** @type {Map<string, MapCompany[]>} */
  const quadrants = new Map();
  for (const company of companies) {
    const quadrant = quadrantOf(company);
    quadrants.set(quadrant, [...(quadrants.get(quadrant) ?? []), company]);
  }

  for (const [quadrant, held] of quadrants) {
    if (held.length > QUADRANT_CAP) {
      throw new Error(
        `${held.length} companies sit in the ${quadrant} quadrant, and no quadrant may hold ` +
          `more than ${QUADRANT_CAP}: ${held.map((c) => c.name).join(', ')}`,
      );
    }
  }

  const withCompetitor = [...quadrants.values()].filter((held) =>
    held.some((company) => !company.target),
  ).length;
  if (withCompetitor < QUADRANTS_USED) {
    throw new Error(
      `the competitors fill only ${withCompetitor} of the four quadrants, and at least ` +
        `${QUADRANTS_USED} must carry one`,
    );
  }
}

/**
 * The callout: where the target wins, two bullets on market dynamics, and one
 * underlined bullet tying back to a how-we-can-help proposal.
 *
 * @param {any} callout
 */
function calloutOf(callout) {
  if (!callout || typeof callout !== 'object') {
    throw new Error('the market map has no callout, which is slide 3’s "Our take"');
  }

  const take = text(callout.take);
  if (!take) throw new Error('the callout has no "Our take" line on where the target wins');

  const dynamics = (Array.isArray(callout.dynamics) ? callout.dynamics : [])
    .map(text)
    .filter(Boolean);
  if (dynamics.length !== DYNAMICS) {
    throw new Error(
      `the callout has ${dynamics.length} dynamics bullets, and needs exactly two on how the ` +
        'market behaves',
    );
  }

  const proposal = text(callout.proposal);
  if (!proposal) {
    throw new Error('the callout has no proposal bullet tying back to how Recur can help');
  }

  return { take, dynamics, proposal };
}

/**
 * Where each logo actually goes, in inches.
 *
 * The model's coordinates decide the quadrant and the starting point; this
 * clears the overlaps the model leaves behind. Each logo is a box, overlapping
 * pairs are pushed apart, and every box is clamped inside its own quadrant on
 * every pass, so tidying the picture can never restate the judgment. The
 * target's box carries its pill, so nothing overlaps the outline either.
 *
 * @param {object} options
 * @param {(MapCompany & {size: {width: number, height: number}})[]} options.companies
 * @param {{x: number, y: number, w: number, h: number}} options.area  Inside the axes.
 * @param {number} [options.gap]
 * @returns {{name: string, cx: number, cy: number, w: number, h: number,
 *   company: MapCompany & {size: {width: number, height: number}}}[]}
 */
function placeOnMap({ companies, area, gap = MAP.gap }) {
  const midX = area.x + area.w / 2;
  const midY = area.y + area.h / 2;

  const items = companies.map((company) => {
    const right = company.x >= 0.5;
    const top = company.y >= 0.5;
    // The pill is part of the target's footprint, or a neighbour would be
    // nudged clear of the logo and straight onto its outline.
    const padX = company.target ? MAP.target.padX : 0;
    const padY = company.target ? MAP.target.padY : 0;

    return {
      name: company.name,
      company,
      w: company.size.width + 2 * padX,
      h: company.size.height + 2 * padY,
      // y runs up the axis and down the slide.
      cx: area.x + company.x * area.w,
      cy: area.y + (1 - company.y) * area.h,
      bounds: {
        x0: right ? midX : area.x,
        x1: right ? area.x + area.w : midX,
        y0: top ? area.y : midY,
        y1: top ? midY : area.y + area.h,
      },
    };
  });

  /** @param {typeof items[number]} item */
  const clamp = (item) => {
    item.cx = Math.min(Math.max(item.cx, item.bounds.x0 + item.w / 2), item.bounds.x1 - item.w / 2);
    item.cy = Math.min(Math.max(item.cy, item.bounds.y0 + item.h / 2), item.bounds.y1 - item.h / 2);
  };
  items.forEach(clamp);

  relax(items, clamp, gap);

  // Relaxation is a local process, and a run that gives every company in a
  // quadrant the same coordinates gives it nothing to work with. Rather than
  // ship touching logos, such a quadrant is laid out on a small grid of its
  // own. It still never crosses an axis, so it still never restates the
  // judgment, and it is the rare case rather than the routine path.
  for (const crowded of unresolvedQuadrants(items)) layOutOnGrid(crowded, gap);
  items.forEach(clamp);

  return items.map(({ name, cx, cy, w, h, company }) => ({ name, cx, cy, w, h, company }));
}

// The directions two coincident boxes separate along, so a group given one
// identical coordinate fans out in two dimensions instead of down one line.
// Each has a largest component of 1, which is the unit the push below measures.
const SEEDS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/**
 * Push overlapping boxes apart, measuring each overlap in units of the box that
 * has to clear it rather than in inches.
 *
 * That normalisation is what keeps a crowded quadrant from collapsing into one
 * tall column. A pair still separates mostly along whichever axis is closest to
 * being free, which is the shortest way out and what decision 10 describes, but
 * the movement keeps its component along the other axis too, so four logos
 * settle into two rows rather than a stack no quadrant is tall enough to hold.
 *
 * @param {{cx: number, cy: number, w: number, h: number}[]} items
 * @param {(item: any) => void} clamp
 * @param {number} gap
 */
function relax(items, clamp, gap) {
  for (let pass = 0; pass < 400; pass += 1) {
    let moved = false;

    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        // One unit is "just clear", along each axis.
        const unitX = (a.w + b.w) / 2 + gap;
        const unitY = (a.h + b.h) / 2 + gap;
        const nx = (a.cx - b.cx) / unitX;
        const ny = (a.cy - b.cy) / unitY;

        const apart = Math.max(Math.abs(nx), Math.abs(ny));
        if (apart >= 1) continue;
        moved = true;

        // Two companies handed the same coordinates have no direction of their
        // own, so they take a fixed one from their place in the list, which
        // keeps a rebuild after a repair identical to the run before it.
        const [ux, uy] =
          apart < 1e-6 ? SEEDS[(i * 3 + j) % SEEDS.length] : [nx / apart, ny / apart];
        const step = (1 - apart) / 2;

        a.cx += ux * unitX * step;
        a.cy += uy * unitY * step;
        b.cx -= ux * unitX * step;
        b.cy -= uy * unitY * step;
      }
    }

    items.forEach(clamp);
    if (!moved) break;
  }
}

/**
 * Whether two boxes actually overlap. The gap is what relaxation aims for; a
 * pair merely closer than the gap is tight, not broken, and does not earn the
 * grid.
 *
 * @param {{cx: number, cy: number, w: number, h: number}} a
 * @param {{cx: number, cy: number, w: number, h: number}} b
 */
function overlapping(a, b) {
  return (
    Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 - 1e-6 &&
    Math.abs(a.cy - b.cy) < (a.h + b.h) / 2 - 1e-6
  );
}

/**
 * The quadrants relaxation could not settle, each as its own group of boxes.
 *
 * @template {{cx: number, cy: number, w: number, h: number,
 *   bounds: {x0: number, y0: number}}} T
 * @param {T[]} items
 * @returns {T[][]}
 */
function unresolvedQuadrants(items) {
  /** @type {Map<string, T[]>} */
  const quadrants = new Map();
  for (const item of items) {
    const key = `${item.bounds.x0},${item.bounds.y0}`;
    quadrants.set(key, [...(quadrants.get(key) ?? []), item]);
  }

  return [...quadrants.values()].filter((group) =>
    group.some((a) => group.some((b) => a !== b && overlapping(a, b))),
  );
}

/**
 * Lay one quadrant's logos out on a grid, in the reading order its coordinates
 * imply: highest on the vertical axis first, then left to right.
 *
 * @param {{cx: number, cy: number, w: number, h: number, name: string,
 *   company: {x: number, y: number},
 *   bounds: {x0: number, x1: number, y0: number, y1: number}}[]} group
 * @param {number} gap
 */
function layOutOnGrid(group, gap) {
  const ordered = [...group].sort(
    (a, b) => b.company.y - a.company.y || a.company.x - b.company.x || a.name.localeCompare(b.name),
  );

  const columns = ordered.length === 1 ? 1 : 2;
  /** @type {(typeof ordered)[]} */
  const rows = [];
  for (let at = 0; at < ordered.length; at += columns) rows.push(ordered.slice(at, at + columns));

  const heights = rows.map((row) => Math.max(...row.map((item) => item.h)));
  const stack = heights.reduce((total, h) => total + h, 0) + gap * (rows.length - 1);

  const { x0, x1, y0, y1 } = ordered[0].bounds;
  let y = y0 + Math.max(0, (y1 - y0 - stack) / 2);

  rows.forEach((row, r) => {
    const width = row.reduce((total, item) => total + item.w, 0) + gap * (row.length - 1);
    let x = x0 + Math.max(0, (x1 - x0 - width) / 2);
    for (const item of row) {
      item.cx = x + item.w / 2;
      item.cy = y + heights[r] / 2;
      x += item.w + gap;
    }
    y += heights[r] + gap;
  });
}

/**
 * Slide 3's share of the source record: the axes and why they were chosen, then
 * every company with the evidence that it competes and the reasoning for where
 * it sits.
 *
 * Any company the slide set as type is recorded with the reason, the way slide
 * 1 records the cover's own fallback. A reviewer should never have to guess
 * whether a wordmark was a decision or a failure.
 *
 * @param {MarketMap} map
 * @param {Map<string, {kind: string, reason?: string}>} [marks]  What each name carries.
 * @returns {string}
 */
function marketMapNotes(map, marks = new Map()) {
  const lines = [`Subtitle: ${map.subtitle}`, ''];

  for (const which of /** @type {const} */ (['y', 'x'])) {
    const axis = map.axes[which];
    lines.push(`${which.toUpperCase()} axis: ${axis.name} (${axis.low} / ${axis.high})`);
    lines.push(`  Reasoning: ${axis.reasoning}`);
  }
  lines.push('');

  for (const company of map.companies) {
    lines.push(`${company.name}${company.target ? ' (target)' : ''}`);
    lines.push(`  Evidence: ${company.evidence}`);
    lines.push(`  Placement: ${company.placement}`);

    const mark = marks.get(company.name);
    if (mark?.kind === 'wordmark' && mark.reason) {
      lines.push(`  Mark: text wordmark, because ${mark.reason}`);
    }
  }

  return lines.join('\n').trim();
}

module.exports = {
  COMPETITORS,
  QUADRANT_CAP,
  marketMap,
  quadrantOf,
  placeOnMap,
  marketMapNotes,
};
