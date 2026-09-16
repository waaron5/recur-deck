// The cover slide: a headquarters landmark under the navy duotone, the Recur
// wordmark, a thin divider, and the target company.
//
// The geometry below is measured off the supplied reference cover, Slide1.png,
// which is 1300 x 731 px on a 10 x 5.625in page, so 130 px per inch. The
// numbers are written here as literals on purpose: asserting against the same
// constants the code places from would only prove the code read its own value.
//
//   Recur wordmark ink  x 2.823-4.638in, cap height y 2.638-3.031 (0.400in)
//   divider             x 4.923-4.931in, y 2.508-3.100 (0.600in tall)
//   company name ink    x 5.323-8.146in, y 2.631-2.985in
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { buildDeck } = require('../skill/src/deck.js');
const { coverPhoto } = require('../skill/src/cover-photo.js');
const { normaliseLogo } = require('../skill/src/logo.js');
const { SLIDE_W, SLIDE_H } = require('../skill/src/design.js');
const { ensureBuilt, tempDir, openPptx, sha256, testPhoto } = require('./helpers.js');

const WORDMARK_RIGHT = 4.638;
const WORDMARK_CAP_HEIGHT = 0.4;
const WORDMARK_CENTRE_Y = 2.835;
const DIVIDER_X = 4.927;
const DIVIDER_TOP = 2.508;
const DIVIDER_HEIGHT = 0.6;
const NAME_LEFT = 5.323;

const CREDIT = {
  fileName: 'Downtown Oklahoma City skyline.jpg',
  artist: 'Urbanative',
  licence: 'CC0',
  descriptionUrl: 'https://commons.wikimedia.org/wiki/File:Downtown_Oklahoma_City_skyline.jpg',
};

const HEADQUARTERS = {
  city: 'Oklahoma City, Oklahoma',
  source: 'https://www.usfleettracking.com/contact-us',
};

/** Build one deck with a cover photo and reopen it. */
async function build(options = {}) {
  const { stageDir } = await ensureBuilt();
  const outDir = tempDir('recur-cover-');
  const photo = options.photo ?? testPhoto();
  const file = await buildDeck({
    company: 'US Fleet Tracking',
    assetsDir: path.join(stageDir, 'assets'),
    outDir,
    headquarters: HEADQUARTERS,
    identification: 'Matched the prompt to usfleettracking.com, a private fleet tracking company.',
    landmark: { photo, credit: CREDIT, width: 480 },
    ...options,
  });
  return { file, photo, stageDir, pptx: await openPptx(file) };
}

/** A real logo, normalised the way a run would normalise it. */
async function testLogo(name) {
  const { stageDir } = await ensureBuilt();
  const bytes = fs.readFileSync(path.join(__dirname, 'fixtures', name));
  return normaliseLogo(bytes, { assetsDir: path.join(stageDir, 'assets') });
}

test("a verified logo stands in for the company's name on the cover", async () => {
  // Samsara's mark is 1198 x 194px and drawn in a single ink, so it stays sharp
  // to 7.99in wide - far past the 2.831in slot - and may be whitened for the
  // dark ground. It is the case US Fleet Tracking's own logo is not.
  const logo = await testLogo('samsara-logo.png');
  const { pptx } = await build({
    company: 'Samsara',
    logo: { ...logo, source: 'https://www.samsara.com/', verified: true },
  });

  const onSlide = (await pptx.textBoxes(1)).map((box) => box.text).join(' ');
  assert.ok(!onSlide.includes('Samsara'), 'the logo replaces the name, it does not join it');

  assert.equal(
    (await pptx.imageHashes(1)).length,
    3,
    'the cover should carry the photo, the Recur wordmark and the logo',
  );

  const notes = await pptx.notesText(1);
  assert.match(String(notes), /samsara\.com/, 'slide 1 should record where the logo came from');
});

