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

test('a header over twelve words and a bullet over fourteen are both caught, by field', () => {
  // The limits are decision 05's: headers within 12 words, bullets within 14.
  // A founder reads a header as a claim and a bullet as its support, and both
  // stop working at the length where they need re-reading.
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
  assert.match(findings[0].message, /14 words/);
});

test('a banned word is caught and named, so the repair knows what to replace', () => {
  // The banned list is decision 05's, and it exists because these words are
  // what an AI writes when it is filling space. A founder who reads one stops
  // believing a human wrote the page.
  const research = researchWith({
    thesis: {
      here: {
        header: 'Commercial fleets are mid-cycle in adopting telematics',
        bullets: [
          {
            text: 'Small fleets leverage homegrown tools to coordinate dispatch',
            sources: ['https://www.fleetowner.com/technology/telematics'],
          },
          TEST_RESEARCH.thesis.here.bullets[1],
        ],
      },
    },
  });

  const findings = under(checkRun(research), 'banned-word');
  assert.deepEqual(fieldsIn(findings), ['thesis.here.bullets.0']);
  assert.match(findings[0].message, /leverage/i);
});

test('the banned list reaches the market map, not just the thesis', () => {
  // Every line on slide 3 is written by the same run, under the same rules.
  const research = researchWith({
    marketMap: {
      callout: {
        take: 'US Fleet Tracking delivers a seamless experience for small fleets',
        dynamics: TEST_RESEARCH.marketMap.callout.dynamics,
        proposal: TEST_RESEARCH.marketMap.callout.proposal,
      },
    },
  });

  const findings = under(checkRun(research), 'banned-word');
  assert.deepEqual(fieldsIn(findings), ['marketMap.callout.take']);
  assert.equal(findings[0].slide, 3);
});

test('a banned word is caught in the forms a writer actually uses it in', () => {
  // "Unlocking" is the same word as "unlock", and banning only the bare stem
  // would let every one of these through.
  for (const text of [
    'Recur can unlock new revenue for the live tracking product',
    'Recur can build seamlessly on the tracking data the product captures',
    'Recur can apply its go-to-market team to empower the sales motion',
  ]) {
    const research = researchWith({
      thesis: {
        help: {
          header: TEST_RESEARCH.thesis.help.header,
          bullets: [
            { text, sources: ['Recur introduction, slide 5'] },
            TEST_RESEARCH.thesis.help.bullets[1],
          ],
        },
      },
    });
    assert.equal(under(checkRun(research), 'banned-word').length, 1, `missed: ${text}`);
  }
});

test('the AI-sounding patterns are caught as well as the words', () => {
  const patterns = {
    'Recur can build AI on the tracking data, not just the video but the routes':
      'not just X but Y',
    "In today's fleet landscape small operators still coordinate on paper":
      "in today's ... landscape",
  };

  for (const [text, what] of Object.entries(patterns)) {
    const research = researchWith({
      thesis: {
        excited: {
          header: TEST_RESEARCH.thesis.excited.header,
          bullets: [
            { text, sources: ['https://www.usfleettracking.com/'] },
            TEST_RESEARCH.thesis.excited.bullets[1],
          ],
        },
      },
    });
    assert.equal(under(checkRun(research), 'banned-pattern').length, 1, `missed ${what}: ${text}`);
  }
});

test('the strengths a help bullet draws from are not mistaken for a triad', () => {
  // Decision 05 tells both help bullets to draw from Recur's go-to-market,
  // product, payments and AI strengths. Every deterministic test for "a triad
  // of adjectives" fired on exactly that list, so the triad is left to the
  // model's judgment pass: spending a repair round on the copy the brief asks
  // for is worse than missing a triad the tone check can still catch.
  const research = researchWith({
    thesis: {
      help: {
        bullets: [
          {
            text: 'Recur brings go-to-market, product, payments and AI to the company',
            sources: ['Recur introduction, slide 5'],
          },
          TEST_RESEARCH.thesis.help.bullets[1],
        ],
      },
    },
  });

  assert.deepEqual(under(checkRun(research), 'banned-pattern'), []);
});

test('forbidden punctuation is caught, and the hyphens the copy needs are not', () => {
  // Semicolons, dashes, parentheses, exclamation marks and rhetorical questions
  // are out. Hyphens are not: "go-to-market", "real-time" and "no-contract" are
  // how the company's own material words these, and the controlled vocabulary
  // says to use the company's words.
  const banned = [
    'Live tracking refreshes every ten seconds; the map never goes stale',
    'Live tracking and video run in one app (with no extra hardware)',
    'Small fleets want tracking without a contract - not a platform',
    'Why do small fleets still coordinate dispatch on paper?',
    'Live tracking refreshes every ten seconds!',
  ];

  for (const text of banned) {
    const research = researchWith({
      thesis: {
        excited: {
          header: TEST_RESEARCH.thesis.excited.header,
          bullets: [
            { text, sources: ['https://www.usfleettracking.com/'] },
            TEST_RESEARCH.thesis.excited.bullets[1],
          ],
        },
      },
    });
    assert.ok(under(checkRun(research), 'punctuation').length >= 1, `missed: ${text}`);
  }

  // The clean fixture is full of hyphenated compounds and possessives, and must
  // stay clean.
  assert.deepEqual(under(checkRun(TEST_RESEARCH), 'punctuation'), []);
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
        // the fit allowance.
        header: 'Commercial fleets are truly mid-cycle in adopting telematics',
        bullets: [
          {
            text: 'Small commercial fleets leverage homegrown tools; dispatch stays manual',
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
    ['banned-word', 'punctuation'],
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
  // Fourteen words, so the word count is satisfied and only the fit rule can
  // catch this. Long words fill a column that short ones would not.
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
