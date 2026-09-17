// The market map as it reaches a founder: two labelled axes on a tinted band,
// the companies placed freely between them, and the callout in a navy sidebar.
//
// The geometry below is written as literals rather than imported from
// design.js, because a test that reads the same constant the code places from
// only proves the code read its own value. The frame is measured off the
// supplied reference Slide3.png (1300 x 731px on a 10 x 5.625in page, so 130px
// per inch); the chart block is the ticket 10 prototype scaled by 0.75, its
// 13.333in canvas expressed in this deck's 10in page.
//
//   tinted band     from y 1.7231in to the foot of the slide
//   callout sidebar from x 7.0875in, full height
//   axes            upright at x 1.7625in, baseline at y 4.7077in
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildDeck } = require('../skill/src/deck.js');
const { normaliseLogo } = require('../skill/src/logo.js');
const { SLIDE_H } = require('../skill/src/design.js');
const {
  ensureBuilt,
  tempDir,
  openPptx,
  testPhoto,
  TEST_HEADQUARTERS,
  TEST_CREDIT,
  TEST_THESIS,
  TEST_MARKET_MAP,
} = require('./helpers.js');

const BAND_TOP = 1.7231;
const SIDEBAR_X = 7.0875;
const AXIS_X = 1.7625;
const AXIS_BOTTOM = 4.7077;

// The map's logo slot: an equal optical area rather than a uniform box.
const SLOT_AREA = 0.1406;

/** Build one deck and reopen it, so every assertion reads the written file. */
async function build(options = {}) {
  const { stageDir } = await ensureBuilt();
  const outDir = tempDir('recur-map-');
  const file = await buildDeck({
    company: 'US Fleet Tracking',
    assetsDir: path.join(stageDir, 'assets'),
    outDir,
    headquarters: TEST_HEADQUARTERS,
    identification: 'Matched the prompt to usfleettracking.com.',
    landmark: { photo: testPhoto(), credit: TEST_CREDIT },
    thesis: TEST_THESIS,
    marketMap: TEST_MARKET_MAP,
    ...options,
  });
  return { file, pptx: await openPptx(file) };
}

/** Text as a reader sees it, with the XML escaping undone. */
const plain = (text) => text.replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&');

/** Slide 3's text boxes, read the way someone opening the deck would read them. */
async function mapBoxes(pptx) {
  return (await pptx.textBoxes(3)).map((box) => ({ ...box, text: plain(box.text) }));
}

test('the map carries its subtitle, both axis names, and all four categories', async () => {
  const { pptx } = await build();
  const boxes = await mapBoxes(pptx);
  const all = boxes.map((box) => box.text).join(' | ');

  assert.ok(all.includes(TEST_MARKET_MAP.subtitle), 'the subtitle says how the market divides');

  // The axis names are set in capitals, which is the decided treatment.
  for (const axis of [TEST_MARKET_MAP.axes.x, TEST_MARKET_MAP.axes.y]) {
    assert.ok(all.includes(axis.name.toUpperCase()), `the map should name the ${axis.name} axis`);
    for (const side of [axis.low, axis.high]) {
      assert.ok(all.includes(side), `the map should label the "${side}" side`);
    }
  }
});

test('every company the run placed reaches the slide', async () => {
  // None of the test map's companies carries a logo, so each falls back to a
  // text wordmark - which is a designed outcome, and never an empty slot.
  const { pptx } = await build();
  const boxes = await mapBoxes(pptx);

  for (const company of TEST_MARKET_MAP.companies) {
    assert.ok(
      boxes.some((box) => box.text === company.name),
      `the map should carry ${company.name}`,
    );
  }
});

test('the target is marked by a white pill with a thin teal outline, and nothing else', async () => {
  const { pptx } = await build();
  const xml = await pptx.slideXml(3);

  const teal = [...xml.matchAll(/009384/g)].length;
  assert.equal(teal, 1, 'exactly one company should be outlined in teal');
  assert.ok(xml.includes('roundRect'), 'the target sits behind a rounded pill');

  // No second signal: the target is not also relabelled or tinted.
  const boxes = await mapBoxes(pptx);
  const labels = boxes.filter((box) => box.text.toLowerCase().includes('target'));
  assert.deepEqual(labels, [], 'the target carries no label of its own');
});

test('the callout reads "Our take", two dynamics bullets, then the proposal', async () => {
  const { pptx } = await build();
  const xml = await pptx.slideXml(3);
  const boxes = await mapBoxes(pptx);

  const callout = boxes.find((box) => box.text.includes('Our take'));
  if (!callout) assert.fail('slide 3 should carry the callout');
  assert.ok(callout.x >= SIDEBAR_X, 'the callout sits inside the navy sidebar');

  assert.ok(callout.text.includes(TEST_MARKET_MAP.callout.take), 'it says where the target wins');
  for (const dynamic of TEST_MARKET_MAP.callout.dynamics) {
    assert.ok(callout.text.includes(dynamic), `it carries the dynamic "${dynamic}"`);
  }
  assert.ok(callout.text.includes(TEST_MARKET_MAP.callout.proposal), 'and the proposal');

  // The proposal bullet is the underlined one, tying back to how Recur helps.
  assert.match(xml, /u="sng"/, 'the proposal bullet should be underlined');
});

