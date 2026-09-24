// The content gate: the countable writing rules, checked before a deck is built.
//
// These tests sit at the module seam rather than the .pptx, because the gate's
// whole purpose is to report every problem at once so a repair round can fix
// them together. A throw would report one; these assert on the findings list.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { checkRun } = require('../skill/src/content-gate.js');
const { TEST_RESEARCH, researchWith } = require('./helpers.js');

/** The fields a set of findings names, for asserting on what was caught. */
const fieldsIn = (findings) => findings.map((finding) => finding.field);

/** The findings a run produces under one rule. */
const under = (findings, rule) => findings.filter((finding) => finding.rule === rule);

test('a run that follows the writing rules produces no findings', () => {
  // The fixture is the US Fleet Tracking research object the deck is built from
  // elsewhere in these tests. If the gate cannot pass its own reference run,
  // every other assertion here is measuring the wrong thing.
  assert.deepEqual(checkRun(TEST_RESEARCH), []);
});

test('a header over twelve words is caught, by field', () => {
  // The limits are decision 05's, as amended: headers within 12 words, bullets
  // within 16. A founder reads a header as a claim and a bullet as its support,
  // and both stop working at the length where they need re-reading.
  const research = researchWith({
    thesis: {
      here: {
        header:
          'Commercial fleets across every region are now firmly mid-cycle in their ' +
          'adoption of real-time telematics platforms',
        bullets: TEST_RESEARCH.thesis.here.bullets,
      },
    },
  });

  const findings = under(checkRun(research), 'word-count');
  assert.deepEqual(fieldsIn(findings), ['thesis.here.header']);
  assert.match(findings[0].message, /12 words/);
});

test('an overlong bullet is caught in every section that carries one', () => {
  const long =
    'Small commercial fleets in almost every region still coordinate their daily ' +
    'dispatch work on homegrown spreadsheet tools';
  const research = researchWith({
    thesis: {
      excited: {
        header: TEST_RESEARCH.thesis.excited.header,
        bullets: [
          { text: long, sources: ['https://www.usfleettracking.com/'] },
          TEST_RESEARCH.thesis.excited.bullets[1],
        ],
      },
    },
  });

  const findings = under(checkRun(research), 'word-count');
  assert.deepEqual(fieldsIn(findings), ['thesis.excited.bullets.0']);
  assert.match(findings[0].message, /16 words/);
});

test('a bullet may run to sixteen words', () => {
  // The September 18 amendment moved the limit from 14 to 16, which is what the
  // box holds. The fit estimate still catches a long line of long words.
  const research = researchWith({
    thesis: {
      excited: {
        bullets: [
          {
            text: 'Dispatchers see every truck in the fleet on one live map that refreshes every ten seconds',
            sources: ['https://www.usfleettracking.com/'],
          },
          TEST_RESEARCH.thesis.excited.bullets[1],
        ],
      },
    },
  });

  assert.deepEqual(under(checkRun(research), 'word-count'), []);
});

test("the gate lets through the words and punctuation Recur's own slides use", () => {
  // The banned list and every punctuation rule but the question mark are gone.
  // Measured before they went: Recur's own introduction failed them on
  // "unlock", an en dash, parentheses and a semicolon. A gate that refuses the
  // voice exemplar is policing the wrong thing, so these lines pass on
  // vocabulary and punctuation. The first four are slides 4-9's own, shortened
  // where the original ran wider than a bullet column.
  for (const text of [
    'We partner with mission-critical software companies to unlock latent growth potential',
    "We've spent our careers in software – we know what great looks like",
    'Backed by top technology investors (our alma mater)',
    "We're thought partners to our teams; we're in it for the long haul",
    'Fleets that switch keep tracking seamlessly - no new hardware!',
  ]) {
    const research = researchWith({
      thesis: {
        help: {
          bullets: [
            { text, sources: ['Recur introduction, slide 9'] },
            TEST_RESEARCH.thesis.help.bullets[1],
          ],
        },
      },
    });
    const findings = checkRun(research).filter((f) => f.field === 'thesis.help.bullets.0');
    assert.deepEqual(findings, [], `refused: ${text}`);
  }
});

