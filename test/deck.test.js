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
  FONT,
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
  TEST_MARKET_MAP,
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
    marketMap: TEST_MARKET_MAP,
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

test("slide 1's notes record the companies the run ruled out", async () => {
  // Decision 07 settles an ambiguous name without asking, which means someone
  // reviewing the deck later has to be able to see what it decided and why. The
  // losing candidates are part of the source record, so they go where the rest
  // of it goes: in the notes, never on the cover a founder is mailed.
  const { pptx } = await build({
    identification: 'Matched the prompt to usfleettracking.com, a private fleet tracking company.',
    rejected: [
      'US Fleet Tracking LLC of Tulsa: no website of its own',
      'Fleet Tracking Inc: sells hardware rather than software',
    ],
  });

  const notes = String(await pptx.notesText(1));
  assert.match(notes, /Tulsa/);
  assert.match(notes, /sells hardware rather than software/);

  const onCover = (await pptx.textBoxes(1)).map((box) => box.text).join(' ');
  assert.doesNotMatch(onCover, /Tulsa/, 'the reasoning stays behind the cover, never on it');
});

test("slide 1's notes say when the cover had to leave the headquarters city", async () => {
  // Decision 07's metro rung: "a landmark in the nearest major metro within
  // about 60 km, with the link stated in slide 1's notes." Someone reviewing a
  // Dallas skyline on an Oklahoma City company has to be able to find out from
  // the deck itself that it was a decision and not a mistake - the reply that
  // said so is long gone by then.
  const { pptx } = await build({ landmarkFallback: 'metro landmark (Dallas, Texas)' });

  assert.match(String(await pptx.notesText(1)), /metro landmark \(Dallas, Texas\)/);

  const onCover = (await pptx.textBoxes(1)).map((box) => box.text).join(' ');
  assert.doesNotMatch(onCover, /Dallas/, 'and it stays behind the cover, like the rest of the record');
});

test('a thin competitor field can still be delivered as a flagged deck', async () => {
  // Decision 07: "Fewer than 5 after that is a critical defect and produces a
  // flagged deck." It only produces one if the build survives long enough to
  // write a file, so this tests a path rather than a message. Four competitors,
  // one to a quadrant, so the only rule being broken is the count.
  const wanted = new Set(['US Fleet Tracking', 'Azuga', 'Linxup', 'Samsara', 'Motive']);
  const thin = {
    ...TEST_MARKET_MAP,
    companies: TEST_MARKET_MAP.companies.filter((company) => wanted.has(company.name)),
  };

  const { file, pptx } = await build({ flagged: true, marketMap: thin });

  assert.equal(path.basename(file), 'Recur x US Fleet Tracking - NOT READY.pptx');
  assert.equal(pptx.slideCount, 9, 'the deck is whole, and what is wrong with it goes in the reply');
});

test('a deck whose defects outlived the repair budget is named as one', async () => {
  // Decision 07 still hands the deck over: a nearly-right deck is worth more to
  // the person who asked than nothing at all. What it must not do is let the
  // file leave looking finished, because the file outlives the reply that
  // explained it - it gets forwarded to whoever is going to do the mailing.
  const { file, pptx } = await build({ flagged: true });

  assert.equal(path.basename(file), 'Recur x US Fleet Tracking - NOT READY.pptx');
  assert.equal(pptx.slideCount, 9, 'a flagged deck is a whole deck, not a truncated one');

  const onSlides = (
    await Promise.all([1, 2, 3].map(async (slide) => (await pptx.textBoxes(slide)).map((box) => box.text).join(' ')))
  ).join(' ');
  assert.doesNotMatch(
    onSlides,
    /NOT READY/,
    'the warning belongs on the file, never on a slide someone might print',
  );
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

test('the cover and the market map each write their own source record', async () => {
  const { pptx } = await build();

  const cover = await pptx.notesText(1);
  if (cover === null) assert.fail('slide 1 should carry speaker notes');
  assert.match(cover, /Headquarters: Oklahoma City/);

  const map = await pptx.notesText(3);
  if (!map) assert.fail('slide 3 should carry speaker notes');
  assert.match(map, /Commitment model/, 'the map notes should name the axes it reasons');
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

test('the deck is set in the same face the fit estimate measures', async () => {
  // The fault ticket 07 fixed: design.js declared Noto Sans Arabic Light, which
  // carries no Latin glyphs and so drew none of this deck, while the content
  // gate measured Arial. A face the gate does not measure makes every wrap
  // prediction - and every rendered line break - a guess about a substitution.
  const provenance = fs.readFileSync(
    path.join(__dirname, '..', 'skill', 'src', 'font-advances.js'),
    'utf8',
  );
  const measured = [...provenance.matchAll(/^\/\/ (?:regular|bold)\s+(\S+)\.ttf/gm)].map((m) =>
    m[1].replace(/ Bold$/, ''),
  );

  assert.ok(measured.length > 0, 'the generated metrics should record which files they came from');
  for (const face of measured) {
    assert.equal(face, FONT, `the gate measures ${face} while the deck declares ${FONT}`);
  }
});

test('every line on slides 1-3 declares that face, so none falls back silently', async () => {
  const { pptx } = await build();
  for (const slideNumber of [1, 2, 3]) {
    const declared = new Set(
      [...(await pptx.slideXml(slideNumber)).matchAll(/typeface="([^"]*)"/g)].map((m) => m[1]),
    );
    declared.delete('');
    assert.deepEqual(
      [...declared],
      [FONT],
      `slide ${slideNumber} should set every run in ${FONT}`,
    );
  }
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
