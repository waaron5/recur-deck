// Assembles the nine-slide deck.
//
// Slides 4-9 are the six supplied reference PNGs, placed full-bleed and in
// order. Slides 1-3 are generated natively so their text stays editable. The
// cover is built from a real headquarters landmark and the thesis from the
// run's research object; the market map still carries only its layout frame,
// and ticket 05 fills it in.
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
const { assertStructure } = require('./structure.js');
const { thesisSections, thesisNotes } = require('./thesis.js');
const { marketMap, placeOnMap, marketMapNotes } = require('./market-map.js');
const {
  SLIDE_W,
  SLIDE_H,
  GENERATED_SLIDE_NUMBERS,
  FIXED_SLIDE_NUMBERS,
  FONT,
  COLORS,
  THESIS_GEOMETRY,
  TITLE,
  COVER,
  MAP,
  MAP_LAYOUT,
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
 * @param {import('./thesis.js').Thesis} [options.thesis]  The three sections the run wrote.
 * @param {any} [options.marketMap]  The axes, companies and callout the run wrote.
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
  thesis,
  marketMap: mapInput,
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

  // Checked before anything is written. An empty thesis page or market map is a
  // missing required element, so the run hears which part is wrong rather than
  // getting a deck with a hole where its argument should be.
  const sections = thesisSections(thesis);
  const map = marketMap(mapInput);

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
  const [cover, thesisPage, mapPage] = generated;
  const coverMark = chooseMark({
    logo,
    slot: COVER.logo,
    background: 'dark',
    reason: logoNote,
  });
  // Each map company's mark is decided once: the slide draws it, and the notes
  // record why any company fell back to type.
  const mapMarks = new Map(map.companies.map((company) => [company.name, mapMark(company)]));

  coverSlide(cover, name, asset, landmark, coverMark);
  thesisSlide(thesisPage, name, sections, asset);
  marketMapSlide(mapPage, name, map, mapMarks);

  for (const slideNumber of FIXED_SLIDE_NUMBERS) {
    pres.addSlide().addImage({
      path: asset(`fixed-slide-${slideNumber}.png`),
      x: 0,
      y: 0,
      w: SLIDE_W,
      h: SLIDE_H,
    });
  }

  // Slides 1-3 carry the run's source record: how the company was identified,
  // the source behind every thesis bullet, and the evidence and reasoning
  // behind every competitor, placement and axis.
  const record = {
    1: sourceRecord({ company: name, headquarters, identification, landmark, logo, coverMark }),
    2: thesisNotes(sections),
    3: marketMapNotes(map, mapMarks),
    ...notes,
  };
  GENERATED_SLIDE_NUMBERS.forEach((slideNumber, i) => {
    generated[i].addNotes(record[slideNumber] ?? '');
  });

  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, deckFileName(name));
  await pres.writeFile({ fileName: file });

  // Stage 6 ends here: the file is reopened and checked before anything is
  // rendered, and long before it is offered to anyone. None of what this finds
  // is repairable by rewriting copy - a deck that came out with eight slides is
  // a fault in this package - so it fails the build rather than costing a run
  // one of its repair rounds.
  await assertStructure(file, { assetsDir });

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

/**
 * The thesis: three stacked rows, each a numbered circle, the bold section
 * label and its header on one line, and two bullets in the section's colour.
 *
 * Every box is centred on the ink the reference puts there, so a box taller
 * than the line it holds cannot drag the type off the measurement. Each bullet
 * gets its own box for the same reason: sharing one box would hand its second
 * line's position to the renderer's line spacing instead of the reference.
 *
 * @param {any} slide
 * @param {string} company
 * @param {import('./thesis.js').LaidOutSection[]} sections
 * @param {(file: string) => string} asset
 */
function thesisSlide(slide, company, sections, asset) {
  title(slide, `What we see in ${company}`, TITLE.y.thesis);

  const { rowTop, rowPitch, circle, header, bullet: bulletBox } = THESIS_GEOMETRY;

  sections.forEach((section, i) => {
    const top = rowTop + i * rowPitch;

    slide.addShape('ellipse', {
      x: circle.x,
      y: top,
      w: circle.diameter,
      h: circle.diameter,
      fill: { color: section.circle },
      line: { type: 'none' },
    });
    slide.addText(String(i + 1), {
      x: circle.x,
      y: top,
      w: circle.diameter,
      h: circle.diameter,
      fontFace: FONT,
      fontSize: circle.fontSize,
      color: section.numeral,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });

    // The label is bold and the header is not, both on one line and both in the
    // section's own colour, which is what the reference does.
    slide.addText(
      [{ text: `${section.label}: `, options: { bold: true } }, { text: section.header }],
      {
        x: header.x,
        y: top + header.inkCentre - header.boxHeight / 2,
        w: header.w,
        h: header.boxHeight,
        fontFace: FONT,
        fontSize: header.fontSize,
        color: section.text,
        valign: 'middle',
        margin: 0,
      },
    );

    section.bullets.forEach((bullet, b) => {
      slide.addText(bullet.text, {
        x: bulletBox.x,
        y: top + bulletBox.inkCentre + b * bulletBox.leading - bulletBox.boxHeight / 2,
        w: bulletBox.w,
        h: bulletBox.boxHeight,
        fontFace: FONT,
        fontSize: bulletBox.fontSize,
        color: section.text,
        valign: 'middle',
        margin: 0,
        bullet: { code: bulletBox.square, indent: bulletBox.indent },
      });
    });
  });

  footer(slide, 2, asset);
}

