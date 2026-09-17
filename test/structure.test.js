// The structural check between building a deck and looking at it: exactly nine
// slides, slides 4-9 in order, notes on slides 1-3, and a file that reopens.
//
// Every rejection case here is made by doctoring a real built deck rather than
// by handing the checker an object. That is the point of the check: it reads the
// bytes that were written, so the only honest way to test it is to write bytes
// that are wrong.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');

const { buildDeck } = require('../skill/src/deck.js');
const { checkStructure, assertStructure, SLIDE_COUNT } = require('../skill/src/structure.js');
const { FIXED_SLIDE_NUMBERS, GENERATED_SLIDE_NUMBERS } = require('../skill/src/design.js');
const {
  ensureBuilt,
  tempDir,
  testPhoto,
  TEST_HEADQUARTERS,
  TEST_CREDIT,
  TEST_THESIS,
  TEST_MARKET_MAP,
} = require('./helpers.js');

/** One real deck, built once, for every case here to start from. */
let deck = null;

async function built() {
  if (!deck) {
    deck = (async () => {
      const { stageDir } = await ensureBuilt();
      const assetsDir = path.join(stageDir, 'assets');
      const file = await buildDeck({
        company: 'US Fleet Tracking',
        assetsDir,
        outDir: tempDir('recur-structure-'),
        headquarters: TEST_HEADQUARTERS,
        identification: 'Matched the prompt to usfleettracking.com.',
        landmark: { photo: testPhoto(), credit: TEST_CREDIT },
        thesis: TEST_THESIS,
        marketMap: TEST_MARKET_MAP,
      });
      return { file, assetsDir };
    })();
  }
  return deck;
}

/**
 * A copy of the built deck with something wrong with it, written to disk.
 *
 * @param {string} name
 * @param {(zip: JSZip) => Promise<void> | void} damage
 * @returns {Promise<string>}
 */
async function brokenDeck(name, damage) {
  const { file } = await built();
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  await damage(zip);

  const broken = path.join(tempDir('recur-broken-'), `${name}.pptx`);
  fs.writeFileSync(broken, await zip.generateAsync({ type: 'nodebuffer' }));
  return broken;
}

/** What the check says about a deck with something wrong with it. */
async function doctored(name, damage) {
  const { assetsDir } = await built();
  return checkStructure(await brokenDeck(name, damage), { assetsDir });
}

/** Findings under one rule. */
const under = (findings, rule) => findings.filter((problem) => problem.rule === rule);

/**
 * One part of the built package, failed loudly when it is not there: a fixture
 * that has quietly stopped containing what a case doctors would make that case
 * pass for the wrong reason.
 *
 * @param {JSZip} zip
 * @param {string} name
 */
function part(zip, name) {
  const entry = zip.file(name);
  if (!entry) assert.fail(`the built deck should carry ${name}`);
  return entry;
}

test('a deck as the generator writes it passes the structural check', async () => {
  // The false-positive guard. This check runs on every build, so a rule that
  // fired here would fail every run the workflow ever makes.
  const { file, assetsDir } = await built();
  assert.deepEqual(await checkStructure(file, { assetsDir }), []);
});

test('a deck short of a slide is caught, and says how many it has', async () => {
  const findings = await doctored('missing-slide', (zip) => {
    zip.remove(`ppt/slides/slide${SLIDE_COUNT}.xml`);
  });

  const counted = under(findings, 'slide-count');
  assert.equal(counted.length, 1, 'the count should be reported once');
  assert.match(counted[0].message, new RegExp(`${SLIDE_COUNT - 1} slides`));
  assert.match(counted[0].message, new RegExp(`exactly ${SLIDE_COUNT}`));
});

test('slides 4-9 out of order are caught, because their pictures are compared', async () => {
  // Two reference slides swapped leave nine slides that each carry a picture.
  // Only the bytes tell them apart, which is why the check hashes them against
  // the PNGs the skill ships.
  const [first, second] = FIXED_SLIDE_NUMBERS;
  const findings = await doctored('swapped', async (zip) => {
    const relsOf = (n) => `ppt/slides/_rels/slide${n}.xml.rels`;
    const a = await part(zip, relsOf(first)).async('string');
    const b = await part(zip, relsOf(second)).async('string');
    zip.file(relsOf(first), b);
    zip.file(relsOf(second), a);
  });

  const outOfOrder = under(findings, 'fixed-slide');
  assert.deepEqual(
    outOfOrder.map((problem) => problem.slide),
    [first, second],
    'both swapped slides should be named',
  );
  assert.match(outOfOrder[0].message, /order/i);
});

