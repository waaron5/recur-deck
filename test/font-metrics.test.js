// Text measurement, and the line breaks it predicts.
//
// The expected widths here are not recomputed the way the code computes them.
// They come from measuring the reference slides themselves: Slide2.png is
// 1300 x 731 px on the original's 10in page, so 130 px per inch, and the ink of
// a known string can be read straight off it.
//
//   "What we see in US Fleet Tracking"  20pt    ink 4.108in
//   "Small commercial fleets ... tools"  11.5pt  ink 6.069in
//
// An advance width is always a little wider than ink, because it includes the
// last glyph's right side bearing, so each assertion brackets the measured ink
// below and leaves room for that bearing above.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { textWidth, wrapLines } = require('../skill/src/font-metrics.js');
const { THESIS_GEOMETRY, TITLE } = require('../skill/src/design.js');

// The reference title and the reference first bullet, as slide 2 sets them.
const TITLE_TEXT = 'What we see in US Fleet Tracking';
const BULLET_TEXT =
  'Small commercial fleets still coordinate dispatch on low-complexity or homegrown tools';

/** The width a thesis bullet actually has: its box, less the bullet indent. */
const bulletColumn = THESIS_GEOMETRY.bullet.w - THESIS_GEOMETRY.bullet.indent / 72;

test('a string measures the width the reference slide shows it taking', () => {
  const title = textWidth(TITLE_TEXT, { fontSize: TITLE.fontSize });
  assert.ok(
    title > 4.108 && title < 4.3,
    `the reference title inks 4.108in at 20pt, and this measured ${title.toFixed(3)}in`,
  );

  const bullet = textWidth(BULLET_TEXT, { fontSize: THESIS_GEOMETRY.bullet.fontSize });
  assert.ok(
    bullet > 6.069 && bullet < 6.3,
    `the reference bullet inks 6.069in at 11.5pt, and this measured ${bullet.toFixed(3)}in`,
  );
});

test('the same string sets wider bold than it does regular', () => {
  const regular = textWidth(BULLET_TEXT, { fontSize: 11.5 });
  const bold = textWidth(BULLET_TEXT, { fontSize: 11.5, bold: true });
  assert.ok(bold > regular, 'bold should be the wider of the two');
});

test('width scales with the type size, because the metrics are per em', () => {
  const small = textWidth(TITLE_TEXT, { fontSize: 10 });
  const large = textWidth(TITLE_TEXT, { fontSize: 20 });
  assert.ok(Math.abs(large - small * 2) < 1e-9, 'twice the size is twice the width');
});

test('the reference bullet fits its own column on one line, as slide 2 shows it', () => {
  // This is the check that matters: the reference deck sets this bullet on one
  // line, so a prediction that says otherwise would send every run into a
  // repair round it does not need.
  assert.equal(
    wrapLines(BULLET_TEXT, { width: bulletColumn, fontSize: THESIS_GEOMETRY.bullet.fontSize }),
    1,
  );
});

test('text too long for its column wraps, and the count says how far over it is', () => {
  const long = `${BULLET_TEXT} and a good deal more besides that will not fit on one line`;
  assert.ok(
    wrapLines(long, { width: bulletColumn, fontSize: THESIS_GEOMETRY.bullet.fontSize }) >= 2,
    'a bullet half as long again as the column should wrap',
  );

  // The same string in a narrower column wraps further.
  const narrow = wrapLines(BULLET_TEXT, { width: 3, fontSize: 11.5 });
  const wide = wrapLines(BULLET_TEXT, { width: 6, fontSize: 11.5 });
  assert.ok(narrow > wide, 'a narrower column takes more lines');
});

test('a word wider than the column still counts as one line, and does not hang', () => {
  // A single long word cannot be broken across lines by wrapping, and a
  // predictor that tried would never finish. It takes its own line and the fit
  // check reports the overflow.
  assert.equal(wrapLines('Supercalifragilisticexpialidocious', { width: 0.5, fontSize: 11.5 }), 1);
  assert.equal(wrapLines('', { width: 3, fontSize: 11.5 }), 1);
});