/**
 * The market map: the title and subtitle over a tinted band, an L-shaped navy
 * axis pair with the companies placed freely inside it, and the callout in a
 * full-height navy sidebar.
 *
 * There are no quadrant dividers, only the two axis lines, as in the reference.
 *
 * No footer: the reference market map carries no confidentiality line, wordmark
 * or page number, and the slide reads less cluttered without them.
 *
 * @param {any} slide
 * @param {string} company
 * @param {import('./market-map.js').MarketMap} map
 * @param {Map<string, CoverMark>} marks  What each company carries, decided once.
 */
function marketMapSlide(slide, company, map, marks) {
  const { band, subtitle, sidebar, plot } = MAP;
  // Both derived once in design.js, because the content gate measures against
  // the same two edges and a value derived twice is a value that drifts. The
  // baseline stops one sidebar inset short of the callout - the reference runs
  // it to x 7.708in, which is under the sidebar the callout now occupies - and
  // the copy column runs to that same edge.
  const { axisEnd, column } = MAP_LAYOUT;

  // The title is held to the copy column, so a long company name wraps instead
  // of running under the sidebar.
  title(slide, `The opportunity for ${company}`, TITLE.y.marketMap, column);
  slide.addText(map.subtitle, {
    x: TITLE.x,
    y: subtitle.centreY - subtitle.boxHeight / 2,
    w: column,
    h: subtitle.boxHeight,
    fontFace: FONT,
    fontSize: subtitle.fontSize,
    color: COLORS.grey,
    valign: 'middle',
    margin: 0,
  });

  slide.addShape('rect', {
    x: 0,
    y: band.top,
    w: sidebar.x,
    h: SLIDE_H - band.top,
    fill: { color: COLORS.band },
    line: { type: 'none' },
  });
  slide.addShape('rect', {
    x: sidebar.x,
    y: 0,
    w: SLIDE_W - sidebar.x,
    h: SLIDE_H,
    fill: { color: COLORS.navy },
    line: { type: 'none' },
  });

  slide.addShape('line', {
    x: plot.x,
    y: plot.top,
    w: 0,
    h: plot.bottom - plot.top,
    line: { color: COLORS.navy, width: plot.weight },
  });
  slide.addShape('line', {
    x: plot.x,
    y: plot.bottom,
    w: axisEnd - plot.x,
    h: 0,
    line: { color: COLORS.navy, width: plot.weight },
  });

  axisLabels(slide, map.axes, axisEnd);
  calloutSidebar(slide, map.callout);

  // How large each mark is decides the box the placement has to keep clear.
  const placed = placeOnMap({
    companies: map.companies.map((c) => ({ ...c, size: markSize(marks.get(c.name), c.name) })),
    area: {
      x: plot.x + MAP.inset.left,
      y: plot.top + MAP.inset.top,
      w: axisEnd - plot.x - MAP.inset.left - MAP.inset.right,
      h: plot.bottom - plot.top - MAP.inset.top - MAP.inset.bottom,
    },
  });

  for (const box of placed) drawCompany(slide, box, marks.get(box.name));
}

/**
 * Which mark one company on the map carries. The map's slot sizes to an equal
 * optical area, so a wide wordmark and a square mark read as the same weight.
 *
 * @param {import('./market-map.js').MapCompany} company
 * @returns {CoverMark}
 */
function mapMark(company) {
  return chooseMark({
    logo: company.logo,
    slot: MAP.slot,
    background: 'light',
    reason: company.logoNote,
  });
}

/**
 * The footprint a mark needs. A text wordmark has no image to measure, so its
 * box grows with the name up to the slot's own maximum.
 *
 * @param {CoverMark | undefined} mark
 * @param {string} name
 */
function markSize(mark, name) {
  if (mark?.kind === 'logo') return { width: mark.width, height: mark.height };
  const { charWidth, pad, height } = MAP.wordmark;
  return { width: Math.min(MAP.slot.maxWidth, charWidth * name.length + pad), height };
}

/**
 * One company on the map: the target's white pill first, then its mark.
 *
 * @param {{cx: number, cy: number, w: number, h: number,
 *   company: import('./market-map.js').MapCompany}} box
 * @param {CoverMark | undefined} mark
 */
