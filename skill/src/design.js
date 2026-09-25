// The deck's fixed design values. Type sizes and geometry live here because the
// workflow repairs overflow by shortening copy, never by shrinking type.
//
// All geometry is in the original deck's own units: 10 x 5.625in. Working in the
// original's coordinate system means every value measured off it transfers
// straight in, with no conversion step to get wrong.

const SKILL_NAME = 'recur-sell-deck';

// The original presentation's page size. The reference slides are 1300 x 731 px,
// so at this size they carry 130 px per inch.
const SLIDE_W = 10;
const SLIDE_H = 5.625;

// Slides 1-3 are generated; slides 4-9 are the supplied Recur introduction.
const GENERATED_SLIDE_NUMBERS = [1, 2, 3];
const FIXED_SLIDE_NUMBERS = [4, 5, 6, 7, 8, 9];

// The deck's typeface.
//
// Ticket 01 read "Noto Sans Arabic Light" off the source presentation, and that
// is the name the original carries. It cannot be the face that draws this deck:
// it has no Latin glyphs in any weight - no A-Z, no a-z - so it can set none of
// the English copy on slides 1-3. Something else drew that copy on every machine
// that has ever opened the reference, Recur's own included, and declaring a face
// that cannot render the deck left the choice of substitute to each machine.
//
// Which face actually sets the reference deck's Latin was settled by measuring
// it. Four strings, at four sizes across both weights, all land within 2% of
// Arial's advances, while Verdana runs 9% wide, Tahoma 4% narrow and Arial
// Narrow 18% narrow; scripts/derive-font-metrics.js records the samples. So the
// deck now declares the face it has always been set in.
//
// Naming Arial is also what makes the in-run render check worth running. Arial
// is metric-compatible with Liberation Sans, which is what the sandbox renderer
// substitutes, so a rendered image breaks its lines where PowerPoint will.
// Bundling the OFL Noto file, which ticket 01 left open to ticket 07, would not
// have bought that: the file has no Latin in it to draw.
const FONT = 'Arial';

const COLORS = {
  navy: '09142F',
  blue: '0E7896',
  teal: '009384',
  cyan: 'D0F6FF',
  band: 'E2EEF8',
  grey: '6B7280',
  rule: 'C9CED6',
  white: 'FFFFFF',
};

// The three thesis sections are fixed by the brief, each with its own colour:
// the section's text, its numbered circle, and the numeral inside that circle.
//
// The key is the section's role, and the research object is keyed by it rather
// than ordered as a list, because the roles cannot drift between sections.
//
// The teal circle's numeral is navy, not white. Measured off the reference:
// inside the teal disc sit 93 pixels of pure navy, against 108 for the navy
// numeral in the pale cyan disc beside it. A white numeral leaves none, which
// is what the navy disc in section one shows.
const THESIS_SECTIONS = [
  {
    key: 'here',
    label: "Why we're here",
    text: COLORS.navy,
    circle: COLORS.navy,
    numeral: COLORS.white,
  },
  {
    key: 'excited',
    label: "Why we're excited",
    text: COLORS.blue,
    circle: COLORS.cyan,
    numeral: COLORS.navy,
  },
  {
    key: 'help',
    label: 'How we can help',
    text: COLORS.teal,
    circle: COLORS.teal,
    numeral: COLORS.navy,
  },
];

// Slide 2's three rows, measured off the reference Slide2.png (1300 x 731px at
// 130 px/in). Row n sits at rowTop + n * rowPitch, and everything inside a row
// is an offset from that row's top.
//
// Type sizes come from measured cap heights through CAP_HEIGHT_EM, not from the
// prototype: the section header's caps run 0.146in, its bullets' 0.115in, and
// the numerals' 0.246in. The prototype set all three smaller.
//
// Each text box is centred on the ink the reference puts there, the same way
// the title's box is, so the measurement lands where it was taken from. The
// three rows agreed on these offsets to within 0.001in.
const THESIS_GEOMETRY = {
  rowTop: 1.5,
  rowPitch: 1.031,
  // The numbered disc, and the numeral centred inside it.
  circle: { x: 0.6, diameter: 0.465, fontSize: 25 },
  // The bold section label and the header share one line and one colour.
  header: { x: 1.4, w: 7.2, inkCentre: 0.127, boxHeight: 0.3, fontSize: 15 },
  // Two bullets, each its own line so each lands on its measured centre. The
  // square marker sits at the header's own left edge and the text indents to
  // 1.589in, which is 14pt of bullet indent.
  bullet: {
    x: 1.4,
    w: 7.2,
    inkCentre: 0.377,
    leading: 0.231,
    boxHeight: 0.25,
    fontSize: 11.5,
    indent: 14,
    square: '25AA',
  },
};

