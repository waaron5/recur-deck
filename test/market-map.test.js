// The market map's content model and its placement engine.
//
// These tests sit at the module seam rather than the .pptx, because two
// different things have to hold and only one of them is visible on a slide:
// the judgment the run wrote has to be a legal one, and the code that cleans
// the picture up must never change that judgment.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { marketMap, placeOnMap, marketMapNotes } = require('../skill/src/market-map.js');
const { TEST_MARKET_MAP, marketMapWith } = require('./helpers.js');

/** The map with its company list replaced. */
const withCompanies = (companies) => marketMapWith('companies', companies);

/** The test map's competitors, with the target left out. */
const competitors = () => TEST_MARKET_MAP.companies.filter((c) => !c.target);

test('a well-formed map is accepted, with its target named', () => {
  const map = marketMap(TEST_MARKET_MAP);

  assert.equal(map.companies.length, 10, 'nine competitors plus the target');
  const targets = map.companies.filter((c) => c.target);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].name, 'US Fleet Tracking');
  assert.equal(map.subtitle, TEST_MARKET_MAP.subtitle);
});

test('both axes carry a name, two sides, and the reasoning behind them', () => {
  const map = marketMap(TEST_MARKET_MAP);

  for (const key of ['x', 'y']) {
    assert.equal(map.axes[key].name, TEST_MARKET_MAP.axes[key].name);
    assert.ok(map.axes[key].low && map.axes[key].high, `${key} axis needs both sides`);
    assert.ok(map.axes[key].reasoning, `${key} axis needs its reasoning for the notes`);
  }
});

test('an axis missing a side or its reasoning is rejected, by name', () => {
  // A one-sided axis is not a categorical dimension a buyer chooses on, and an
  // axis with no reasoning has nothing to put in the source record.
  const noSide = marketMapWith('axes', {
    ...TEST_MARKET_MAP.axes,
    x: { ...TEST_MARKET_MAP.axes.x, high: '' },
  });
  assert.throws(() => marketMap(noSide), /x axis/i);

  const noReason = marketMapWith('axes', {
    ...TEST_MARKET_MAP.axes,
    y: { ...TEST_MARKET_MAP.axes.y, reasoning: '  ' },
  });
  assert.throws(() => marketMap(noReason), /y axis.*reasoning/i);
});

test('the map carries six to nine competitors plus the target', () => {
  // Fewer than six is not a landscape, and more than nine is a crowd no
  // founder reads. The target is counted separately from the six-to-nine.
  const five = withCompanies([TEST_MARKET_MAP.companies[0], ...competitors().slice(0, 5)]);
  assert.throws(() => marketMap(five), /5 competitors|six/i);

  const ten = withCompanies([
    ...TEST_MARKET_MAP.companies,
    { ...competitors()[0], name: 'Fleetio', x: 0.8, y: 0.45 },
  ]);
  assert.throws(() => marketMap(ten), /10 competitors|nine/i);
});

test('exactly one company is the target', () => {
  const none = withCompanies(competitors());
  assert.throws(() => marketMap(none), /target/i);

  const two = withCompanies(
    TEST_MARKET_MAP.companies.map((c, i) => (i <= 1 ? { ...c, target: true } : c)),
  );
  assert.throws(() => marketMap(two), /target/i);
});

test('a competitor with no evidence or no placement reasoning is rejected, by name', () => {
  // Slide 3's notes pair each competitor with the evidence that it competes and
  // the reasoning for where it sits. A competitor that cannot be evidenced is a
  // critical defect, not a quality note.
  const unevidenced = withCompanies(
    TEST_MARKET_MAP.companies.map((c) => (c.name === 'Linxup' ? { ...c, evidence: '' } : c)),
  );
  assert.throws(() => marketMap(unevidenced), /Linxup.*evidence/i);

  const unreasoned = withCompanies(
    TEST_MARKET_MAP.companies.map((c) => (c.name === 'Geotab' ? { ...c, placement: '' } : c)),
  );
  assert.throws(() => marketMap(unreasoned), /Geotab.*placement|Geotab.*reasoning/i);
});

test('a coordinate outside the map is rejected, by name', () => {
  const offMap = withCompanies(
    TEST_MARKET_MAP.companies.map((c) => (c.name === 'Motive' ? { ...c, x: 1.4 } : c)),
  );
  assert.throws(() => marketMap(offMap), /Motive/i);

  const missing = withCompanies(
    TEST_MARKET_MAP.companies.map((c) => (c.name === 'Azuga' ? { ...c, y: undefined } : c)),
  );
  assert.throws(() => marketMap(missing), /Azuga/i);
});

test('no quadrant may hold more than four logos', () => {
  // Crowding is capped in the brief rather than absorbed by the render budget:
  // a bad distribution is repaired with text, not pixels.
  const crowded = withCompanies(
    TEST_MARKET_MAP.companies.map((c) =>
      ['Samsara', 'Verizon Connect', 'Geotab', 'Teletrac Navman'].includes(c.name)
        ? { ...c, x: 0.1, y: 0.8 }
        : c,
    ),
  );
  assert.throws(() => marketMap(crowded), /quadrant/i);
});