function drawCompany(slide, box, mark) {
  // The target is distinguished by this and nothing else: no cell tint, no
  // second label.
  if (box.company.target) {
    slide.addShape('roundRect', {
      x: box.cx - box.w / 2,
      y: box.cy - box.h / 2,
      w: box.w,
      h: box.h,
      fill: { color: COLORS.white },
      line: { color: COLORS.teal, width: MAP.target.outline },
      rectRadius: MAP.target.radius,
    });
  }

  const { width, height } = markSize(mark, box.company.name);
  if (mark?.kind === 'logo') {
    slide.addImage({
      data: `image/png;base64,${mark.png.toString('base64')}`,
      x: box.cx - width / 2,
      y: box.cy - height / 2,
      w: width,
      h: height,
    });
    return;
  }

  slide.addText(box.company.name, {
    x: box.cx - width / 2,
    y: box.cy - height / 2,
    w: width,
    h: height,
    fontFace: FONT,
    fontSize: MAP.wordmark.fontSize,
    bold: true,
    color: COLORS.navy,
    align: 'center',
    valign: 'middle',
    margin: 0,
  });
}

/**
 * The four labels around the axes: each axis's name, quiet and tracked, and its
 * two categories, which are the only bold type on the chart because they are
 * what the reader has to read.
 *
 * @param {any} slide
 * @param {import('./market-map.js').MarketMap['axes']} axes
 * @param {number} axisEnd
 */
function axisLabels(slide, axes, axisEnd) {
  const { plot, label } = MAP;
  const { gutter } = MAP_LAYOUT;
  const halfHeight = (plot.bottom - plot.top) / 2;
  const halfWidth = (axisEnd - plot.x) / 2;

  axisName(slide, axes.y.name, {
    x: label.gutter.x,
    y: plot.top + label.name.insetY - label.name.boxHeight / 2,
    w: gutter,
    h: label.name.boxHeight,
    align: 'right',
  });
  [axes.y.high, axes.y.low].forEach((category, half) => {
    axisCategory(slide, category, {
      x: label.gutter.x,
      y: plot.top + half * halfHeight,
      w: gutter,
      h: halfHeight,
      align: 'right',
      valign: 'middle',
    });
  });

  [axes.x.low, axes.x.high].forEach((category, half) => {
    axisCategory(slide, category, {
      x: plot.x + half * halfWidth,
      y: plot.bottom + label.category.gap,
      w: halfWidth,
      h: label.category.boxHeight,
      align: 'center',
      valign: 'top',
    });
  });
  axisName(slide, axes.x.name, {
    x: plot.x,
    y: plot.bottom + label.name.gap,
    w: axisEnd - plot.x,
    h: label.name.boxHeight,
    align: 'center',
  });
}

/** An axis's own name: small, grey, uppercase and tracked. */
function axisName(slide, text, box) {
  slide.addText(text.toUpperCase(), {
    fontFace: FONT,
    fontSize: MAP.label.name.fontSize,
    color: COLORS.grey,
    charSpacing: MAP.label.name.tracking,
    valign: 'middle',
    margin: 0,
    ...box,
  });
}

/** One side of an axis: bold navy, because this is what has to be read. */
function axisCategory(slide, text, box) {
  slide.addText(text, {
    fontFace: FONT,
    fontSize: MAP.label.category.fontSize,
    bold: true,
    color: COLORS.navy,
    margin: 0,
    ...box,
  });
}

/**
 * The callout: "Our take" and where the target wins, two bullets on how the
 * market behaves, and one underlined bullet tying back to a proposal.
 *
 * @param {any} slide
 * @param {import('./market-map.js').MarketMap['callout']} callout
 */
function calloutSidebar(slide, callout) {
  const { sidebar, callout: box } = MAP;
  const bullet = { code: THESIS_GEOMETRY.bullet.square, indent: box.indent };

  slide.addText(
    [
      { text: 'Our take: ', options: { bold: true } },
      { text: callout.take, options: { breakLine: true } },
      ...callout.dynamics.map((text) => ({ text, options: { bullet, breakLine: true } })),
      { text: callout.proposal, options: { bullet, underline: { style: 'sng' } } },
    ],
    {
      x: sidebar.x + sidebar.pad,
      y: box.top,
      w: MAP_LAYOUT.calloutWidth,
      h: box.height,
      fontFace: FONT,
      fontSize: box.fontSize,
      color: COLORS.white,
      valign: 'top',
      margin: 0,
      paraSpaceAfter: box.spaceAfter,
      lineSpacingMultiple: box.lineSpacing,
    },
  );
}

// ---------- shared furniture ----------

/** A slide title, matching the reference: 20pt, not bold, navy. */
function title(slide, text, y, w = TITLE.w) {
  slide.addText(text, {
    x: TITLE.x,
    y,
    w,
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