test('a question mark is still refused, because every line on these slides is a statement', () => {
  // The one punctuation rule left standing. It stands in for decision 05's ban
  // on rhetorical questions: nothing on slides 4-9 asks one, and neither does
  // the copy written to sit in front of them.
  const research = researchWith({
    thesis: {
      here: {
        bullets: [
          {
            text: 'Why do small fleets still coordinate dispatch on paper?',
            sources: ['https://www.fleetowner.com/technology/telematics'],
          },
          TEST_RESEARCH.thesis.here.bullets[1],
        ],
      },
    },
  });

  const findings = under(checkRun(research), 'punctuation');
  assert.deepEqual(fieldsIn(findings), ['thesis.here.bullets.0']);
  assert.match(findings[0].message, /question/i);
});

test('every problem comes back at once, across fields and rules', () => {
  // This is the whole reason the gate returns findings instead of throwing: a
  // repair round rewrites the failing fields together, and a run only gets
  // three rounds. Reporting one problem at a time would spend them.
  const research = researchWith({
    thesis: {
      here: {
        // Kept comfortably inside its box: this test is about several rules
        // reporting together, and a header that also overflowed would tie it to
        // the fit allowance. "Traking" is the misspelling the company-name rule
        // catches; the bullet's question mark is what the punctuation rule does.
        header: 'US Fleet Traking customers are mid-cycle in adopting telematics',
        bullets: [
          {
            text: 'Why do small commercial fleets still coordinate dispatch by hand?',
            sources: ['https://www.fleetowner.com/technology/telematics'],
          },
          TEST_RESEARCH.thesis.here.bullets[1],
        ],
      },
    },
  });

  const findings = checkRun(research);
  assert.deepEqual(
    [...new Set(findings.map((f) => f.rule))].sort(),
    ['company-name', 'punctuation'],
  );
  assert.deepEqual(
    [...new Set(fieldsIn(findings))].sort(),
    ['thesis.here.bullets.0', 'thesis.here.header'],
  );
});

test('a number is allowed where the run recorded a source for it', () => {
  // Decision 05 allows a number only when a primary source states it. The
  // bullet is where a run records its sources, so a bullet is where a number
  // can live.
  const research = researchWith({
    thesis: {
      excited: {
        header: TEST_RESEARCH.thesis.excited.header,
        bullets: [
          {
            text: 'Vehicle locations refresh on a live map every 10 seconds',
            sources: ['https://www.usfleettracking.com/'],
          },
          TEST_RESEARCH.thesis.excited.bullets[1],
        ],
      },
    },
  });

  assert.deepEqual(under(checkRun(research), 'unsourced-number'), []);
});

test('a number in a field that carries no sources is refused', () => {
  // The subtitle, the axis labels and the callout have nowhere to record a
  // source, so a number on them cannot be traced and cannot be checked.
  const research = researchWith({
    marketMap: { subtitle: 'Fleet telematics splits across 4 kinds of platform' },
  });

  const findings = under(checkRun(research), 'unsourced-number');
  assert.deepEqual(fieldsIn(findings), ['marketMap.subtitle']);
  assert.equal(findings[0].slide, 3);
});

test('a number sourced only to an aggregator is refused', () => {
  // Crunchbase and ZoomInfo estimates are never facts, however confidently they
  // are stated. A number leaning on one is exactly the invented fact this gate
  // exists to stop.
  const research = researchWith({
    thesis: {
      excited: {
        header: TEST_RESEARCH.thesis.excited.header,
        bullets: [
          {
            text: 'US Fleet Tracking serves more than 3000 commercial fleets',
            sources: ['https://www.crunchbase.com/organization/us-fleet-tracking'],
          },
          TEST_RESEARCH.thesis.excited.bullets[1],
        ],
      },
    },
  });

  const findings = under(checkRun(research), 'unsourced-number');
  assert.deepEqual(fieldsIn(findings), ['thesis.excited.bullets.0']);
  assert.match(findings[0].message, /crunchbase/i);
});

