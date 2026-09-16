// The deck the workflow hands to a founder: nine slides, the six supplied
// reference PNGs full-bleed in order, and a notes field on slides 1-3 that
// later tickets fill with the source record.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildDeck } = require('../skill/src/deck.js');
const {
  FIXED_SLIDE_NUMBERS,
  SLIDE_W,
  SLIDE_H,
  MIN_FONT_SIZE,
  CONFIDENTIAL_LINE,
} = require('../skill/src/design.js');
const {
  ensureBuilt,
  tempDir,
  openPptx,
  sha256,
  testPhoto,
  TEST_HEADQUARTERS,
  TEST_CREDIT,
} = require('./helpers.js');

const REFERENCE_DIR = path.join(__dirname, '..', 'Recur x US Fleet Tracking_vS');

/** Build one deck and reopen it, so every assertion reads the written file. */
async function build(options = {}) {
  const { stageDir } = await ensureBuilt();
  const outDir = tempDir('recur-deck-');
  const file = await buildDeck({
    company: 'US Fleet Tracking',
    assetsDir: path.join(stageDir, 'assets'),
    outDir,
    headquarters: TEST_HEADQUARTERS,
    identification: 'Matched the prompt to usfleettracking.com.',
    landmark: { photo: testPhoto(), credit: TEST_CREDIT },
    ...options,
  });
  return { file, pptx: await openPptx(file) };
}

test('the deck has exactly nine slides', async () => {
  const { pptx } = await build();
  assert.equal(pptx.slideCount, 9);
});

test('the file is named for the company, as the reply template promises', async () => {
  const { file } = await build({ company: 'US Fleet Tracking' });
  assert.equal(path.basename(file), 'Recur x US Fleet Tracking.pptx');
});

test('the page is widescreen, matching the supplied reference slides', async () => {
  const { pptx } = await build();
  const { w, h } = await pptx.pageSizeInches();
  assert.ok(Math.abs(w - SLIDE_W) < 0.01, `width ${w} should be ${SLIDE_W}`);
  assert.ok(Math.abs(h - SLIDE_H) < 0.01, `height ${h} should be ${SLIDE_H}`);
});

test('slides 4-9 are the six supplied reference PNGs, in order', async () => {
  const { pptx } = await build();
  for (const [offset, slideNumber] of FIXED_SLIDE_NUMBERS.entries()) {
    const expected = sha256(
      fs.readFileSync(path.join(REFERENCE_DIR, `Slide${slideNumber}.png`)),
    );
    assert.deepEqual(
      await pptx.imageHashes(slideNumber),
      [expected],
      `slide ${slideNumber} should carry Slide${slideNumber}.png (position ${offset})`,
    );
  }
});

test('the reference slides are placed full-bleed', async () => {
  const { pptx } = await build();
  for (const slideNumber of FIXED_SLIDE_NUMBERS) {
    const [box, ...extra] = await pptx.pictureBoxes(slideNumber);
    assert.equal(extra.length, 0, `slide ${slideNumber} should hold one picture`);
    assert.ok(Math.abs(box.x) < 0.01 && Math.abs(box.y) < 0.01);
    assert.ok(Math.abs(box.w - SLIDE_W) < 0.01 && Math.abs(box.h - SLIDE_H) < 0.01);
  }
});

test('the confidentiality line sits where the reference slides put it', async () => {
  // Measured off the reference PNGs: the line's ink runs y 5.495-5.556in,
  // centred on the slide. It previously sat too high, which read as misaligned
  // against the reused slides 4-9.
  const { pptx } = await build();
  const line = (await pptx.textBoxes(2)).find((b) => b.text === CONFIDENTIAL_LINE);
  if (!line) assert.fail('slide 2 should carry the confidentiality line');

  const centre = line.y + line.h / 2;
  assert.ok(
    Math.abs(centre - 5.532) < 0.05,
    `line centred at ${centre.toFixed(3)}in, expected about 5.532in`,
  );
  assert.ok(
    Math.abs(line.x + line.w / 2 - SLIDE_W / 2) < 0.05,
    'the line should be centred across the slide',
  );
});

test('the market map carries no footer, matching the reference', async () => {
  const { pptx } = await build();
  const boxes = await pptx.textBoxes(3);
  assert.ok(
    !boxes.some((b) => b.text.includes(CONFIDENTIAL_LINE)),
    'reference slide 3 carries no confidentiality line',
  );
  assert.deepEqual(await pptx.imageHashes(3), [], 'and no Recur wordmark');
});

test('slides 1-3 carry a notes field that later tickets can write into', async () => {
  const sourceRecord = {
    1: 'Identified from usfleettracking.com; HQ Oklahoma City.',
    2: 'Each thesis bullet with its source.',
    3: 'Axis reasoning and competitor evidence.',
  };
  const { pptx } = await build({ notes: sourceRecord });
  for (const slideNumber of [1, 2, 3]) {
    assert.equal(await pptx.notesText(slideNumber), sourceRecord[slideNumber]);
  }
});

test('the cover writes its own source record, and the rest wait for their tickets', async () => {
  const { pptx } = await build();

  const cover = await pptx.notesText(1);
  if (cover === null) assert.fail('slide 1 should carry speaker notes');
  assert.match(cover, /Headquarters: Oklahoma City/);
  for (const slideNumber of [2, 3]) {
    assert.equal(await pptx.notesText(slideNumber), '');
  }
});

test('the cover sets the company name as a text wordmark', async () => {
  const { pptx } = await build({ company: 'Pool Office Manager' });
  assert.ok((await pptx.slideXml(1)).includes('Pool Office Manager'));
});

test('a long company name wraps rather than shrinking below the type floor', async () => {
  // The visual bar puts native text no smaller than about 12pt, and overflow is
  // repaired by shortening copy, never by shrinking type.
  const longName = 'International Fleet Telematics and Logistics Corporation';
  const { pptx } = await build({ company: longName });
  const xml = await pptx.slideXml(1);

  assert.ok(xml.includes(longName), 'the cover should still carry the full name');
  const sizes = [...xml.matchAll(/sz="(\d+)"/g)].map((m) => Number(m[1]) / 100);
  assert.ok(sizes.length > 0, 'the cover should set an explicit type size');
  assert.ok(
    Math.min(...sizes) >= MIN_FONT_SIZE,
    `type dropped to ${Math.min(...sizes)}pt, below the ${MIN_FONT_SIZE}pt floor`,
  );
});

test('a company name that would break a file name is cleaned up', async () => {
  const { file } = await build({ company: 'Acme / Beta: Co' });
  assert.equal(path.basename(file), 'Recur x Acme Beta Co.pptx');
});
