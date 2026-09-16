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

// The original deck's typeface, read from the source presentation. It is not an
// OS default on macOS or Windows, so PowerPoint substitutes it on machines that
// lack it; Recur has it and prints the mailers. Note this also means the sandbox
// renderer substitutes during the in-run render check, so predicted line breaks
// are approximate until the font ships inside the skill (ticket 07).
const FONT = 'Noto Sans Arabic Light';

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
const THESIS_SECTIONS = [
  { label: "Why we're here", text: COLORS.navy, circle: COLORS.navy, numeral: COLORS.white },
  { label: "Why we're excited", text: COLORS.blue, circle: COLORS.cyan, numeral: COLORS.navy },
  { label: 'How we can help', text: COLORS.teal, circle: COLORS.teal, numeral: COLORS.white },
];

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
  // The name is a text wordmark until the logo pipeline lands in ticket 03. Its
  // box is taller than the reference's ink so a long name wraps inside the slot
  // rather than shrinking below the type floor.
  //
  // The cap height is measured cap-top to baseline, which is not the same as
  // the ink: "USFleetTracking" has a descender, so its ink spans 0.354in while
  // the caps run y 2.638-2.900in. The reference deliberately sets the company
  // name smaller than RECUR's 0.400in.
  name: { left: 5.323, width: 2.831, centreY: 2.808, capHeight: 0.269, boxHeight: 0.9 },
};

// Cap height as a fraction of the type size, for this typeface. Established in
// ticket 01 by reading the source presentation: 20pt titles measure 0.263in.
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
// The reference cover's own ground measures a mean luminance of about 77 of 255
// at a mean saturation of 0.19, which is the neighbourhood these values aim at.
const COVER_PHOTO = {
  // The dark and light ends of the duotone ramp. The shadow is the deck's navy;
  // the highlight is a cool pale blue rather than white, so a bright sky keeps
  // the same cast as the rest of the photo.
  shadow: { r: 0x09, g: 0x14, b: 0x2f },
  highlight: { r: 0xc8, g: 0xdc, b: 0xf0 },
  // How much of the photo's own colour survives: 0 is a pure two-colour image,
  // 1 is the untouched photo. Enough to keep a city legible, not enough to
  // bring the untidy colour back.
  colourKept: 0.16,
  // The whole ground is pulled down so the white wordmarks carry the slide.
  // Tuned against the reference rather than by eye: at this value a real 1920px
  // Commons skyline lands at a mean luminance of about 77 of 255, which is what
  // the reference cover's own ground measures.
  exposure: 0.64,
  // Where the 16:9 window sits vertically: 0 keeps the top of the photo, 1 the
  // bottom. Skylines want more sky than foreground.
  cropBias: 0.35,
  quality: 86,
};

/** The clean-deck file name. A flagged deck adds "- NOT READY" (ticket 08). */
function deckFileName(company) {
  return `Recur x ${safeCompany(company)}.pptx`;
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
  TITLE,
  COVER,
  CAP_HEIGHT_EM,
  CHAR_WIDTH_EM,
  CONFIDENTIAL_LINE,
  FOOTER,
  MIN_FONT_SIZE,
  COVER_PHOTO,
  deckFileName,
  safeCompany,
};