test("the company's name is spelled the way the run received it", () => {
  // A deck that misspells the founder's own company is not a quality note. The
  // check is against the literal the user typed, so a run cannot quietly
  // restyle "US Fleet Tracking" into "USFleetTracking" on the way through.
  for (const wrong of ['USFleetTracking', 'US Fleet tracking', 'US fleet Tracking']) {
    const research = researchWith({
      thesis: {
        excited: {
          header: `${wrong} sells live GPS tracking without long contracts`,
          bullets: TEST_RESEARCH.thesis.excited.bullets,
        },
      },
    });

    const findings = under(checkRun(research), 'company-name');
    assert.deepEqual(fieldsIn(findings), ['thesis.excited.header'], `missed: ${wrong}`);
    assert.match(findings[0].message, /US Fleet Tracking/);
  }

  // The fixture names the company correctly all over slides 2 and 3.
  assert.deepEqual(under(checkRun(TEST_RESEARCH), 'company-name'), []);
});

test("a misspelling of the company's name is caught, not just a restyling", () => {
  // "USFleetTracking" has the same letters in the same order; "US Fleet
  // Traking" does not, and squashing the two would never bring them together.
  // A deck that misspells the founder's own company is not a quality note.
  const research = researchWith({
    thesis: { excited: { header: 'US Fleet Traking sells live GPS tracking without contracts' } },
  });

  const findings = under(checkRun(research), 'company-name');
  assert.deepEqual(fieldsIn(findings), ['thesis.excited.header']);
  assert.match(findings[0].message, /US Fleet Traking/);
});

test('a number sourced to the founder’s own channel is allowed', () => {
  // Decision 05 ranks a founder's LinkedIn as one of the company's own
  // channels, and bans only aggregator estimates. Refusing it would push a run
  // towards dropping a fact it had properly sourced.
  const research = researchWith({
    thesis: {
      excited: {
        bullets: [
          {
            text: 'The founder has led the company for 15 years',
            sources: ['https://www.linkedin.com/in/founder'],
          },
          TEST_RESEARCH.thesis.excited.bullets[1],
        ],
      },
    },
  });

  assert.deepEqual(under(checkRun(research), 'unsourced-number'), []);
});

test('the target on the map carries the company its own name', () => {
  // The target's mark is what a founder looks for first on slide 3.
  const research = researchWith({
    marketMap: {
      companies: TEST_RESEARCH.marketMap.companies.map((company) =>
        company.target ? { ...company, name: 'USFleetTracking' } : company,
      ),
    },
  });

  const findings = under(checkRun(research), 'company-name');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].slide, 3);
});

test('a thesis bullet with no source is reported, rather than thrown', () => {
  // thesis.js throws on this, because a deck cannot be built around it. The
  // gate's job is to say so as a finding, so the run can repair the bullet
  // alongside whatever else is wrong instead of discovering one hole per round.
  const research = researchWith({
    thesis: {
      excited: {
        header: TEST_RESEARCH.thesis.excited.header,
        bullets: [
          { text: 'Vehicle locations refresh on a live map every ten seconds', sources: [] },
          TEST_RESEARCH.thesis.excited.bullets[1],
        ],
      },
    },
  });

  const findings = under(checkRun(research), 'source-record');
  assert.deepEqual(fieldsIn(findings), ['thesis.excited.bullets.0.sources']);
  assert.equal(findings[0].slide, 2);
});

test('every hole in the source record is named at once, not one per round', () => {
  // These are the source record for slide 3, and a competitor nobody can check
  // is exactly the non-competing competitor the brief calls a critical defect.
  //
  // Reporting them together is the point. market-map.js throws on its first
  // hole, so a run with three unevidenced competitors would spend all three of
  // its repair rounds discovering them one at a time.
  const research = researchWith({
    marketMap: {
      axes: {
        ...TEST_RESEARCH.marketMap.axes,
        y: { ...TEST_RESEARCH.marketMap.axes.y, reasoning: '' },
      },
      companies: TEST_RESEARCH.marketMap.companies.map((company) =>
        company.name === 'Samsara' ? { ...company, evidence: '  ', placement: '' } : company,
      ),
    },
  });

  const findings = under(checkRun(research), 'source-record');
  assert.deepEqual(fieldsIn(findings), [
    'marketMap.axes.y.reasoning',
    'marketMap.companies.5.evidence',
    'marketMap.companies.5.placement',
  ]);
  for (const problem of findings) assert.equal(problem.slide, 3);
  assert.match(findings[1].message, /Samsara/);
});

