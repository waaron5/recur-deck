// Assembles the nine-slide deck.
//
// Slides 4-9 are the six supplied reference PNGs, placed full-bleed and in
// order. Slides 1-3 are generated natively so their text stays editable; in
// this build they carry only their layout frame and an empty notes field, and
// later tickets fill in the cover photo, the thesis, and the market map.

const fs = require('node:fs');
const path = require('node:path');
// pptxgenjs exports its class as the CommonJS module itself, which its
// ES-module typings describe as a default export; the hop through unknown is
// what lets the require() form keep its constructor type.
const PptxGenJS = /** @type {new () => import('pptxgenjs').default} */ (
  /** @type {unknown} */ (require('pptxgenjs'))
);

const {
  SLIDE_W,
  SLIDE_H,
  GENERATED_SLIDE_NUMBERS,
  FIXED_SLIDE_NUMBERS,
  FONT,
  COLORS,
  THESIS_SECTIONS,
  CONFIDENTIAL_LINE,
  MIN_FONT_SIZE,
  deckFileName,
  safeCompany,
} = require('./design.js');

/**
 * Build the deck and return the path it was written to.
 *
 * @param {object} options
 * @param {string} options.company    Target company name, as it should read.
 * @param {string} options.assetsDir  The skill's assets directory.
 * @param {string} options.outDir     Where the .pptx is written.
 * @param {Record<number, string>} [options.notes]  Speaker notes by slide number.
 * @returns {Promise<string>}
 */
async function buildDeck({ company, assetsDir, outDir, notes = {} }) {
  const name = safeCompany(company);
  if (!name) throw new Error('buildDeck needs a company name');

  const asset = (file) => {
    const full = path.join(assetsDir, file);
    if (!fs.existsSync(full)) throw new Error(`missing skill asset: ${file}`);
    return full;
  };

  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';

  const generated = GENERATED_SLIDE_NUMBERS.map(() => pres.addSlide());
  const [cover, thesis, marketMap] = generated;
  coverSlide(cover, name, asset);
  thesisSlide(thesis, name, asset);
  marketMapSlide(marketMap, name, asset);

  for (const slideNumber of FIXED_SLIDE_NUMBERS) {
    pres.addSlide().addImage({
      path: asset(`fixed-slide-${slideNumber}.png`),
      x: 0,
      y: 0,
      w: SLIDE_W,
      h: SLIDE_H,
    });
  }

  // Slides 1-3 carry the source record. Empty here; later tickets write it.
  GENERATED_SLIDE_NUMBERS.forEach((slideNumber, i) => {
    generated[i].addNotes(notes[slideNumber] ?? '');
  });

  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, deckFileName(name));
  await pres.writeFile({ fileName: file });
  return file;
}

// ---------- slides 1-3: layout frame only ----------

/** Cover: the landmark photo and duotone arrive in ticket 02. */
function coverSlide(slide, company, asset) {
  slide.background = { color: COLORS.navy };

  const divider = SLIDE_W / 2 - 0.35;
  placeImage(slide, asset('recur-wordmark-white.png'), 2.2, 3.2, 3.9, 0.7);
  slide.addShape('line', {
    x: divider,
    y: 2.95,
    w: 0,
    h: 1.25,
    line: { color: COLORS.white, width: 1 },
  });

  // The target's name as a text wordmark. Ticket 03 adds the logo pipeline;
  // a clean wordmark is the terminal fallback either way, never a blank slot.
  const slot = { x: SLIDE_W / 2 + 0.15, y: 3.05, w: 4.4, h: 0.95 };
  slide.addText(company, {
    ...slot,
    fontFace: FONT,
    fontSize: wordmarkFontSize(company, slot.w, slot.h),
    bold: true,
    color: COLORS.white,
    valign: 'middle',
    margin: 0,
    wrap: true,
  });
}

