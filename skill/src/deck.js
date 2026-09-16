// Assembles the nine-slide deck.
//
// Slides 4-9 are the six supplied reference PNGs, placed full-bleed and in
// order. Slides 1-3 are generated natively so their text stays editable. The
// cover is built from a real headquarters landmark; the thesis and the market
// map still carry only their layout frame, and later tickets fill them in.
//
// Geometry is in the original deck's 10 x 5.625in units - see design.js.

const fs = require('node:fs');
const path = require('node:path');
// pptxgenjs exports its class as the CommonJS module itself, which its
// ES-module typings describe as a default export; the hop through unknown is
// what lets the require() form keep its constructor type.
const PptxGenJS = /** @type {new () => import('pptxgenjs').default} */ (
  /** @type {unknown} */ (require('pptxgenjs'))
);

const { coverPhoto } = require('./cover-photo.js');
const { chooseMark } = require('./logo.js');
const {
  SLIDE_W,
  SLIDE_H,
  GENERATED_SLIDE_NUMBERS,
  FIXED_SLIDE_NUMBERS,
  FONT,
  COLORS,
  THESIS_SECTIONS,
  TITLE,
  COVER,
  CAP_HEIGHT_EM,
  CHAR_WIDTH_EM,
  CONFIDENTIAL_LINE,
  FOOTER,
  MIN_FONT_SIZE,
  deckFileName,
  safeCompany,
} = require('./design.js');

/**
 * @typedef {{fileName: string, artist: string, licence: string, descriptionUrl: string}} PhotoCredit
 * @typedef {{photo: Buffer, credit?: PhotoCredit, width?: number}} Landmark
 * @typedef {import('./logo.js').NormalisedLogo & {
 *   source?: string,
 *   verified?: boolean,
 * }} CoverLogo
 * @typedef {import('./logo.js').PlacedMark} CoverMark
 */

/**
 * Build the deck and return the path it was written to.
 *
 * @param {object} options
 * @param {string} options.company    Target company name, as it should read.
 * @param {string} options.assetsDir  The skill's assets directory.
 * @param {string} options.outDir     Where the .pptx is written.
 * @param {Landmark} [options.landmark]  The cover photo and its credit.
 * @param {CoverLogo} [options.logo]     The target's logo, if one was acquired.
 * @param {string} [options.logoNote]    Why there is no logo, when there is none.
 * @param {{city?: string, source?: string}} [options.headquarters]
 * @param {string} [options.identification]  How the company was identified.
 * @param {Record<number, string>} [options.notes]  Speaker notes by slide number.
 * @returns {Promise<string>}
 */
async function buildDeck({
  company,
  assetsDir,
  outDir,
  landmark,
  logo,
  logoNote,
  headquarters = {},
  identification = '',
  notes = {},
}) {
  const name = safeCompany(company);
  if (!name) throw new Error('buildDeck needs a company name');
  // A cover with no photo is a critical defect, not a deck to be delivered
  // quietly. What to do about it - the landmark ladder - belongs to ticket 08.
  if (!landmark?.photo) throw new Error(`buildDeck needs a landmark photo for ${name}'s cover`);

  const asset = (file) => {
    const full = path.join(assetsDir, file);
    if (!fs.existsSync(full)) throw new Error(`missing skill asset: ${file}`);
    return full;
  };

  const pres = new PptxGenJS();
  // The original presentation's page size, rather than a named preset.
  pres.defineLayout({ name: 'RECUR', width: SLIDE_W, height: SLIDE_H });
  pres.layout = 'RECUR';

  const generated = GENERATED_SLIDE_NUMBERS.map(() => pres.addSlide());
  const [cover, thesis, marketMap] = generated;
  const coverMark = chooseMark({
    logo,
    slot: COVER.logo,
    background: 'dark',
    reason: logoNote,
  });
  coverSlide(cover, name, asset, landmark, coverMark);
  thesisSlide(thesis, name, asset);
  marketMapSlide(marketMap, name);

  for (const slideNumber of FIXED_SLIDE_NUMBERS) {
    pres.addSlide().addImage({
      path: asset(`fixed-slide-${slideNumber}.png`),
      x: 0,
      y: 0,
      w: SLIDE_W,
      h: SLIDE_H,
    });
  }

  // Slides 1-3 carry the run's source record. The cover's part is written here;
  // the thesis and market map get theirs from later tickets, through notes.
  const record = {
    1: sourceRecord({ company: name, headquarters, identification, landmark, logo, coverMark }),
    ...notes,
  };
  GENERATED_SLIDE_NUMBERS.forEach((slideNumber, i) => {
    generated[i].addNotes(record[slideNumber] ?? '');
  });

  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, deckFileName(name));
  await pres.writeFile({ fileName: file });
  return file;
}