test('an unconfirmed logo never reaches the cover', async () => {
  // The model looks at every normalised logo and says whether it is really this
  // company's. In the trial the ranking alone picked another company's mark on
  // 3 of 10 sites, and a product sub-brand on a fourth, so an unconfirmed logo
  // is not placed however good it looks.
  const logo = await testLogo('samsara-logo.png');
  const { pptx } = await build({
    company: 'Samsara',
    logo: { ...logo, source: 'https://www.samsara.com/', verified: false },
  });

  const onSlide = (await pptx.textBoxes(1)).map((box) => box.text).join(' ');
  assert.ok(onSlide.includes('Samsara'), 'the name should fall back to a text wordmark');
  assert.equal((await pptx.imageHashes(1)).length, 2, 'no logo should have been placed');
  assert.match(String(await pptx.notesText(1)), /not confirmed/i);
});

test("US Fleet Tracking's own logo is too coarse for the cover, and the notes say why", async () => {
  // This is the file the company serves for dark backgrounds, so it passes the
  // background rule and fails on resolution alone, which is the case decision 06
  // named. At 258 x 27px it stays sharp only to 1.72in wide, which is 0.180in
  // tall against the 0.269in the wordmark it replaces sets.
  const logo = await testLogo('usft-logo-white.webp');
  const { pptx } = await build({
    company: 'US Fleet Tracking',
    logo: { ...logo, source: 'https://www.usfleettracking.com/', verified: true },
  });

  const onSlide = (await pptx.textBoxes(1)).map((box) => box.text).join(' ');
  assert.ok(onSlide.includes('US Fleet Tracking'), 'the cover sets the name as type instead');
  assert.equal((await pptx.imageHashes(1)).length, 2, 'an upscaled logo is never placed');

  const notes = String(await pptx.notesText(1));
  assert.match(notes, /text wordmark/i);
  assert.match(notes, /stays sharp only to/i, 'the notes should give the resolution reason');
  assert.match(notes, /usfleettracking\.com/, 'and still record where the logo came from');
});

test('the cover is filled by the headquarters landmark photo', async () => {
  const { pptx, photo } = await build();

  const hashes = await pptx.imageHashes(1);
  assert.ok(
    hashes.includes(sha256(coverPhoto(photo))),
    'the cover should carry the treated landmark photo',
  );
  assert.ok(
    !hashes.includes(sha256(photo)),
    'the photo reached the slide untreated, without the duotone',
  );

  const fullBleed = (await pptx.pictureBoxes(1)).find(
    (box) => Math.abs(box.w - SLIDE_W) < 0.02 && Math.abs(box.h - SLIDE_H) < 0.02,
  );
  if (!fullBleed) assert.fail('the photo should fill the slide');
  assert.ok(Math.abs(fullBleed.x) < 0.02 && Math.abs(fullBleed.y) < 0.02);
});

test('the Recur wordmark is placed as the bundled image, never set as type', async () => {
  // It must not depend on a font being installed on the machine that opens it.
  const { pptx, stageDir } = await build();

  const wordmark = sha256(fs.readFileSync(path.join(stageDir, 'assets', 'recur-wordmark-white.png')));
  assert.ok((await pptx.imageHashes(1)).includes(wordmark), 'the white wordmark should be placed');

  const text = (await pptx.textBoxes(1)).map((box) => box.text).join(' ');
  assert.doesNotMatch(text, /RECUR/i, 'the Recur wordmark should be an image, not text');
});