// Slide titles, read from the source presentation: 20pt, not bold, navy. The box
// is centred on the measured ink so the cap height lands where the reference
// puts it - y 0.707in on the thesis slide, 0.616in on the market map.
const TITLE = { x: 0.57, w: 8.8, h: 0.45, fontSize: 20, y: { thesis: 0.58, marketMap: 0.505 } };

// The cover, measured off the reference Slide1.png (1300 x 731 px at 130 px/in):
// the Recur wordmark's ink runs x 2.823-4.638in with a cap height of 0.400in
// centred on y 2.835; the divider sits at x 4.927 and runs y 2.508-3.108; the
// company name's ink runs x 5.323-8.146in, centred on y 2.808.
//
// The bundled wordmark PNG cannot match both of the reference's dimensions: its
// ink is 5.41 wide to 1 high, against the reference wordmark's 4.54, because it
// is tracked wider. Cap height and the right-hand edge are held to the
// reference, so the mark reaches further left than the original's does.
const COVER = {
  wordmark: { right: 4.638, capHeight: 0.4, centreY: 2.835 },
  divider: { x: 4.927, y: 2.508, h: 0.6, weight: 1 },
  // The company's name, set as type. This slot carries no logo: decision 01 of
  // the tightening map took the logo off the cover, because one large mark in
  // a 2.831in slot on a photograph is the thing the eye lands on and it fails
  // hard - wrong shape, wrong weight for a dark ground, or too coarse to scale
  // takes the whole cover with it. The same mark on slide 3 is one of nine and
  // fails softly, so slide 3 keeps its logos.
  //
  // What makes this read as the company's brand is the lettering convention,
  // not a licensed face: the reference sets "USFleetTracking" closed up with
  // internal capitals, and the run supplies that written form. Bold white at
  // the measured cap height is the whole treatment - no tracking, no two-tone
  // split, no invented case. Each of those was built and looked at on five real
  // companies first: tracking pulls the name toward RECUR's own tracked mark
  // across the divider, so the two read as one voice rather than as two parties,
  // and a second colour drops half the name to 5.20:1 over a bright photograph,
  // under the 5.83:1 COVER_PHOTO below exists to hold.
  //
  // The box is taller than the reference's ink so a long name wraps inside the
  // slot rather than shrinking below the type floor.
  //
  // The cap height is measured cap-top to baseline, which is not the same as
  // the ink: "USFleetTracking" has a descender, so its ink spans 0.354in while
  // the caps run y 2.638-2.900in. The reference deliberately sets the company
  // name smaller than RECUR's 0.400in.
  name: { left: 5.323, width: 2.831, centreY: 2.808, capHeight: 0.269, boxHeight: 0.9 },

  // Which characters a line of cover type may contain. Decision 01 lets the
  // written form restyle the given name's case, spacing and punctuation, and the
  // gate compares the two with everything but letters and digits removed - so
  // whatever sits *between* the letters was not merely permitted, it was
  // invisible. Measured September 25, 2026: a newline set the cover in two runs,
  // where ticket 02 settled that a box holding one line is the whole ceiling and
  // the fit check measures a single line's advances; a doubled space reached the
  // slide intact; and a U+0001 reached slide1.xml verbatim, which is not valid
  // XML 1.0 and makes a deck PowerPoint refuses to open.
  //
  // This is the cover's own rule rather than safeCompany's, which exists to keep
  // a name usable as a file name: a written form may legitimately hold a slash or
  // a colon, and the cover has no reason to refuse one. So the rule is only what
  // one line of type cannot carry.
  //
  // `space` is every run of whitespace, collapsed to one space, because a newline
  // is spacing and decision 01 already allows spacing to be restyled - a masthead
  // set across two lines becomes the one line the slot holds. `control` cannot be
  // restyled into anything, so the gate reports it instead.
  //
  // The two do not overlap: tab, line feed, vertical tab, form feed and carriage
  // return are control characters that are also whitespace, and they belong to
  // the rule that restyles rather than the one that refuses. What is left is a
  // character with no printable form and no spacing meaning, which is only ever
  // a mistake. Ticket 07 of the tightening map, amending decision 01.
  type: { space: /\s+/gu, control: /[\u0000-\u0008\u000E-\u001F\u007F-\u009F]/u },
};

