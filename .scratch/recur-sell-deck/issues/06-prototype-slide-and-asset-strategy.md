# Choose the slide layouts and asset strategy through a rough prototype

Parent: [Plan a one-prompt Recur sell-deck workflow](../map.md)
Type: prototype
Labels: wayfinder:prototype
Mode: HITL
Status: resolved
Assignee: aaronwood
Blocked by: 02, 03, 04, 05, 09

## Question

What reusable layout and asset strategy produces a professional, directionally similar result from the available PNG reference? Use a cheap three-slide prototype for a live visual reaction to settle text density, logo legibility, map readability, landmark treatment, and first-three-slide editability. Decide how to reuse the six fixed PNGs and which rendering approach fits the supported host. Include an approach for acquiring genuine company logos and headquarters-related landmark images. Link prototype assets; do not mistake the prototype for the final submission deck.

Constraints from [Define the evidence and investment judgment behind each pitch](05-define-investment-judgment.md): headers ≤ 12 words and bullets ≤ 14 words; 6–9 competitors plus the target on two categorical axes; a callout of "Our take" plus 2 dynamics bullets and 1 underlined proposal bullet; the source record lives in the speaker notes of slides 1–3, so the chosen rendering approach must write notes.

Constraints from [Verify the selected account's execution and file capabilities](09-verify-account-capabilities.md):
- **Rendering:** an in-run render → view → repair loop is available. LibreOffice and pdftoppm render in about 2 seconds, and the model can view the slide PNGs. Rendering substitutes Liberation and Carlito fonts.
- **Logo formats:** logos arrive in formats PptxGenJS cannot place (WebP, possibly SVG), and the favicon fallback is only 32 px. The asset approach must either convert or fall back to a text wordmark.
- **Logo discovery:** logo URLs came from fetching the site HTML inside the sandbox, not from web-fetch text.
- **Landmark images:** Wikimedia thumbnails come in standard widths (1280 and 1920 px worked).
- **Egress:** every asset download requires the All domains allowlist.

## Prototype

Throwaway assets, captured on branch `prototype/06-slide-layouts` (commit d507faa) and still present locally in [06-slide-prototype](../assets/06-slide-prototype/). Open `viewer.html` (←/→ switches variants A/B/C) or `out/prototype-{A,B,C}.pptx` in PowerPoint. Generator: `build-prototype.js`; logo discovery trial: `discover-logos.js`. Copy is illustrative and unverified. This is not the submission deck.

### Reactions recorded September 15, 2026 (live, from the user)

**Picks.** Slide 1: variant A. Slide 2: variant A. Slide 3: B's navy full-height callout sidebar, with the chart from A or C (undecided; B's crossing-axes chart "looks like someone threw up a bunch of logos"). No further slide 3 iteration for now.

**Standing design preference.** Strong preference for negative space so the viewer can breathe, without overdoing it. Bold, large text is reserved for what absolutely must be read.

**Notes to carry into the build.**

1. *Slides 2 and 3:* overall text is too large and overwhelming. Reduce type sizes and add some negative space for a more premium feel.
2. *Slide 1 background:* the photo's colour looks untidy. Take most of the colour out and apply a stronger, premium blue filter so the logos stand out and the city reads cleaner.
3. *Target logo on slide 1:* the upscaled 265 px US Fleet Tracking logo looks low quality, "an instant signal of lack of care." Rule: never enlarge a logo past the size at which it still looks sharp. If that maximum size is still too small for its slot, use a text wordmark instead. The Recur wordmark is good as rendered.

## Answer

Resolved September 15, 2026, through the user's live reaction to the three-variant prototype. The slide 3 chart treatment was split off into [Choose the market-map chart treatment](10-prototype-market-map-chart.md).

**Layouts**