/** Thesis: three fixed sections. Headers and bullets arrive in ticket 04. */
function thesisSlide(slide, company, asset) {
  title(slide, `What we see in ${company}`);

  THESIS_SECTIONS.forEach((section, i) => {
    const y = 1.75 + i * 1.62;
    slide.addShape('ellipse', {
      x: 0.8,
      y: y + 0.02,
      w: 0.62,
      h: 0.62,
      fill: { color: section.circle },
      line: { type: 'none' },
    });
    slide.addText(String(i + 1), {
      x: 0.8,
      y: y + 0.02,
      w: 0.62,
      h: 0.62,
      fontFace: FONT,
      fontSize: 22,
      color: section.numeral,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
    slide.addText(section.label, {
      x: 1.75,
      y,
      w: 11,
      h: 0.5,
      fontFace: FONT,
      fontSize: 19,
      bold: true,
      color: section.text,
      valign: 'middle',
      margin: 0,
    });
  });

  footer(slide, 2, asset);
}

/** Market map: the axes, competitors and callout arrive in ticket 05. */
function marketMapSlide(slide, company, asset) {
  title(slide, `The opportunity for ${company}`, 0.45);

  const sidebar = 9.6;
  slide.addShape('rect', {
    x: 0,
    y: 2.0,
    w: sidebar,
    h: SLIDE_H - 2.0,
    fill: { color: COLORS.band },
    line: { type: 'none' },
  });
  slide.addShape('rect', {
    x: sidebar,
    y: 0,
    w: SLIDE_W - sidebar,
    h: SLIDE_H,
    fill: { color: COLORS.navy },
    line: { type: 'none' },
  });

  // The reference L-axes: no quadrant dividers, free placement inside them.
  const gx = 2.95;
  const gy = 2.45;
  const gw = 5.9;
  const gh = 3.75;
  slide.addShape('line', { x: gx, y: gy, w: 0, h: gh, line: { color: COLORS.navy, width: 1 } });
  slide.addShape('line', {
    x: gx,
    y: gy + gh,
    w: gw,
    h: 0,
    line: { color: COLORS.navy, width: 1 },
  });

  footer(slide, 3, asset);
}

// ---------- shared furniture ----------

function title(slide, text, y = 0.55) {
  slide.addText(text, {
    x: 0.75,
    y,
    w: 11.5,
    h: 0.75,
    fontFace: FONT,
    fontSize: 30,
    color: COLORS.navy,
    valign: 'middle',
    margin: 0,
  });
}

function footer(slide, pageNumber, asset) {
  slide.addText(CONFIDENTIAL_LINE, {
    x: 3.9,
    y: 7.05,
    w: 5.5,
    h: 0.25,
    fontFace: FONT,
    fontSize: 7,
    color: COLORS.grey,
    align: 'center',
    margin: 0,
  });
  placeImage(slide, asset('recur-wordmark-navy.png'), 11.35, 6.95, 1.1, 0.25);
  slide.addText(String(pageNumber), {
    x: 12.55,
    y: 6.86,
    w: 0.4,
    h: 0.3,
    fontFace: FONT,
    fontSize: 11,
    color: COLORS.navy,
    margin: 0,
  });
}

/** Place a PNG centred in a box, preserving its aspect ratio. */
function placeImage(slide, file, x, y, boxW, boxH) {
  const { width, height } = pngSize(file);
  const scale = Math.min(boxW / width, boxH / height);
  const w = width * scale;
  const h = height * scale;
  slide.addImage({ path: file, x: x + (boxW - w) / 2, y: y + (boxH - h) / 2, w, h });
}

/**
 * Read a PNG's pixel dimensions from its IHDR chunk. The bundled assets are all
 * PNG, so this saves shipping an image library inside the 200-file cap.
 */
function pngSize(file) {
  const head = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  try {
    fs.readSync(fd, head, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (head.toString('ascii', 1, 4) !== 'PNG') throw new Error(`not a PNG: ${file}`);
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

/**
 * Size a text wordmark to its slot: bounded by the slot height, and by the slot
 * width at Arial bold's rough average character width.
 *
 * The result never goes below the 12pt floor. A name too long to fit on one
 * line at that floor wraps inside the slot instead of shrinking past it, since
 * type sizes are fixed design values. Capping name length is the content
 * gate's job (ticket 06), not this function's.
 */
function wordmarkFontSize(text, boxW, boxH) {
  const byHeight = boxH * 72 * 0.62;
  const byWidth = (boxW * 72) / (0.58 * Math.max(text.length, 1));
  return Math.max(MIN_FONT_SIZE, Math.round(Math.min(byHeight, byWidth)));
}

module.exports = { buildDeck };
