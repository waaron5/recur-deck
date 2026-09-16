# 03: Logo acquisition pipeline

**What to build:** Real company logos, acquired from the company's own site, appear on the deck. A run fetches the site's HTML inside the sandbox with a Chrome user-agent, picks logo candidates in a fixed order (the mark inside the home link, then `logo`-ish images ranked by header position with customer, partner, and award logos excluded, then CSS logo URLs, then the social image or touch icon), normalises the winner to a trimmed transparent PNG, and shows it to the model, which confirms it is that company's current logo and not a customer's, a partner's, or a product sub-brand's.

Two rules then decide whether the image is used at all. Background fit: use the version the company designed for that background, never a whole-logo recolour; a single-colour mark may be whitened through its alpha channel. Resolution: never enlarge a logo past the size at which it stays sharp, so a logo is placed at the smaller of its slot size and its sharp maximum, and a logo whose sharp maximum falls below its slot's legible minimum becomes a text wordmark instead. Every step ends in a text wordmark rather than a missing or broken image.

The cover is where this is demonstrated: the target's logo replaces the text wordmark from ticket 02 when it is verified, sharp, and right for a dark background. The pipeline is written to serve the market map too, which places many logos at much smaller sizes.

Format conversion is the known risk. Logos arrive as SVG and WebP, which the deck generator cannot place directly; SVG goes through a bundled rasterizer and WebP is converted in the sandbox. Whether conversion works there is unverified, and this ticket settles it. If a format cannot be converted, that company gets a text wordmark.

Decisions this implements: the logo acquisition ladder, background-fit rule, resolution rule, and text wordmark definition in [Choose the slide layouts and asset strategy](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md).

**Blocked by:** 02 (Cover slide with a real headquarters landmark).

**Status:** ready-for-agent

- [ ] Across the ten logo-trial companies, each run either places that company's own current logo or falls back to a text wordmark; it never places another company's logo.
- [ ] SVG and WebP logos are converted to placeable transparent PNGs, or the company falls back to a text wordmark with the reason recorded.
- [ ] The model's identity check runs on every normalised logo before it reaches a slide.
- [ ] No logo is enlarged past its sharp maximum, and aspect ratio is always preserved.
- [ ] On the dark cover, the logo used is one designed for a dark background, or a whitened single-colour mark, or a text wordmark — never a recoloured multicolour mark.
- [ ] US Fleet Tracking's low-resolution logo resolves to a text wordmark on the cover, as the resolution rule requires.
- [ ] Slide 1's speaker notes record where the logo came from.