test('at least three of the four quadrants carry a competitor', () => {
  // A map whose competitors sit in only two quadrants is not a landscape, it is
  // a line. Six competitors split three and three is the case that isolates
  // this rule: it is the fewest competitors allowed and it stays inside the
  // crowding cap, so the map can only fail on its spread.
  const twoQuadrants = withCompanies([
    TEST_MARKET_MAP.companies[0],
    ...competitors()
      .slice(0, 3)
      .map((c) => ({ ...c, x: 0.2, y: 0.8 })),
    ...competitors()
      .slice(3, 6)
      .map((c) => ({ ...c, x: 0.2, y: 0.2 })),
  ]);
  assert.throws(() => marketMap(twoQuadrants), /quadrant/i);
});

test('the target may sit alone in its quadrant, and is not rejected for it', () => {
  // Decision 05 allows the target to sit alone when the callout explains the
  // white space and at least one competitor shares one of its axis positions.
  // There is no separate check for that sharing, because the rules above
  // already guarantee it: stranding the target would need every competitor in
  // the one diagonally opposite quadrant, and six competitors cannot fit under
  // a cap of four. The case this code can get wrong is the opposite one, of
  // refusing a legal map, so that is what is pinned here.
  //
  // Moving Linxup out leaves the target alone at the top right, with Motive
  // still sharing its right-hand position.
  const alone = withCompanies(
    TEST_MARKET_MAP.companies.map((c) => (c.name === 'Linxup' ? { ...c, x: 0.3, y: 0.62 } : c)),
  );
  const map = marketMap(alone);

  const target = map.companies.find((c) => c.target);
  if (!target) assert.fail('the map should carry a target');
  const itsQuadrant = map.companies.filter(
    (c) => (c.x >= 0.5) === (target.x >= 0.5) && (c.y >= 0.5) === (target.y >= 0.5),
  );
  assert.deepEqual(
    itsQuadrant.map((c) => c.name),
    ['US Fleet Tracking'],
    'the target should be the only company left in its quadrant',
  );

  const comparable = map.companies.filter(
    (c) => !c.target && ((c.x >= 0.5) === (target.x >= 0.5) || (c.y >= 0.5) === (target.y >= 0.5)),
  );
  assert.ok(comparable.length > 0, 'and something on the map stays comparable to it');
});

test('the callout is "Our take", exactly two dynamics bullets, and one proposal', () => {
  const map = marketMap(TEST_MARKET_MAP);
  assert.equal(map.callout.dynamics.length, 2);
  assert.ok(map.callout.take && map.callout.proposal);

  const oneDynamic = marketMapWith('callout', {
    ...TEST_MARKET_MAP.callout,
    dynamics: [TEST_MARKET_MAP.callout.dynamics[0]],
  });
  assert.throws(() => marketMap(oneDynamic), /dynamics|two/i);

  const noProposal = marketMapWith('callout', { ...TEST_MARKET_MAP.callout, proposal: '' });
  assert.throws(() => marketMap(noProposal), /proposal/i);
});

test('a map with no subtitle is rejected', () => {
  assert.throws(() => marketMap(marketMapWith('subtitle', '  ')), /subtitle/i);
  assert.throws(() => marketMap(undefined), /market map/i);
});

test("the notes carry every competitor's evidence, every placement, and both axes", () => {
  // This is slide 3's share of the source record. A reviewer spot-checking the
  // map reads why each company is on it and why it sits where it does.
  const notes = marketMapNotes(marketMap(TEST_MARKET_MAP));

  for (const company of TEST_MARKET_MAP.companies) {
    assert.ok(notes.includes(company.name), `the notes should name ${company.name}`);
    assert.ok(notes.includes(company.placement), `and give ${company.name}'s placement reasoning`);
    assert.ok(notes.includes(company.evidence), `and ${company.name}'s evidence`);
  }
  for (const key of ['x', 'y']) {
    assert.ok(
      notes.includes(TEST_MARKET_MAP.axes[key].reasoning),
      `the notes should reason the ${key} axis`,
    );
  }
});

test('the notes record why a company was set as type', () => {
  // Slide 1 records the reason its cover fell back to a wordmark, and the map
  // owes a reviewer the same: otherwise a competitor set in type reads as
  // something that went wrong rather than as a decision.
  const map = marketMap(TEST_MARKET_MAP);
  const marks = new Map([
    ['Linxup', { kind: 'wordmark', reason: 'the logo could not be used: unknown format' }],
    ['Motive', { kind: 'logo' }],
  ]);

  const notes = marketMapNotes(map, marks);
  assert.match(
    notes,
    /Linxup[\s\S]*?text wordmark, because the logo could not be used: unknown format/,
    "the reason should follow Linxup's own entry",
  );
  assert.ok(
    !/Motive[\s\S]*?text wordmark/.test(notes),
    'a company that kept its logo needs no such line',
  );
});