test('a quadrant holding five companies is caught in the content, not at render time', () => {
  // Decision 10 capped crowding in the brief precisely so this is repaired with
  // words. The nudge at build time may move a logo inside its own quadrant, and
  // it may never move one across an axis, so a crowded quadrant is a judgment
  // to rewrite rather than a picture to tidy.
  const research = researchWith({
    marketMap: {
      companies: TEST_RESEARCH.marketMap.companies.map((company) =>
        company.name === 'Force Fleet Tracking' ? { ...company, x: 0.24, y: 0.13 } : company,
      ),
    },
  });

  const findings = under(checkRun(research), 'distribution');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].slide, 3);
  assert.match(findings[0].message, /quadrant/i);
});

test('a map leaving two quadrants empty of competitors is caught', () => {
  // Six competitors down one side of the map is not a landscape, it is a list.
  const target = TEST_RESEARCH.marketMap.companies.find((company) => company.target);
  const crowded = [
    target,
    ...['Azuga', 'GPS Insight', 'Force Fleet Tracking'].map((name, i) => ({
      name,
      x: 0.1 + i * 0.1,
      y: 0.8,
      evidence: `https://example.com/${i}`,
      placement: 'Sells fleet tracking to small fleets.',
    })),
    ...['Samsara', 'Verizon Connect', 'Geotab'].map((name, i) => ({
      name,
      x: 0.1 + i * 0.1,
      y: 0.2,
      evidence: `https://example.com/enterprise-${i}`,
      placement: 'Sells telematics to enterprise fleets.',
    })),
  ];

  const findings = under(
    checkRun(researchWith({ marketMap: { companies: crowded } })),
    'distribution',
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /quadrants/i);
});

test('the reference run fits every box it has to sit in', () => {
  // The false-positive guard, and the reason the fit check leaves an allowance:
  // this fixture is the reference deck's own copy, and the reference sets each
  // of these lines without overflowing. A gate that fired here would spend a
  // repair round on every single run.
  //
  // It covers the two-line cases too. "Enterprise and large fleets" does not
  // fit the axis gutter on one line, and is not meant to: its box is 0.36in
  // deep and holds two.
  assert.deepEqual(under(checkRun(TEST_RESEARCH), 'fit'), []);
});

test('a bullet too wide for its column is caught before anything is rendered', () => {
  // Fourteen words, inside the limit of 16, so only the fit rule can catch
  // this. Long words fill a column that short ones would not.
  const research = researchWith({
    thesis: {
      excited: {
        header: TEST_RESEARCH.thesis.excited.header,
        bullets: [
          {
            text:
              'Enterprise telematics platforms configure comprehensive multi-vehicle ' +
              'transportation management deployments for exceptionally large distributed fleets',
            sources: ['https://www.usfleettracking.com/'],
          },
          TEST_RESEARCH.thesis.excited.bullets[1],
        ],
      },
    },
  });

  const findings = under(checkRun(research), 'fit');
  assert.deepEqual(fieldsIn(findings), ['thesis.excited.bullets.0']);
  assert.equal(findings[0].slide, 2);
});

test('a header is measured with its section label in front of it', () => {
  // The bold label and the header share one line and one box on the slide, so
  // a header measured on its own would be measured against the wrong width.
  const research = researchWith({
    thesis: {
      here: {
        header:
          'Commercial transportation fleets are progressively adopting continuously ' +
          'refreshed vehicle positioning telemetry nationwide',
        bullets: TEST_RESEARCH.thesis.here.bullets,
      },
    },
  });

  const findings = under(checkRun(research), 'fit');
  assert.deepEqual(fieldsIn(findings), ['thesis.here.header']);
});

test('the fix is always shorter text, and never smaller type', () => {
  // Type sizes are fixed design values. A gate that suggested shrinking them
  // would be telling a run to break the one rule the whole deck is held to.
  const research = researchWith({
    thesis: {
      here: {
        header:
          'Commercial transportation fleets are progressively adopting continuously ' +
          'refreshed vehicle positioning telemetry nationwide',
        bullets: TEST_RESEARCH.thesis.here.bullets,
      },
    },
  });

  for (const finding of checkRun(research)) {
    assert.doesNotMatch(finding.message, /smaller|shrink|font size|point size|\bpt\b/i);
  }
  assert.match(under(checkRun(research), 'fit')[0].message, /short/i);
});

