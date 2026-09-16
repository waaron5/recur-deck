// The deck's fixed design values. Type sizes and geometry live here because the
// workflow repairs overflow by shortening copy, never by shrinking type.

const SKILL_NAME = 'recur-sell-deck';

// Widescreen, matching the 1300 x 731 reference slides.
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

// Slides 1-3 are generated; slides 4-9 are the supplied Recur introduction.
const GENERATED_SLIDE_NUMBERS = [1, 2, 3];
const FIXED_SLIDE_NUMBERS = [4, 5, 6, 7, 8, 9];

// Arial is metric-compatible with Liberation Sans, which the sandbox renderer
// substitutes, so an in-run render predicts where PowerPoint breaks lines.
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
const THESIS_SECTIONS = [
  { label: "Why we're here", text: COLORS.navy, circle: COLORS.navy, numeral: COLORS.white },
  { label: "Why we're excited", text: COLORS.blue, circle: COLORS.cyan, numeral: COLORS.navy },
  { label: 'How we can help', text: COLORS.teal, circle: COLORS.teal, numeral: COLORS.white },
];

const CONFIDENTIAL_LINE = 'Recur Software Highly Confidential - Not for Distribution';

// Footer geometry, measured off the reference slides (1300 x 731 px, so
// 1 px = 0.01026 in) and identical on every reference slide that has a footer:
// the wordmark spans x 11.805-12.625in and the page number sits at x 12.923,
// both with their ink centred on y 7.100; the confidentiality line's ink runs
// y 7.326-7.408in, centred on the slide. Reference slide 3 has no footer at
// all, so the market map does not draw one.
const FOOTER = {
  wordmark: { x: 11.805, y: 7.018, w: 0.82, h: 0.164 },
  pageNumber: { x: 12.764, y: 6.95, w: 0.4, h: 0.3, fontSize: 16 },
  confidential: { y: 7.25, h: 0.25, fontSize: 7 },
};

// The visual bar puts the floor for body text at about 12pt.
const MIN_FONT_SIZE = 12;

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
  CONFIDENTIAL_LINE,
  FOOTER,
  MIN_FONT_SIZE,
  deckFileName,
  safeCompany,
};