test('the wordmark, divider and company name sit where the reference puts them', async () => {
  const { pptx } = await build();

  const wordmark = (await pptx.pictureBoxes(1)).find((box) => box.w < SLIDE_W / 2);
  if (!wordmark) assert.fail('the cover should carry the Recur wordmark');
  assert.ok(
    Math.abs(wordmark.x + wordmark.w - WORDMARK_RIGHT) < 0.03,
    `wordmark ends at ${(wordmark.x + wordmark.w).toFixed(3)}in, reference ${WORDMARK_RIGHT}in`,
  );
  assert.ok(
    Math.abs(wordmark.h - WORDMARK_CAP_HEIGHT) < 0.03,
    `wordmark cap height ${wordmark.h.toFixed(3)}in, reference ${WORDMARK_CAP_HEIGHT}in`,
  );
  assert.ok(
    Math.abs(wordmark.y + wordmark.h / 2 - WORDMARK_CENTRE_Y) < 0.03,
    `wordmark centred at ${(wordmark.y + wordmark.h / 2).toFixed(3)}in, reference ${WORDMARK_CENTRE_Y}in`,
  );

  const boxes = await pptx.textBoxes(1);
  const divider = boxes.find((box) => box.w < 0.05 && box.h > 0.4);
  if (!divider) assert.fail('the cover should carry the divider between the two marks');
  assert.ok(
    Math.abs(divider.x - DIVIDER_X) < 0.03,
    `divider at ${divider.x.toFixed(3)}in, reference ${DIVIDER_X}in`,
  );
  assert.ok(
    Math.abs(divider.y - DIVIDER_TOP) < 0.03 && Math.abs(divider.h - DIVIDER_HEIGHT) < 0.03,
    `divider runs ${divider.y.toFixed(3)}-${(divider.y + divider.h).toFixed(3)}in, ` +
      `reference ${DIVIDER_TOP}-${DIVIDER_TOP + DIVIDER_HEIGHT}in`,
  );

  const name = boxes.find((box) => box.text.includes('US Fleet Tracking'));
  if (!name) assert.fail('the cover should carry the company name');
  assert.ok(
    Math.abs(name.x - NAME_LEFT) < 0.03,
    `company name starts at ${name.x.toFixed(3)}in, reference ${NAME_LEFT}in`,
  );
});

test("slide 1's notes carry the headquarters city, its source, and the photo credit", async () => {
  const { pptx } = await build();

  const notes = await pptx.notesText(1);
  if (notes === null) assert.fail('slide 1 should carry speaker notes');
  assert.match(notes, /Oklahoma City, Oklahoma/);
  assert.ok(notes.includes(HEADQUARTERS.source), 'the headquarters source should be named');
  assert.ok(notes.includes(CREDIT.fileName), "the photo's file name should be recorded");
  assert.ok(notes.includes(CREDIT.artist), 'the photographer should be credited');
  assert.ok(notes.includes(CREDIT.licence), 'the licence should be recorded');
  assert.match(notes, /usfleettracking\.com/, 'how the company was identified should be recorded');
  // A photo narrower than the cover's 1600px floor can reach the slide through
  // the 1280 retry. Recording the width keeps that visible in the record.
  assert.match(notes, /Photo width: 480px/, "the photo's width should be recorded");
});

test('the company name is set at the size the reference sets it', async () => {
  // Measured off the reference cover: "USFleetTracking" has its caps between
  // y 2.638in and its baseline at y 2.900in, so a cap height of 0.269in. That
  // is smaller than RECUR's 0.400in, which is deliberate in the original.
  //
  // The trap this catches: an estimated average character width silently
  // overrides the measured cap height and halves the name.
  const { pptx } = await build({ company: 'USFleetTracking' });

  const xml = await pptx.slideXml(1);
  const shape = [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)]
    .map((match) => match[0])
    .find((sp) => sp.includes('USFleetTracking'));
  if (!shape) assert.fail('the cover should carry the company name');

  const size = /sz="(\d+)"/.exec(shape);
  if (!size) assert.fail('the company name should set an explicit type size');
  // 0.706 is this typeface's cap height as a fraction of type size, read from
  // the source presentation in ticket 01.
  const capHeight = (Number(size[1]) / 100 / 72) * 0.706;

  assert.ok(
    Math.abs(capHeight - 0.269) < 0.03,
    `name cap height ${capHeight.toFixed(3)}in, reference 0.269in`,
  );
});

test('none of the credit or the source record appears on the slide itself', async () => {
  // It is a mailed sales cover, not an image board.
  const { pptx } = await build();

  const text = (await pptx.textBoxes(1)).map((box) => box.text).join(' ');
  for (const secret of [CREDIT.fileName, CREDIT.artist, CREDIT.licence, HEADQUARTERS.source]) {
    assert.ok(!text.includes(secret), `"${secret}" is visible on the cover`);
  }
  assert.doesNotMatch(text, /commons\.wikimedia\.org/);
});

test('a run with no landmark photo fails instead of shipping a blank cover', async () => {
  const { stageDir } = await ensureBuilt();

  await assert.rejects(
    () =>
      buildDeck({
        company: 'US Fleet Tracking',
        assetsDir: path.join(stageDir, 'assets'),
        outDir: tempDir('recur-cover-'),
        headquarters: HEADQUARTERS,
      }),
    /landmark/i,
  );
});