test('a finding names the slide it sits on, so a repair round can report by slide', () => {
  const research = researchWith({
    thesis: {
      help: {
        header:
          "Bring Recur's considerable go-to-market, product, payments and artificial " +
          'intelligence strengths to US Fleet Tracking today',
        bullets: TEST_RESEARCH.thesis.help.bullets,
      },
    },
  });

  const [finding] = under(checkRun(research), 'word-count');
  assert.equal(finding.slide, 2);
});

/**
 * A thesis whose six bullets are the given texts, in section order, each
 * sourced, so a test can talk about the six as the set they are.
 *
 * @param {string[]} texts
 */
function thesisOf(texts) {
  const source = ['https://www.usfleettracking.com/'];
  const pair = (at) => [texts[at], texts[at + 1]].map((text) => ({ text, sources: source }));
  return researchWith({
    thesis: {
      here: { bullets: pair(0) },
      excited: { bullets: pair(2) },
      help: { bullets: pair(4) },
    },
  });
}

// A bullet already known to count, for tests that need one alongside the flat
// set.
const TRAILING = 'Enterprise platforms price for large fleets, leaving small ones out';

// Six bullets built to one pattern: subject, verb, object, and nothing hung off
// any of them. This is what the practice runs shipped, and what read as rote.
const FLAT = [
  'Small commercial fleets still coordinate dispatch on homegrown tools',
  'Enterprise telematics platforms price and configure for large fleets',
  'Vehicle locations refresh on a live map every ten seconds',
  'Live tracking and in-vehicle video run in one app',
  "Apply Recur's go-to-market team to the live tracking product",
  'Build AI features on the tracking and video data the product captures',
];

test('six flat thesis bullets are refused as a set, against the slide', () => {
  // Every other rule here is a rule about one field, and no single one of these
  // bullets is at fault: each is fine alone, and the six together read as a
  // form. So the finding names slide 2 and the thesis, not a bullet.
  const findings = under(checkRun(thesisOf(FLAT)), 'sentence-structure');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].slide, 2);
  assert.equal(findings[0].field, 'thesis');
  assert.match(findings[0].message, /0 of the 6/);
});

test("the reference deck's own bullets clear the floor, at three of six", () => {
  // Slide 2 of the reference presentation, as Recur wrote it. It hangs a clause
  // off three bullets - a trailing consequence, a fronted condition and a
  // qualifier - and the rule is measured against exactly that.
  //
  // The fifth bullet asserts a weakness of the target, which the brief forbids.
  // It is here because it is what the reference says, and this test counts
  // sentence shapes rather than judging claims.
  const reference = [
    'Small commercial fleets still coordinate dispatch on low-complexity or homegrown tools',
    'The enterprise telematics platforms price and configure for large fleets, leaving SMBs out',
    'Once installed in every vehicle, it becomes the daily dispatch and accountability layer',
    "Fastest-refresh live tracking and in-vehicle video that commodity trackers can't match",
    "Strengthen US Fleet Tracking's organic product growth with a dedicated outbound motion",
    'Build seachange AI on the tracking and video data USFT already captures each day',
  ];

  assert.deepEqual(under(checkRun(thesisOf(reference)), 'sentence-structure'), []);
});

test('each shape of clause counts: fronted, trailing, or qualifying the main one', () => {
  const shapes = {
    'a fronted condition': 'Once a truck is installed, dispatch runs from one live map',
    'a fronted participle': 'Installed in every vehicle, the tracker becomes the dispatch layer',
    'an irregular participle': 'Built for small fleets, the app sells without a contract',
    'a trailing consequence': 'Enterprise platforms price for large fleets, so small ones buy trackers',
    'a qualifier': 'Live tracking and video that commodity trackers cannot match',
    'a qualifying reason': 'Small fleets switch trackers often because contracts rarely bind them',
  };

  for (const [what, text] of Object.entries(shapes)) {
    // One flat bullet swapped for the shape, alongside one bullet already known
    // to count, so the shape alone decides whether the floor of two is met.
    const texts = [...FLAT];
    texts[1] = TRAILING;
    texts[3] = text;
    assert.deepEqual(
      under(checkRun(thesisOf(texts)), 'sentence-structure'),
      [],
      `${what} was not counted: ${text}`,
    );
  }
});

