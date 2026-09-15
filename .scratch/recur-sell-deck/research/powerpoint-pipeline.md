# PowerPoint generation and verification options

Research date: September 15, 2026. Scope: planning evidence, not an implementation or proof of successful rendering.

## Recommendation

Either python-pptx or PptxGenJS can express the requested deck. Choose the one that already runs in the selected AI environment; do not introduce a second runtime solely for generation. Use fixed layouts with bounded content for slides 1–3 and embed the supplied six PNGs for slides 4–9. Rendering availability, fonts, asset downloads, and the meaning of first-try success are the consequential open decisions.

## Generation options

| Option | Documented capabilities | Setup implications |
| --- | --- | --- |
| python-pptx | Creates, reads, and updates PPTX; native text boxes, auto-shapes, pictures, explicit coordinates and sizes. Text can remain editable. | Python package; source metadata currently requires Python >=3.8 and depends on Pillow, lxml, XlsxWriter, and typing_extensions. Prefer an environment with these installed or a verified package installation path. |
| PptxGenJS | Native text and shapes; PNG/JPEG images from local paths or base64; explicit positioning; standard and custom slide sizes; npm and browser installation options. Text can remain editable. | JavaScript runtime or browser bundle. Source manifest lists jszip and image-size among runtime dependencies. Browser support does not establish availability inside any particular AI product. |

Sources: [python-pptx shape API](https://python-pptx.readthedocs.io/en/latest/api/shapes.html), [python-pptx project metadata](https://raw.githubusercontent.com/scanny/python-pptx/master/pyproject.toml), [PptxGenJS text](https://gitbrent.github.io/PptxGenJS/docs/api-text/), [shapes](https://gitbrent.github.io/PptxGenJS/docs/shapes-and-schemes/), [images](https://gitbrent.github.io/PptxGenJS/docs/api-images/), [slide layouts](https://gitbrent.github.io/PptxGenJS/docs/usage-pres-options/), [installation](https://gitbrent.github.io/PptxGenJS/docs/installation/), and [package manifest](https://raw.githubusercontent.com/gitbrent/PptxGenJS/master/package.json).

Implementation inference: the market map requires positioned logos and labels, not an Excel-backed chart. Both libraries supply the underlying text, line/shape, and image primitives. Keeping the first three slides native is feasible; image-only slides 4–9 preserve their supplied appearance but do not restore editable text.

## Fonts and image handling

- python-pptx exposes explicit font settings, wrapping, and a fit_text operation using a matching installed TrueType font or supplied font path. That measurement dependency matters in restricted containers. Setting a font name alone does not ensure the viewer has it. [Text API](https://python-pptx.readthedocs.io/en/latest/api/text.html)
- PptxGenJS provides font, size, spacing, wrapping, and fit settings. These are layout controls, not evidence that the final slide has rendered cleanly. [Text options](https://gitbrent.github.io/PptxGenJS/docs/api-text/)
- PNG/JPEG assets avoid introducing SVG rendering/conversion uncertainty; PptxGenJS documents SVG compatibility limits and image containment/cropping options. Recommendation: normalize acquired logos to transparent PNG before placement and preserve their aspect ratios. Asset acquisition itself still depends on the selected host. [Image API](https://gitbrent.github.io/PptxGenJS/docs/api-images/)
- Recommendation: select a font available in both the generation/render environment and recipient PowerPoint; set minimum readable sizes and shorten generated copy instead of trusting unlimited shrinking.

## Verification is three separate layers

1. **Content and structure:** validate required fields, exactly nine slides, six thesis bullets, image presence, media decoding, and slide bounds; reopen the generated PPTX. Optional Open XML SDK validation checks package/document errors but adds a .NET dependency. This cannot prove readable typography, correct logo identity, or non-overlap. [Microsoft OpenXmlValidator](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.validation.openxmlvalidator.validate?view=openxml-3.0.1)
2. **Rendered inspection:** LibreOffice documents headless operation and command-line conversion, including output directories. It needs an installed application and a writable user profile. A plausible automated path is PPTX → PDF → page images; PyMuPDF documents PDF page rasterization. Inspect those images for clipping, overlaps, empty assets, and readability. This establishes LibreOffice appearance, not an identical PowerPoint result. [LibreOffice command-line options](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html), [PyMuPDF page images](https://pymupdf.readthedocs.io/en/latest/recipes-images.html)
3. **Recipient compatibility:** PowerPoint itself exposes slide-to-image export with explicit pixel dimensions. A development-time PowerPoint open/export provides direct evidence for that viewer; it requires the application and suitable automation access. It need not become a manual step in every Recur run. [PowerPoint Presentation.Export](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.presentation.export)

Neither reviewed generation API documents a built-in PowerPoint rendering engine. A source-XML check or a separately drawn HTML preview must not be described as rendered PPTX verification. No rendering tests were run in this research.

## Supplied PNG quality

Local inspection using sips found all nine supplied PNGs are **1300 × 731 pixels**, approximately 16:9. Evidence: files in [the supplied slide directory](../../../Recur%20x%20US%20Fleet%20Tracking_vS/).

For example, at 13.333 × 7.5 inches, that is about 97.5 pixels per inch; at 10 × 5.625 inches, about 130. This arithmetic does not establish print suitability. Their effective print resolution depends on physical printed size; resizing or exporting at more pixels does not recover original detail. Reuse is technically straightforward, while mailing-quality acceptance requires reviewing the supplied images at intended print dimensions. Do not reconstruct slides 4–9 solely to improve their editability: that is outside this map.

## Four-day implications and remaining evidence

Prefer one supported host, one runtime, a pinned library version, prepackaged reference images, and a known font. Verify that host can fetch company assets, execute the renderer, and return the PPTX before committing to its handoff experience. If automated rendering is unavailable there, choose consciously between adding a rendering service/dependency or accepting narrower runtime checks backed by development-time rendered tests. Neither choice has been approved or proven by this note.

