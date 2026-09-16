# Visual rules

The fixed design values for a Recur sell deck. Content changes between runs;
none of this does.

## Page

Widescreen, 13.333 x 7.5 inches, matching the supplied reference slides
(1300 x 731 px, about 97 px per inch at full width).

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

Arial throughout. Arial is metric-compatible with Liberation Sans, which the
sandbox renderer substitutes, so a rendered slide predicts where PowerPoint
breaks lines.

Body text never goes below about 12pt. **Type sizes are fixed design values:
text that does not fit gets shorter, it never gets smaller.**

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

A **text wordmark** — the company name set in Arial bold, sized to its slot,
white on the cover and navy on light slides — is the terminal fallback whenever a
logo image cannot be verified, converted, or kept sharp. A broken image or an
empty slot is never acceptable. Never enlarge a logo past the size at which it
still looks sharp.

## Footer

Slide 2 carries the confidentiality line centred across the slide, the navy
Recur wordmark at the right, and the page number beside it.

Positions are measured from the reference slides, not guessed: the wordmark
spans x 11.805-12.625in and the page number sits at x 12.923, both with their
ink centred on y 7.100; the confidentiality line's ink runs y 7.326-7.408in.

The cover and the market map carry **no footer** — the reference market map has
no confidentiality line, wordmark or page number, and reads less cluttered
without them.

## Speaker notes

Slides 1-3 carry the run's source record: how the company was identified, the
headquarters city and its source, the landmark photo's credit and licence, the
source behind every thesis bullet, and the reasoning behind every competitor,
axis, and placement. None of it appears on a visible slide.