test('the band, the sidebar and the axes sit where the reference puts them', async () => {
  const { pptx } = await build();
  const boxes = await pptx.textBoxes(3);

  const band = boxes.find(
    (box) => Math.abs(box.x) < 0.01 && Math.abs(box.y - BAND_TOP) < 0.02 && box.w > 5,
  );
  if (!band) assert.fail(`the tinted band should start at y ${BAND_TOP}in`);
  assert.ok(
    Math.abs(band.y + band.h - SLIDE_H) < 0.02,
    'the band should run to the foot of the slide',
  );

  const sidebar = boxes.find(
    (box) => Math.abs(box.x - SIDEBAR_X) < 0.02 && Math.abs(box.h - SLIDE_H) < 0.02,
  );
  if (!sidebar) assert.fail(`the callout sidebar should be full height from x ${SIDEBAR_X}in`);

  // The L: an upright and a baseline, and no quadrant dividers between them.
  const lines = boxes.filter((box) => box.w < 0.01 || box.h < 0.01);
  const upright = lines.filter((box) => box.w < 0.01);
  const baseline = lines.filter((box) => box.h < 0.01);
  assert.equal(upright.length, 1, 'one upright, and no vertical quadrant divider');
  assert.equal(baseline.length, 1, 'one baseline, and no horizontal quadrant divider');
  assert.ok(Math.abs(upright[0].x - AXIS_X) < 0.02, `the upright stands at x ${AXIS_X}in`);
  assert.ok(Math.abs(baseline[0].y - AXIS_BOTTOM) < 0.02, `the baseline sits at y ${AXIS_BOTTOM}in`);
  assert.ok(
    baseline[0].x + baseline[0].w <= SIDEBAR_X,
    'and the baseline stops before the sidebar',
  );
});

test("slide 3's type sizes are the fixed design values", async () => {
  // Decision 10's sizes, expressed on this deck's 10in page: overflow is
  // repaired by shortening copy, never by shrinking type, so these are read off
  // the built slide rather than compared between two literals.
  const { pptx } = await build();
  const sizes = [...(await pptx.slideXml(3)).matchAll(/sz="(\d+)"/g)].map((m) => Number(m[1]) / 100);
  const has = (points) => sizes.some((size) => Math.abs(size - points) < 0.01);

  assert.ok(has(20), 'the title at 20pt');
  assert.ok(has(9.75), 'the subtitle at 9.75pt');
  assert.ok(has(7.875), 'the axis categories at 7.875pt');
  assert.ok(has(6), 'the axis names at 6pt');
  assert.ok(has(8.625), 'the callout at 8.625pt');
});

test('a competitor logo is placed at the map\'s equal optical area', async () => {
  // Samsara's mark is 1198 x 194px, so nothing caps it: the area rule alone
  // decides its size, and a wide wordmark and a square mark come out carrying
  // the same visual weight.
  const { stageDir } = await ensureBuilt();
  const bytes = fs.readFileSync(path.join(__dirname, 'fixtures', 'samsara-logo.png'));
  const logo = await normaliseLogo(bytes, { assetsDir: path.join(stageDir, 'assets') });

  const withLogo = {
    ...TEST_MARKET_MAP,
    companies: TEST_MARKET_MAP.companies.map((company) =>
      company.name === 'Samsara'
        ? { ...company, logo: { ...logo, source: 'https://www.samsara.com/', verified: true } }
        : company,
    ),
  };

  const { pptx } = await build({ marketMap: withLogo });

  const pictures = await pptx.pictureBoxes(3);
  assert.equal(pictures.length, 1, 'the one company with a logo should place it');
  assert.ok(
    Math.abs(pictures[0].w * pictures[0].h - SLOT_AREA) < 0.005,
    `the logo covers ${(pictures[0].w * pictures[0].h).toFixed(4)} sq in, expected ${SLOT_AREA}`,
  );

  const boxes = await mapBoxes(pptx);
  assert.ok(
    !boxes.some((box) => box.text === 'Samsara'),
    'the logo replaces the wordmark, it does not join it',
  );
});

test("slide 3's notes carry the evidence, the placements and the axis reasoning", async () => {
  const { pptx } = await build();
  const written = await pptx.notesText(3);
  if (!written) assert.fail('slide 3 should carry speaker notes');
  const notes = plain(written);

  for (const company of TEST_MARKET_MAP.companies) {
    assert.ok(notes.includes(company.evidence), `the notes should evidence ${company.name}`);
    assert.ok(notes.includes(company.placement), `and reason where ${company.name} sits`);
  }
  for (const axis of [TEST_MARKET_MAP.axes.x, TEST_MARKET_MAP.axes.y]) {
    assert.ok(notes.includes(axis.reasoning), `the notes should reason the ${axis.name} axis`);
  }
});

test('none of the source record appears on the slide itself', async () => {
  // It is a mailed sales piece, not a working paper.
  const { pptx } = await build();
  const visible = (await mapBoxes(pptx)).map((box) => box.text).join(' ');

  for (const company of TEST_MARKET_MAP.companies) {
    assert.ok(!visible.includes(company.evidence), `${company.name}'s source URL is on the slide`);
    assert.ok(!visible.includes(company.placement), `${company.name}'s reasoning is on the slide`);
  }
});

test('a run with no market map is refused rather than delivering an empty slide 3', async () => {
  // An empty market map is a missing required element, which is a critical
  // defect. Failing here is what lets ticket 08 decide what the run does next.
  await assert.rejects(() => build({ marketMap: undefined }), /market map/i);
});

test('a map whose competitors crowd one quadrant is refused, not quietly redrawn', async () => {
  // Crowding is capped in the brief rather than absorbed by the render budget,
  // so a bad distribution is repaired with text and never with pixels.
  const crowded = {
    ...TEST_MARKET_MAP,
    companies: TEST_MARKET_MAP.companies.map((company) =>
      ['Samsara', 'Verizon Connect', 'Geotab', 'Teletrac Navman'].includes(company.name)
        ? { ...company, x: 0.1, y: 0.8 }
        : company,
    ),
  };
  await assert.rejects(() => build({ marketMap: crowded }), /quadrant/i);
});
