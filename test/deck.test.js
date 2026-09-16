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
  THESIS_GEOMETRY,
} = require('../skill/src/design.js');
const {
  ensureBuilt,
  tempDir,
  openPptx,
  sha256,
  testPhoto,
  TEST_HEADQUARTERS,
  TEST_CREDIT,
  TEST_THESIS,
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
    thesis: TEST_THESIS,
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

test('the cover writes its own source record, and the market map waits for its ticket', async () => {
  const { pptx } = await build();

  const cover = await pptx.notesText(1);
  if (cover === null) assert.fail('slide 1 should carry speaker notes');
  assert.match(cover, /Headquarters: Oklahoma City/);
  assert.equal(await pptx.notesText(3), '');
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

// ---------- slide 2: the thesis ----------

// Measured off the reference Slide2.png (1300 x 731px at 130 px/in), and
// written out as literals rather than recomputed from the design constants, so
// these assertions can disagree with the code rather than follow it.
const THESIS_ROWS = [
  { key: 'here', label: "Why we're here", circleTop: 1.5, header: 1.627, bullets: [1.877, 2.108] },
  {
    key: 'excited',
    label: "Why we're excited",
    circleTop: 2.531,
    header: 2.658,
    bullets: [2.908, 3.139],
  },
  {
    key: 'help',
    label: 'How we can help',
    circleTop: 3.562,
    header: 3.689,
    bullets: [3.939, 4.17],
  },
];

/** Text as a reader sees it, with the XML escaping undone. */
const plain = (text) => text.replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&');

/** Slide 2's text boxes, read the way someone opening the deck would read them. */
async function thesisBoxes(pptx) {
  return (await pptx.textBoxes(2)).map((box) => ({ ...box, text: plain(box.text) }));
}

/** The box carrying one section's label and header, failed loudly when absent. */
function findHeader(boxes, label) {
  const header = boxes.find((box) => box.text.startsWith(`${label}:`));
  if (!header) assert.fail(`slide 2 should carry the "${label}" header`);
  return header;
}

test('slide 2 shows the three sections, each with a header and exactly two bullets', async () => {
  const { pptx } = await build();
  const boxes = await thesisBoxes(pptx);

  for (const row of THESIS_ROWS) {
    const header = findHeader(boxes, row.label);
    assert.ok(
      header.text.includes(TEST_THESIS[row.key].header),
      `the "${row.label}" header should carry the copy the run wrote`,
    );
  }

  const written = THESIS_ROWS.flatMap((row) =>
    TEST_THESIS[row.key].bullets.map((bullet) => bullet.text),
  );
  for (const bullet of written) {
    assert.ok(boxes.some((box) => box.text === bullet), `slide 2 should carry "${bullet}"`);
  }
  assert.equal(
    boxes.filter((box) => written.includes(box.text)).length,
    6,
    'six bullets, two to a section',
  );
});

test('the section rows sit where the reference puts them', async () => {
  const { pptx } = await build();
  const boxes = await thesisBoxes(pptx);

  for (const row of THESIS_ROWS) {
    const header = findHeader(boxes, row.label);

    const centre = header.y + header.h / 2;
    assert.ok(
      Math.abs(centre - row.header) < 0.02,
      `"${row.label}" centred at ${centre.toFixed(3)}in, expected about ${row.header}in`,
    );
    assert.ok(Math.abs(header.x - 1.4) < 0.01, 'headers start at the reference left edge');
  }
});

test('each bullet sits on its own measured line', async () => {
  const { pptx } = await build();
  const boxes = await thesisBoxes(pptx);

  for (const row of THESIS_ROWS) {
    TEST_THESIS[row.key].bullets.forEach((bullet, i) => {
      const box = boxes.find((b) => b.text === bullet.text);
      if (!box) assert.fail(`slide 2 should carry "${bullet.text}"`);
      const centre = box.y + box.h / 2;
      assert.ok(
        Math.abs(centre - row.bullets[i]) < 0.02,
        `bullet ${i + 1} of "${row.label}" centred at ${centre.toFixed(3)}in, ` +
          `expected about ${row.bullets[i]}in`,
      );
    });
  }
});

test('the numbered circles carry their numerals where the reference puts them', async () => {
  const { pptx } = await build();
  const boxes = await pptx.textBoxes(2);

  THESIS_ROWS.forEach((row, i) => {
    // Filtered by position as well as text, because the footer's page number on
    // slide 2 is also the character "2".
    const numeral = boxes.find((box) => box.text === String(i + 1) && box.x < 1.2);
    if (!numeral) assert.fail(`slide 2 should carry the numeral ${i + 1}`);

    assert.ok(Math.abs(numeral.x - 0.6) < 0.01, 'the circle sits at the reference left edge');
    assert.ok(Math.abs(numeral.w - 0.465) < 0.01, 'and carries the reference diameter');
    assert.ok(
      Math.abs(numeral.y - row.circleTop) < 0.02,
      `circle ${i + 1} at ${numeral.y.toFixed(3)}in, expected about ${row.circleTop}in`,
    );
  });
});

test("slide 2's type sizes come from the reference's measured cap heights", async () => {
  // Headers measure 0.146in of cap, bullets 0.115in, numerals 0.246in, which
  // through the typeface's cap height are 15, 11.5 and 25pt. The prototype set
  // all three smaller; the reference is what the deck matches.
  const { pptx } = await build();
  const sizes = new Set(
    [...(await pptx.slideXml(2)).matchAll(/sz="(\d+)"/g)].map((m) => Number(m[1])),
  );

  assert.ok(sizes.has(1500), 'section headers at 15pt');
  assert.ok(sizes.has(1150), 'bullets at 11.5pt');
  assert.ok(sizes.has(2500), 'numerals at 25pt');
  // Not a comparison of two literals: it reads the size the slide is actually
  // built from, so shrinking type to cure an overflow fails here. Overflow is
  // repaired by shortening copy, never by shrinking type.
  assert.ok(
    THESIS_GEOMETRY.bullet.fontSize >= MIN_FONT_SIZE,
    `bullets at ${THESIS_GEOMETRY.bullet.fontSize}pt fall below the ${MIN_FONT_SIZE}pt floor`,
  );
});

test("slide 2's speaker notes pair every bullet with its sources", async () => {
  const { pptx } = await build();
  const written = await pptx.notesText(2);
  if (!written) assert.fail('slide 2 should carry speaker notes');
  const notes = plain(written);

  for (const row of THESIS_ROWS) {
    assert.ok(notes.includes(row.label), `the notes should name "${row.label}"`);
    for (const bullet of TEST_THESIS[row.key].bullets) {
      assert.ok(notes.includes(bullet.text), `the notes should carry "${bullet.text}"`);
      for (const source of bullet.sources) {
        assert.ok(notes.includes(source), `the notes should carry the source ${source}`);
      }
    }
  }
});

test('a run with no thesis is refused rather than delivering an empty thesis page', async () => {
  // An empty thesis page is a missing required element, which is a critical
  // defect. Failing here is what lets ticket 08 decide what the run does next.
  await assert.rejects(() => build({ thesis: undefined }), /thesis/i);
});