/**
 * What slide 1's speaker notes say. None of it appears on the slide: the cover
 * is a mailed sales piece, and the evidence belongs behind it.
 *
 * @param {object} options
 * @param {string} options.company
 * @param {{city?: string, source?: string}} options.headquarters
 * @param {string} options.identification
 * @param {Landmark} options.landmark
 * @param {CoverLogo} [options.logo]
 * @param {CoverMark} [options.coverMark]
 */
function sourceRecord({ company, headquarters, identification, landmark, logo, coverMark }) {
  const lines = [`Company: ${company}`];
  if (identification) lines.push(`Identified: ${identification}`);
  if (headquarters.city) lines.push(`Headquarters: ${headquarters.city}`);
  if (headquarters.source) lines.push(`Headquarters source: ${headquarters.source}`);

  const { credit } = landmark;
  if (credit) {
    lines.push(`Cover photo: ${credit.fileName}`);
    if (credit.artist) lines.push(`Photographer: ${credit.artist}`);
    if (credit.licence) lines.push(`Licence: ${credit.licence}`);
    if (credit.descriptionUrl) lines.push(`Photo source: ${credit.descriptionUrl}`);
  }
  // The cover wants a photo at least 1600px wide. Recording what it actually
  // got means a narrower one, from the 1280 retry, is visible in the source
  // record instead of shipping unremarked. Grading it is ticket 08's ladder.
  if (landmark.width) lines.push(`Photo width: ${landmark.width}px`);

  // Where the logo came from, and - when the cover fell back to type - why.
  // A reviewer checking a deck needs to see the logo's provenance without
  // going back to the site, and the reason is what makes a wordmark read as a
  // decision rather than as something that went wrong.
  if (logo?.source) lines.push(`Logo source: ${logo.source}`);
  if (logo) lines.push(`Logo: ${logo.width}x${logo.height}px, from ${logo.sourceFormat}`);
  if (coverMark?.kind === 'wordmark') {
    lines.push(`Cover mark: text wordmark, because ${coverMark.reason}`);
  }

  return lines.join('\n');
}

// ---------- slide 1: the cover ----------

/**
 * The cover: the headquarters landmark under the navy duotone, the Recur
 * wordmark, a thin divider, and the target company.
 *
 * @param {any} slide
 * @param {string} company
 * @param {(file: string) => string} asset
 * @param {Landmark} landmark
 * @param {CoverMark} coverMark
 */
function coverSlide(slide, company, asset, landmark, coverMark) {
  // Navy behind the photo, so a slide that somehow loses its image still reads
  // as the deck rather than as a white page.
  slide.background = { color: COLORS.navy };

  // The photo goes in as bytes rather than a path: it is made in memory, and
  // the sandbox has nowhere better to put it than a temporary file nobody
  // would clean up.
  slide.addImage({
    data: `image/jpeg;base64,${coverPhoto(landmark.photo).toString('base64')}`,
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
  });

  // The Recur wordmark is the bundled PNG, so it never depends on a font being
  // installed. Held to the reference's cap height and right-hand edge.
  const wordmarkFile = asset('recur-wordmark-white.png');
  const { width, height } = pngSize(wordmarkFile);
  const markHeight = COVER.wordmark.capHeight;
  const markWidth = (width / height) * markHeight;
  slide.addImage({
    path: wordmarkFile,
    x: COVER.wordmark.right - markWidth,
    y: COVER.wordmark.centreY - markHeight / 2,
    w: markWidth,
    h: markHeight,
  });

  slide.addShape('line', {
    x: COVER.divider.x,
    y: COVER.divider.y,
    w: 0,
    h: COVER.divider.h,
    line: { color: COLORS.white, width: COVER.divider.weight },
  });

  const slot = COVER.name;

  // The company's own logo, left-aligned in the name's slot and centred on the
  // same line, so the cover reads the same whichever mark it carries.
  if (coverMark.kind === 'logo') {
    slide.addImage({
      data: `image/png;base64,${coverMark.png.toString('base64')}`,
      x: slot.left,
      y: slot.centreY - coverMark.height / 2,
      w: coverMark.width,
      h: coverMark.height,
    });
    return;
  }

  // The terminal fallback, and never a blank slot: the name set as type.
  slide.addText(company, {
    x: slot.left,
    y: slot.centreY - slot.boxHeight / 2,
    w: slot.width,
    h: slot.boxHeight,
    fontFace: FONT,
    fontSize: wordmarkFontSize(company, slot.width, slot.capHeight),
    bold: true,
    color: COLORS.white,
    valign: 'middle',
    margin: 0,
    wrap: true,
  });
}