test('one clause across the six is still refused, and two is enough', () => {
  const one = [...FLAT];
  one[1] = TRAILING;
  const [finding] = under(checkRun(thesisOf(one)), 'sentence-structure');
  assert.match(finding.message, /1 of the 6/);

  const two = [...one];
  two[2] = 'Once installed in every vehicle, the tracker becomes the dispatch layer';
  assert.deepEqual(under(checkRun(thesisOf(two)), 'sentence-structure'), []);
});

test('there is no ceiling on clauses: six of six passes', () => {
  // The reference sits at three, with nothing stopping it going higher. The
  // rule is a floor against flatness, not a target to write to.
  const texts = [
    'Once installed in every vehicle, the tracker becomes the dispatch layer',
    TRAILING,
    'Live tracking and video that commodity trackers cannot match',
    'Because contracts are short, small fleets switch trackers often',
    'Build AI on the tracking data the product captures, turning routes into scores',
    "Apply Recur's go-to-market team where the product already wins",
  ];
  assert.deepEqual(under(checkRun(thesisOf(texts)), 'sentence-structure'), []);
});

test('a list of nouns after a comma is not mistaken for a clause', () => {
  // "tracking, routing and billing" has an -ing word after a comma, which is
  // what a trailing consequence looks like. Counting it would let six flat
  // bullets through on two lists.
  const texts = [...FLAT];
  texts[1] = 'Fleets buy tracking, routing and billing from one vendor';
  texts[3] = 'Dispatchers juggle phones, routing, and paper logs every day';
  const [finding] = under(checkRun(thesisOf(texts)), 'sentence-structure');
  assert.match(finding?.message ?? '', /0 of the 6/);
});

// ---------- the cover's written form ----------

test("a written form that only restyles the company's name passes", () => {
  // The three levers the decision allows, each on its own: closing up the
  // spaces, changing the case, and dropping the punctuation. None of them
  // changes a letter, which is the whole rule.
  for (const writtenForm of ['USFleetTracking', 'us fleet tracking', 'U.S. Fleet Tracking']) {
    const findings = under(checkRun(researchWith({ writtenForm })), 'written-form');
    assert.deepEqual(findings, [], `"${writtenForm}" should pass`);
  }
});

test('a written form that changes the letters is caught', () => {
  // The failure this is here for: the model writes down what the masthead says
  // rather than how it says the name. A tagline, a legal suffix or an initial
  // dropped are all the same mistake, and all of them put a different name on
  // the cover of a deck being mailed to that company's founder.
  for (const writtenForm of [
    'USFleetTracking - Live GPS',
    'USFleetTracking Inc',
    'FleetTracking',
    'USFleet',
  ]) {
    const findings = under(checkRun(researchWith({ writtenForm })), 'written-form');
    assert.equal(findings.length, 1, `"${writtenForm}" should be caught`);
    assert.equal(findings[0].field, 'writtenForm');
    assert.equal(findings[0].slide, 1);
    assert.match(findings[0].message, /same letters/);
  }
});

test('a run with no written form is not a finding', () => {
  // A masthead set as an image with no readable letters in it is a real case,
  // and the decided answer is to leave the field out: the cover then sets the
  // name the run was given. That is an outcome, not a defect.
  //
  // The blank cases are here because two modules have to agree on them: this
  // gate decides a blank form is nothing to report, and the cover's own
  // coverNameFrom decides a blank form leaves the given name in place. A blank
  // that one of them read as a value would put an empty slot on a cover.
  assert.deepEqual(under(checkRun(TEST_RESEARCH), 'written-form'), []);
  for (const writtenForm of ['', '   ']) {
    assert.deepEqual(
      under(checkRun(researchWith({ writtenForm })), 'written-form'),
      [],
      `a written form of ${JSON.stringify(writtenForm)} is absent, not wrong`,
    );
  }
});
