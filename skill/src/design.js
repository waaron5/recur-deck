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
  CONFIDENTIAL_LINE,
  FOOTER,
  MIN_FONT_SIZE,
  deckFileName,
  safeCompany,
};