// ---------- slides 2-3: layout frame only ----------

/** Thesis: three fixed sections. Headers and bullets arrive in ticket 04. */
function thesisSlide(slide, company, asset) {
  title(slide, `What we see in ${company}`, TITLE.y.thesis);

  THESIS_SECTIONS.forEach((section, i) => {
    const y = 1.3125 + i * 1.215;
    slide.addShape('ellipse', {
      x: 0.6,
      y: y + 0.015,
      w: 0.465,
      h: 0.465,
      fill: { color: section.circle },
      line: { type: 'none' },
    });
    slide.addText(String(i + 1), {
      x: 0.6,
      y: y + 0.015,
      w: 0.465,
      h: 0.465,
      fontFace: FONT,
      fontSize: 16.5,
      color: section.numeral,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
    slide.addText(section.label, {
      x: 1.3125,
      y,
      w: 8.25,
      h: 0.375,
      fontFace: FONT,
      fontSize: 14.25,
      bold: true,
      color: section.text,
      valign: 'middle',
      margin: 0,
    });
  });

  footer(slide, 2, asset);
}

/**
 * Market map: the axes, competitors and callout arrive in ticket 05.
 *
 * No footer: the reference market map carries no confidentiality line, wordmark
 * or page number, and the slide reads less cluttered without them.
 */
function marketMapSlide(slide, company) {
  title(slide, `The opportunity for ${company}`, TITLE.y.marketMap);

  const sidebar = 7.2;
  slide.addShape('rect', {
    x: 0,
    y: 1.5,
    w: sidebar,
    h: SLIDE_H - 1.5,
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
  const gx = 2.2125;
  const gy = 1.8375;
  const gw = 4.425;
  const gh = 2.8125;
  slide.addShape('line', { x: gx, y: gy, w: 0, h: gh, line: { color: COLORS.navy, width: 1 } });
  slide.addShape('line', {
    x: gx,
    y: gy + gh,
    w: gw,
    h: 0,
    line: { color: COLORS.navy, width: 1 },
  });
}

// ---------- shared furniture ----------

/** A slide title, matching the reference: 20pt, not bold, navy. */
function title(slide, text, y) {
  slide.addText(text, {
    x: TITLE.x,
    y,
    w: TITLE.w,
    h: TITLE.h,
    fontFace: FONT,
    fontSize: TITLE.fontSize,
    bold: false,
    color: COLORS.navy,
    valign: 'middle',
    margin: 0,
  });
}

function footer(slide, pageNumber, asset) {
  const { wordmark, pageNumber: numeral, confidential } = FOOTER;

  // Centred across the full slide width, which is where the reference puts it.
  slide.addText(CONFIDENTIAL_LINE, {
    x: 0,
    y: confidential.y,
    w: SLIDE_W,
    h: confidential.h,
    fontFace: FONT,
    fontSize: confidential.fontSize,
    color: COLORS.grey,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });

  placeImage(slide, asset('recur-wordmark-navy.png'), wordmark.x, wordmark.y, wordmark.w, wordmark.h);

  slide.addText(String(pageNumber), {
    x: numeral.x,
    y: numeral.y,
    w: numeral.w,
    h: numeral.h,
    fontFace: FONT,
    fontSize: numeral.fontSize,
    color: COLORS.navy,
    align: 'center',
    valign: 'middle',
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
 * Size a text wordmark to its slot: the reference's cap height, unless the name
 * is too long for the slot at that size, in which case the width decides.
 *
 * Both bounds come from measurements of the reference cover, not estimates. An
 * invented character width here quietly overrides the measured cap height and
 * sets the name far smaller than the reference does.
 *
 * The result never goes below the type floor. A name too long to fit on one
 * line at that floor wraps inside the slot instead of shrinking past it, since
 * type sizes are fixed design values. Capping name length is the content
 * gate's job (ticket 06), not this function's.
 *
 * @param {string} text
 * @param {number} boxW
 * @param {number} capHeight
 */
function wordmarkFontSize(text, boxW, capHeight) {
  const byCapHeight = (capHeight / CAP_HEIGHT_EM) * 72;
  const byWidth = (boxW * 72) / (CHAR_WIDTH_EM * Math.max(text.length, 1));
  return Math.max(MIN_FONT_SIZE, Math.round(Math.min(byCapHeight, byWidth)));
}

module.exports = { buildDeck };