// Slide 3, the market map.
//
// Two sources meet here, and which one owns a value matters. The ticket 10
// prototype was built on a 13.333 x 7.5in canvas while this deck's page is the
// original's 10 x 5.625in. Both are 16:9, so the same physical size is a
// different number of inches in each, and every value taken from the prototype
// is multiplied by 0.75 - the conversion MIN_FONT_SIZE already records.
//
// The band, the subtitle and the axis line's ends are measured off the
// reference Slide3.png (1300 x 731px at 130 px/in). The chart block - the plot's
// left edge, its labels, the logo box and the type scale - is the prototype's,
// scaled, because that is the composition the user reacted to. Taking the
// reference's own axis origin instead would leave a quadrant 2.20in wide, which
// is too narrow for the two 1.0875in logo boxes the crowding cap allows.
const MAP = {
  // Measured: the tinted band begins at y 1.7231in and runs to the foot of the
  // slide, behind everything except the callout sidebar.
  band: { top: 1.7231 },
  // Measured: the subtitle's ink is centred on y 1.2538in, left-aligned with
  // the title above it.
  subtitle: { centreY: 1.2538, boxHeight: 0.26, fontSize: 9.75 },
  // Decided in ticket 10: a full-height navy sidebar from x 9.45 of 13.333,
  // which is 7.0875in here. Its copy is inset by the same pad on both sides, so
  // the column reads as a column and not as a block of text.
  sidebar: { x: 7.0875, pad: 0.3375 },
  // The L-axes. The upright and the baseline are the reference's, measured; the
  // left edge is the prototype's 2.35 of 13.333. The reference's baseline runs
  // to x 7.7077in, which is under the decided sidebar, so it stops one pad short
  // of it instead.
  plot: { x: 1.7625, top: 1.9923, bottom: 4.7077, weight: 0.75 },
  // The placement area inside the axes, so no logo sits on a line. The
  // prototype's 0.2/0.1 and 0.12/0.12 insets, scaled.
  inset: { left: 0.15, right: 0.075, top: 0.09, bottom: 0.09 },
  // Axis labels. The category labels are the only bold type on the chart: they
  // are what the reader has to read. The axis names are quiet, uppercase and
  // tracked, which is the prototype's treatment rather than the reference's.
  label: {
    gutter: { x: 0.375, gap: 0.15 },
    // Measured: the x categories' first line sits 0.196in below the baseline,
    // which is this gap above a 7.875pt line.
    category: { fontSize: 7.875, boxHeight: 0.36, gap: 0.105 },
    // Measured: the vertical axis's name is centred 0.119in below the top of
    // the upright, inside the chart rather than above it. The horizontal one
    // cannot follow the reference, which sets it beside the baseline's right
    // end, because the sidebar now stands there; it goes under the categories.
    name: { fontSize: 6, boxHeight: 0.16, tracking: 0.75, insetY: 0.119, gap: 0.44 },
  },
  // The callout, in white on the navy sidebar.
  callout: {
    top: 1.5375,
    height: 3.3,
    fontSize: 8.625,
    spaceAfter: 7.5,
    lineSpacing: 1.15,
    indent: 10.5,
  },
  // A logo box on the map, sized to an equal optical area rather than to a
  // uniform width, so a wide wordmark and a square mark carry the same visual
  // weight. Below the minimum height a company becomes a text wordmark.
  slot: { area: 0.1406, maxWidth: 1.0875, maxHeight: 0.315, minHeight: 0.105 },
  // A company whose logo cannot be placed is set as type, navy on the band. Its
  // box grows with the name's length, up to the slot's own maximum width.
  wordmark: { fontSize: 8.25, charWidth: 0.06375, pad: 0.075, height: 0.18 },
  // The least air between two logo boxes after the nudge.
  gap: 0.15,
  // The target, and nothing else, gets a white pill with a thin teal outline.
  // The outline's weight is the decided 1.25pt: a hairline is a hairline at
  // either page size, so it is one of the few values that does not scale.
  target: { padX: 0.0975, padY: 0.075, radius: 0.045, outline: 1.25 },
};

