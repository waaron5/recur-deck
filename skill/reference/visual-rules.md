# Visual rules

The fixed design values for a Recur sell deck. Content changes between runs;
none of this does.

## Page

10 x 5.625in, which is the original presentation's own page size. Working in the
original's units means every value measured off it transfers straight in.

The reference slides are 1300 x 731 px, so at this size they carry 130 px per
inch.

## Slide inventory

| Slides | What they are | Editable |
| --- | --- | --- |
| 1 | Cover: headquarters landmark, Recur wordmark, target company | yes, native text and shapes |
| 2 | Thesis: three fixed sections, each a header and two bullets | yes |
| 3 | Market map: axes, subtitle, competitor logos, callout | yes |
| 4-9 | Recur's introduction, supplied as fixed PNGs | no, placed full-bleed |

The three thesis sections are always, in order: "Why we're here", "Why we're
excited", "How we can help".

## Type

**Noto Sans Arabic Light**, the original deck's typeface, read from the source
presentation.

Slide titles are **20pt, not bold**, in navy, matching the reference exactly.

Body text never goes below about 9pt, which is the visual bar's 12pt floor
expressed in these 10-inch units. **Type sizes are fixed design values: text
that does not fit gets shorter, it never gets smaller.**

Noto Sans Arabic Light is not an OS default on macOS or Windows. Recur has it
and prints the mailers, so the deck renders correctly where it matters, but
PowerPoint substitutes it on machines that lack it. The sandbox renderer also
lacks it, so the in-run render check predicts line breaks only approximately
until the font ships inside the skill.

## Cover

The headquarters landmark fills the slide, under the deck's navy duotone. Over
it sit the Recur wordmark, a thin white divider, and the target company.

**The photo** comes from Wikimedia Commons, searched for the headquarters city
and filtered to JPEG files over 1600px, then downloaded at 1920px wide. JPEG is
deliberate: the treatment runs on a bundled JavaScript codec, because the skill
ships as one script with no package installs at run time.

**The treatment** crops to the slide's 16:9, sitting high in the frame because a
skyline wants more sky than foreground, then maps every pixel onto one navy-to-
pale-blue ramp, returns 16% of the photo's own colour, and pulls the whole
ground down. Measured: a real Commons skyline lands at a mean luminance of about
77 of 255, which is what the reference cover's own ground measures, and its hue
concentration goes from 0.42 to 0.99 - one ramp, not a dimmed photograph.

**Geometry**, measured off the reference cover (1300 x 731px at 130 px/in):

| Element | Where |
| --- | --- |
| Recur wordmark ink | right edge x 4.638in, cap height 0.400in, centred on y 2.835in |
| Divider | x 4.927in, running y 2.508-3.108in |
| Company name ink | from x 5.323in, 2.831in wide, centred on y 2.808in |

The bundled wordmark PNG cannot match both of the reference's dimensions: its
ink is 5.41 wide to 1 high against the reference wordmark's 4.54, because it is
tracked wider. Cap height and the right-hand edge are held to the reference, so
the mark reaches further left than the original's does.

Nothing about the photo's credit, licence or source appears on the slide. It
goes in slide 1's speaker notes.

## Palette

| Name | Hex | Used for |
| --- | --- | --- |
| Navy | `09142F` | Titles, cover ground, callout sidebar |
| Blue | `0E7896` | Thesis section two |
| Teal | `009384` | Thesis section three, target highlight |
| Pale cyan | `D0F6FF` | Thesis section two circle |
| Band | `E2EEF8` | Market map ground |
| Grey | `6B7280` | Footer, secondary labels |
| Rule | `C9CED6` | Hairlines and dividers |

## Wordmarks

The Recur wordmark ships prerendered as transparent PNGs, white and navy, and is
placed as an image. It never depends on a font being installed.

A **text wordmark** - the company name set bold, sized to its slot, white on the
cover and navy on light slides - is the terminal fallback whenever a logo image
cannot be verified, converted, or kept sharp. A broken image or an empty slot is
never acceptable. Never enlarge a logo past the size at which it still looks
sharp.

## Footer

Slide 2 carries the confidentiality line centred across the slide, the navy
Recur wordmark at the right, and the page number beside it.

Positions are measured from the reference slides, not guessed: the wordmark
spans x 8.854-9.469in and the page number sits at x 9.692, both with their ink
centred on y 5.325; the confidentiality line's ink runs y 5.495-5.556in.

The cover and the market map carry **no footer** - the reference market map has
no confidentiality line, wordmark or page number, and reads less cluttered
without them.

## Speaker notes

Slides 1-3 carry the run's source record: how the company was identified, the
headquarters city and its source, the landmark photo's credit and licence, the
source behind every thesis bullet, and the reasoning behind every competitor,
axis, and placement. None of it appears on a visible slide.