test('a reference slide carrying no picture at all is caught', async () => {
  const [first] = FIXED_SLIDE_NUMBERS;
  const findings = await doctored('no-picture', (zip) => {
    zip.file(`ppt/slides/_rels/slide${first}.xml.rels`, '<Relationships/>');
  });

  const problems = under(findings, 'fixed-slide');
  assert.equal(problems.length, 1);
  assert.equal(problems[0].slide, first);
  assert.match(problems[0].message, /no image/i);
});

test('slides 1-3 without their speaker notes are caught, one finding each', async () => {
  // The notes are the run's source record. A deck whose evidence did not
  // survive the write is one nobody can check the claims on.
  const findings = await doctored('no-notes', (zip) => {
    for (const name of Object.keys(zip.files)) {
      if (/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name)) zip.remove(name);
    }
  });

  const missing = under(findings, 'notes');
  assert.deepEqual(
    missing.map((problem) => problem.slide),
    GENERATED_SLIDE_NUMBERS,
  );
  assert.match(missing[0].message, /source record/i);
});

test('an empty notes field counts as no notes', async () => {
  // A notes part that exists but says nothing is the same hole as one that is
  // absent, and the slide-number placeholder inside it must not read as text.
  const findings = await doctored('empty-notes', async (zip) => {
    for (const name of Object.keys(zip.files)) {
      if (!/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name)) continue;
      const xml = await part(zip, name).async('string');
      zip.file(name, xml.replace(/<a:t>[^<]*<\/a:t>/g, '<a:t></a:t>'));
    }
  });

  assert.equal(under(findings, 'notes').length, GENERATED_SLIDE_NUMBERS.length);
});

test('a file that does not reopen is reported as the file, not as a slide', async () => {
  const { assetsDir } = await built();
  const broken = path.join(tempDir('recur-corrupt-'), 'not-a-deck.pptx');
  fs.writeFileSync(broken, Buffer.from('this is not a PowerPoint package'));

  const findings = await checkStructure(broken, { assetsDir });
  assert.equal(findings.length, 1, 'nothing else can be checked, so nothing else is reported');
  assert.equal(findings[0].rule, 'unopenable');
  assert.equal(findings[0].slide, 0, 'a file that will not open has no slide to blame');
});

test('a zip that opens but is not a presentation is caught', async () => {
  const { assetsDir } = await built();
  const zip = new JSZip();
  zip.file('hello.txt', 'not a deck');
  const file = path.join(tempDir('recur-notdeck-'), 'plain.pptx');
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));

  const findings = await checkStructure(file, { assetsDir });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /presentation/i);
});

test('a slide part that did not come out whole is caught', async () => {
  // The container opening says nothing about the slides inside it: a part
  // truncated on write still unzips. This is the half of "reopens cleanly" that
  // a digest of the fixed slides cannot see.
  const { assetsDir } = await built();
  const broken = await brokenDeck('truncated', async (zip) => {
    const xml = await part(zip, 'ppt/slides/slide2.xml').async('string');
    zip.file('ppt/slides/slide2.xml', xml.slice(0, Math.floor(xml.length / 2)));
  });

  const problems = under(await checkStructure(broken, { assetsDir }), 'unopenable');
  assert.equal(problems.length, 1);
  assert.equal(problems[0].slide, 2);
  assert.match(problems[0].message, /whole/i);
});

test('a deck that fails the check fails the build, naming every defect', async () => {
  // The other half of "structural checks fail the build". buildDeck calls
  // assertStructure and nothing else: a check whose defects were collected and
  // then not raised would let a broken deck through to a founder.
  const { assetsDir, file } = await built();
  const broken = await brokenDeck('rejected', (zip) => {
    zip.remove(`ppt/slides/slide${SLIDE_COUNT}.xml`);
  });

  await assert.rejects(
    () => assertStructure(broken, { assetsDir }),
    (error) => {
      const { message } = /** @type {Error} */ (error);
      assert.match(message, /structural check/);
      assert.match(message, new RegExp(`${SLIDE_COUNT - 1} slides`));
      assert.match(message, /slide 9|the file/, 'a defect should say what it is about');
      return true;
    },
  );

  // And the deck the generator actually writes passes it, so the build is not
  // failing every run.
  await assertStructure(file, { assetsDir });
});

test('every defect reads as something a person can act on', async () => {
  // Ticket 08 lists surviving defects by slide in the reply, so each message has
  // to stand on its own line without the code around it.
  const findings = await doctored('all-wrong', (zip) => {
    zip.remove(`ppt/slides/slide${SLIDE_COUNT}.xml`);
  });

  assert.ok(findings.length > 0);
  for (const problem of findings) {
    assert.equal(typeof problem.message, 'string');
    assert.ok(problem.message.length > 0, 'a finding with no message says nothing');
    assert.ok(Number.isInteger(problem.slide));
    assert.ok(problem.rule, 'every finding names the rule it broke');
  }
});