// Derived from MAP, once. The market-map slide draws with these and the content
// gate measures against them, and a value derived twice is a value that drifts.
const MAP_LAYOUT = {
  // Where the baseline stops. The reference runs it under the sidebar the
  // callout now occupies, so it stops one inset short of it.
  axisEnd: MAP.sidebar.x - MAP.sidebar.pad,
  // The copy column: the title and subtitle run from the left margin to the
  // sidebar, so a long company name wraps rather than running underneath it.
  column: MAP.sidebar.x - MAP.sidebar.pad - TITLE.x,
  // The gutter the vertical axis's labels sit in, left of the plot.
  gutter: MAP.plot.x - MAP.label.gutter.gap - MAP.label.gutter.x,
  // The callout's own column, inset by the same pad on both sides of the
  // sidebar so it reads as a column and not as a block of text.
  calloutWidth: SLIDE_W - MAP.sidebar.x - 2 * MAP.sidebar.pad,
};

// Cap height as a fraction of the type size, for this typeface. Established in
// ticket 01 by measuring the reference slides: 20pt titles measure 0.197in of
// cap on this page size.
//
// Arial's own OS/2 table says 0.7163 em, which is 1.4% above this. The measured
// value is kept: it is what the reference actually shows, the geometry built on
// it was matched to the reference the same way, and 1.4% of a 20pt cap is
// 0.003in. Ticket 07's font decision does not disturb it, which is the point of
// recording where each number came from.
const CAP_HEIGHT_EM = 0.706;

// Average character width, as a fraction of the type size, for this typeface
// set bold. Measured off the reference cover rather than estimated: its
// "USFleetTracking" fills 2.831in with 15 characters at a 0.269in cap height,
// which is 27.4pt, so each character averages 0.495 of the type size.
const CHAR_WIDTH_EM = 0.495;

const CONFIDENTIAL_LINE = 'Recur Software Highly Confidential - Not for Distribution';

// Footer geometry, measured off the reference slides (1300 x 731 px at 130 px/in)
// and identical on every reference slide that has a footer: the wordmark spans
// x 8.854-9.469in and the page number sits at x 9.692, both with their ink
// centred on y 5.325; the confidentiality line's ink runs y 5.495-5.556in,
// centred on the slide. Reference slide 3 has no footer at all, so the market
// map does not draw one.
const FOOTER = {
  wordmark: { x: 8.854, y: 5.264, w: 0.615, h: 0.123 },
  pageNumber: { x: 9.573, y: 5.213, w: 0.3, h: 0.225, fontSize: 12 },
  confidential: { y: 5.438, h: 0.188, fontSize: 5.25 },
};

// The visual bar's floor for native text is about 12pt on a 13.333in-wide slide.
// In the original's 10in units that same physical size is 9pt.
const MIN_FONT_SIZE = 9;