- **Slide 1, cover (variant A):** The landmark fills the slide under a strong navy duotone. The photo is largely desaturated, then tinted a premium blue so the city reads cleanly and the logos stand out. The white Recur wordmark, a thin white divider, and the target's logo sit centred.
- **Slide 2, thesis (variant A):** The title sits above three stacked rows. Each row has a numbered circle (navy, pale cyan, then teal), the bold section label and header on one line, and two square bullets in the section colour. The footer carries the confidentiality line, the Recur wordmark, and the page number.
- **Slide 3, market map:** The title and subtitle sit on the left. The callout fills a full-height navy sidebar on the right, in white text: "Our take:", two dynamics bullets, then one underlined proposal bullet. The chart treatment is decided in ticket 10.
- **Density (slides 2 and 3):** Type sizes are smaller than in the prototype, with more negative space, but not overdone. Bold, large type is reserved for text that must be read, such as the title and section headers. Slide 2 sizes are set during the build against the render; slide 3 sizes are set in ticket 10.

**Rendering approach.** PptxGenJS 4.0.1, already proven in the sandbox, ships bundled into a single script. Slides 1–3 use native, editable text and shapes in Arial. Arial is metric-compatible with the sandbox's Liberation Sans, so the in-run render predicts PowerPoint's line breaks. Logos and the landmark are PNG or JPEG images. Speaker notes on slides 1–3 carry the source record. Slides 4–9 are the six bundled reference PNGs (1300 × 731 px), placed full-bleed; they are not editable, which the brief permits. Every run renders slides 1–3 with LibreOffice and inspects the images before delivery.

**Recur wordmark.** Recur's own site sets its name as live text in Work Sans Light with 0.15em tracking. The package ships that wordmark prerendered as transparent PNGs, one white and one navy (1769 × 327 px). It never depends on the font being installed.

**Logo acquisition** for the target and each competitor, run inside the sandbox from the company's own site:

1. **Candidates**, in this order: the first `<svg>` or `<img>` inside the site's home link. Then `<img>` tags that mention "logo", ranked by header position, with customer, partner, and award logos excluded. Then CSS `content` or `background` logo URLs. Last, `og:image` or the apple-touch-icon.
2. **Normalise** each candidate to a trimmed, transparent PNG. SVG goes through a bundled WASM rasterizer (resvg), after stripping bare HTML attributes and resolving `currentColor`. WebP is converted in the sandbox, with Python PIL as the planned route. The first build must verify this; if conversion fails, use the text wordmark.
3. **Identity check.** The model views every normalised logo and confirms it is that company's current logo. In the prototype trial, the first heuristic picked another company's logo on 3 of 10 sites, and a product sub-brand (ServApp) rather than the company logo on 1.
4. **Background fit.** Use the version the company designed for that background, never a whole-logo recolour, which ruined US Fleet Tracking's multicolour flag mark. On the dark cover, use the site's own light-on-dark logo. A single-colour logo may be whitened through its alpha channel. Otherwise, fall back to the text wordmark.
5. **Resolution rule (user).** Never enlarge a logo past the size at which it still looks sharp. Place it at the smaller of its slot size and that sharp maximum. The default threshold is 150 px per inch of placed width, to be tuned during the release runs. If the sharp maximum falls below the slot's minimum legible size, set a text wordmark instead. Under this rule, US Fleet Tracking's 265 px logo becomes a text wordmark on the cover.

**Text wordmark.** The company name in Arial bold, sized to the slot height: white on the cover, navy on light slides.

**Landmark.** The HQ city comes from the official site, per [Define the evidence and investment judgment behind each pitch](05-define-investment-judgment.md). The landmark is a Wikimedia Commons photo of a recognisable landmark or skyline in that city, found through the Commons API. Download a 1920 px thumbnail, falling back to 1280 px, then crop to 16:9 and apply the navy duotone. The file name, author, and licence go only in slide 1's speaker notes, never on the slide.

**Evidence.** The prototype is captured on the throwaway branch `prototype/06-slide-layouts`, under `.scratch/recur-sell-deck/assets/06-slide-prototype/`. It holds the generator, the logo discovery trial, the viewer, three decks, and their renders. Its copy is illustrative and unverified.