// ---------- placement ----------

// The inner placement area, in inches, as slide 3 hands it over: the axes'
// rectangle pulled in so no logo sits on a line, and stopping one sidebar pad
// short of the callout. Written as literals rather than imported, so these
// assertions can disagree with the code rather than follow it.
const AREA = { x: 1.9125, y: 2.0823, w: 4.7625, h: 2.5354 };

// The scaled map slot: every logo is at most this box.
const BOX = { w: 1.0875, h: 0.315 };

/** Boxes for a set of coordinates, all at the full slot size. */
function boxesFor(companies) {
  return companies.map((c) => ({ ...c, size: { width: BOX.w, height: BOX.h } }));
}

/** Which quadrant a point falls in, as the placement code must agree it does. */
function quadrantOf(company) {
  return `${company.x >= 0.5 ? 'right' : 'left'}-${company.y >= 0.5 ? 'top' : 'bottom'}`;
}

test('no two logos overlap once the nudge has run', () => {
  // Free placement was chosen over packed cells knowing the model crowds its
  // coordinates. Code treats each logo as a box and pushes overlapping pairs
  // apart along their smaller overlap.
  const placed = placeOnMap({ companies: boxesFor(marketMap(TEST_MARKET_MAP).companies), area: AREA });

  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i];
      const b = placed[j];
      const apart =
        Math.abs(a.cx - b.cx) >= (a.w + b.w) / 2 - 0.001 ||
        Math.abs(a.cy - b.cy) >= (a.h + b.h) / 2 - 0.001;
      assert.ok(apart, `${a.name} and ${b.name} still overlap after nudging`);
    }
  }
});

test('the nudge never moves a logo out of the quadrant its coordinates put it in', () => {
  // This is what keeps the cleanup from changing the judgment: a company the
  // run placed among the enterprise players may not drift into the SMB half.
  const map = marketMap(TEST_MARKET_MAP);
  const placed = placeOnMap({ companies: boxesFor(map.companies), area: AREA });

  const midX = AREA.x + AREA.w / 2;
  const midY = AREA.y + AREA.h / 2;

  for (const box of placed) {
    const landedIn = `${box.cx >= midX ? 'right' : 'left'}-${box.cy <= midY ? 'top' : 'bottom'}`;
    const chosen = quadrantOf(box.company);
    assert.equal(landedIn, chosen, `${box.name} was placed ${chosen} but nudged into ${landedIn}`);
  }
});

test('every logo stays inside the plotting area', () => {
  const placed = placeOnMap({ companies: boxesFor(marketMap(TEST_MARKET_MAP).companies), area: AREA });

  for (const box of placed) {
    assert.ok(box.cx - box.w / 2 >= AREA.x - 0.001, `${box.name} runs off the left of the plot`);
    assert.ok(
      box.cx + box.w / 2 <= AREA.x + AREA.w + 0.001,
      `${box.name} runs under the callout sidebar`,
    );
    assert.ok(box.cy - box.h / 2 >= AREA.y - 0.001, `${box.name} runs above the plot`);
    assert.ok(
      box.cy + box.h / 2 <= AREA.y + AREA.h + 0.001,
      `${box.name} runs below the axis`,
    );
  }
});

test('a quadrant packed to its legal limit still resolves', () => {
  // Four logos in one quadrant is the most the brief allows, and the cap exists
  // so the nudge can always succeed. If it cannot, the cap is wrong.
  const packed = marketMap(TEST_MARKET_MAP).companies.map((c) =>
    ['Samsara', 'Verizon Connect', 'Geotab', 'Teletrac Navman'].includes(c.name)
      ? { ...c, x: 0.2, y: 0.2 }
      : c,
  );
  const placed = placeOnMap({ companies: boxesFor(packed), area: AREA });

  const corner = placed.filter((p) =>
    ['Samsara', 'Verizon Connect', 'Geotab', 'Teletrac Navman'].includes(p.name),
  );
  for (let i = 0; i < corner.length; i += 1) {
    for (let j = i + 1; j < corner.length; j += 1) {
      const a = corner[i];
      const b = corner[j];
      const apart =
        Math.abs(a.cx - b.cx) >= (a.w + b.w) / 2 - 0.001 ||
        Math.abs(a.cy - b.cy) >= (a.h + b.h) / 2 - 0.001;
      assert.ok(apart, `${a.name} and ${b.name} overlap in a legally packed quadrant`);
    }
  }
});

test('placement is deterministic, so a rebuild after a repair moves nothing', () => {
  const map = marketMap(TEST_MARKET_MAP);
  const once = placeOnMap({ companies: boxesFor(map.companies), area: AREA });
  const twice = placeOnMap({ companies: boxesFor(map.companies), area: AREA });
  assert.deepEqual(once, twice);
});