// The cover photo's treatment, set by the user's reaction to the prototype:
// take most of the colour out and apply a stronger, premium blue filter, so the
// wordmarks stand out and the city reads cleanly.
//
// What these values hold is a contrast floor, not a tone. The reference cover's
// ground, with its white type masked out, measures 101 of 255 at the 90th
// percentile of the band the wordmarks sit in: white type at 5.83:1. Every
// photograph has to clear that, whatever it arrived as.
const COVER_PHOTO = {
  // The dark and light ends of the duotone ramp. The shadow is the deck's navy;
  // the highlight is a cool blue rather than white, so a bright sky keeps the
  // same cast as the rest of the photo.
  shadow: { r: 0x09, g: 0x14, b: 0x2f },
  // The highlight is 65% of the pale blue it began as, C8DCF0, because that
  // value carried no target: on three real Commons photos the marks' band ran
  // from 3.35:1 on a bright landmark to 9.20:1 on a dark skyline. At 65% the
  // worst of the three clears the reference at 5.90:1. Lowering this end rather
  // than exposure compresses the bright end and leaves the shadows where they
  // are, so a dark photograph does not turn to mud.
  //
  // Rejected: measuring each photograph at run time and correcting it onto the
  // reference's band. It matched the reference on every cover, and the user
  // chose one fixed value over it for run time. The cost is that a typical
  // cover sits deeper than the reference: a real skyline now lands at a
  // whole-slide mean of about 57, against the reference's 77.8.
  highlight: { r: 0x82, g: 0x8f, b: 0x9c },
  // How much of the photo's own colour survives: 0 is a pure two-colour image,
  // 1 is the untouched photo. Enough to keep a city legible, not enough to
  // bring the untidy colour back.
  colourKept: 0.16,
  // The whole ground is pulled down so the white wordmarks carry the slide.
  // A multiplier, so it keeps whatever brightness a photograph arrived with;
  // the highlight above is what holds the floor.
  exposure: 0.64,
  // Where the 16:9 window sits vertically: 0 keeps the top of the photo, 1 the
  // bottom. Skylines want more sky than foreground.
  cropBias: 0.35,
  quality: 86,
};

// The resolution rule, set by the user's reaction to the prototype: never
// enlarge a logo past the size at which it still looks sharp, because an
// upscaled mark is "an instant signal of lack of care". Pixels per inch of
// placed width; 150 is the starting threshold, to be tuned in the release runs.
//
// This threshold used to be justified by what it did on two slots at once: US
// Fleet Tracking's 258 x 27px mark stays sharp to 1.72in wide, which was too
// short for the cover's slot and tall enough for the map's, so one rule gave
// both decisions 06 and 10 the outcome they asked for. Decision 01 of the
// tightening map took the logo off the cover, so that argument is gone and
// only the map's half of it is left: this now decides, for one of nine small
// marks on slide 3, whether it is placed or set as type. Nothing else reads
// it. What the release runs have to check has narrowed to match - a map mark
// that reads soft at 150, or a clean one needlessly dropped to type.
//
// The background-fit thresholds that used to sit beside it went with the same
// decision. They asked whether a mark suited a dark ground and whether it could
// be whitened, and the map's pale band - now the only ground a logo lands on -
// takes every company's own version exactly as it is.
const LOGO = { sharpPixelsPerInch: 150 };

// The in-run render check. Slides 1-3 are rasterised for the model to look at
// before the deck is handed over.
//
// 150 px/in makes a 1500 x 844px image of this 10in page, which is enough to
// read 9pt type and see a logo sitting on a line.
//
// The timeout is a bound on a converter that hangs rather than an expected
// duration: the capability probe in decision 09 measured this whole step at
// about 2 seconds. It was two minutes, and the September 2026 run showed what
// that costs - a sandbox whose converter hung twice spent four of the run's
// fifteen minutes and bought no image either time. Thirty seconds is still
// fifteen times the measurement, with room for a cold LibreOffice first start.
// Decision 03 of the tightening map.
//
// That room was then measured on the supported host rather than left as an
// allowance: the same deck converts in about 3 seconds on a run's first render
// and about 1 on its second, so building the private profile costs about two
// seconds and the bound has ten times the headroom it needs. What hung that run
// was never a slow start - it was a malformed profile URL, which render.js now
// builds rather than concatenates.
//
// It bounds each converter, not the step, so the arithmetic worth having is the
// worst case rather than the bound: soffice hanging costs 30s, and soffice
// finishing while pdftoppm hangs costs 60s. Against blindRenders of 2 that is 1-2
// minutes for a sandbox that cannot render, where the old bound cost 2-4.
const RENDER = { dpi: 150, timeoutMs: 30000 };

// Stage 0's probe: one request to a non-package host, before a run spends
// anything on research.
//
// The sandbox ships with its domain allowlist set to "Package managers only",
// and under that setting every fetch a run makes fails. Without this the run
// finds that out after identifying the company and writing a thesis, which
// spends most of a fifteen-minute budget to arrive at nothing.
//
// The probe asks Commons rather than a generic canary host, because Commons is
// where the cover photo comes from: probing the real dependency answers the
// question a run actually has. siteinfo is the cheapest thing the API will
// answer, and the answer's contents are never read - only that one came back.
const PREFLIGHT = {
  probe: 'https://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&format=json',
  // A refused domain usually fails fast, but a connection that hangs is the
  // same problem wearing a different coat, and node's fetch has no timeout of
  // its own. Without a bound the cheapest stage in the run becomes the longest
  // one. Eight seconds is far longer than Commons needs and far shorter than a
  // run can afford to wait to be told it cannot start.
  timeoutMs: 8000,
};

// The repair budget, from decision 07.
//
// Three content rounds and two render rounds, and no new round once the run is
// about twelve minutes old. The rounds bound how many times a run may rewrite
// its way out of trouble; the cutoff bounds what happens when each round is
// individually cheap but the run as a whole is running out of its fifteen
// minutes. Both are needed: three rounds of a slow research pass can outlast the
// limit on their own.
//
// The cutoff is deliberately short of fifteen. A round that starts at twelve
// still has to finish a rewrite, a build and a render, and a run that overruns
// has failed whatever it was going to produce.
// Two different limits, and they are not the same kind of thing.
//
// `cutoffMs` bounds the run from inside: decision 07 starts no new repair round
// after about twelve minutes, which is what keeps a run inside the limit below.
//
// `typicalMs` and `limitMs` are decision 04's judging bar - "typical run of 10
// minutes or less; a run over 15 minutes fails" - and they are here as numbers
// rather than as prose in a ticket because ticket 09 judges every practice run
// against them. A bar left in a comment is one the judging has to remember.
//
// So the three are not enforced in the same place, and that is worth knowing
// before changing one: the run itself enforces `rounds` and `cutoffMs`, while
// nothing in a run reads `typicalMs` or `limitMs` - they are read by the
// judging pass afterwards. They live together anyway because `cutoffMs` is
// derived from `limitMs`: twelve minutes is where a new round stops being able
// to finish inside fifteen. Splitting them would leave a number in one file and
// its reason in another.
const RUN_BUDGET = {
  rounds: { content: 3, render: 2 },
  // How many renders that answered nothing a run will sit through before it
  // stops asking. These are not repair rounds and are not charged as ones: a
  // round bounds rewriting, and a render with no image to show gave the model
  // nothing to rewrite from. What still has to be bounded is the waiting, so
  // that a sandbox which simply cannot render costs a minute rather than the
  // run. Two, matching the render rounds, because a converter that failed twice
  // is not going to succeed on the third ask. Decision 03 of the tightening map.
  blindRenders: 2,
  cutoffMs: 12 * 60 * 1000,
  typicalMs: 10 * 60 * 1000,
  limitMs: 15 * 60 * 1000,
};

// Logos arrive as SVG and WebP, which PptxGenJS cannot place. Both are
// converted by WebAssembly rasterizers carried inside the package, because the
// skill installs as one bundled script with no package installs at run time.
// These are their file names beside the deck's other assets.
const RASTERIZER_ASSETS = { svg: 'resvg.wasm', webp: 'webp-dec.wasm' };

/**
 * What the deck is called when it is handed over.
 *
 * A flagged deck - one whose critical defects outlived the repair budget - is
 * still delivered, because decision 07 hands over the deck and the list of what
 * is wrong with it rather than nothing at all. The warning goes in the file name
 * because the name is the part of a run that survives being forwarded: a reply
 * gets skimmed and a chat gets closed, while the file travels on by itself to
 * whoever is going to mail it.
 *
 * @param {string} company
 * @param {{flagged?: boolean}} [options]
 * @returns {string}
 */
function deckFileName(company, { flagged = false } = {}) {
  return `Recur x ${safeCompany(company)}${flagged ? ' - NOT READY' : ''}.pptx`;
}

/** Keep a company name usable as a file name without rewriting how it reads. */
function safeCompany(company) {
  return String(company)
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  SKILL_NAME,
  SLIDE_W,
  SLIDE_H,
  GENERATED_SLIDE_NUMBERS,
  FIXED_SLIDE_NUMBERS,
  FONT,
  COLORS,
  THESIS_SECTIONS,
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
  COVER_PHOTO,
  LOGO,
  RENDER,
  PREFLIGHT,
  RUN_BUDGET,
  RASTERIZER_ASSETS,
  deckFileName,
  safeCompany,
};
