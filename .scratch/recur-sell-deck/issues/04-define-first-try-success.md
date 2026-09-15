# Define first-try success and the release bar

Parent: [Plan a one-prompt Recur sell-deck workflow](../map.md)
Type: grilling
Labels: wayfinder:grilling
Mode: HITL
Status: resolved
Assignee: aaronwood
Blocked by: none

## Question

What observable conditions make a generated deck usable and ready for the case-study submission? Set the supported software-company scope, content and visual standards for physical mailing, acceptable run duration, meaning of a single try (including whether internal automated checks and repairs are permitted), and the evidence needed before release. Define success without adding mandatory human intervention to each generation or claiming universal reliability from one example.

## Answer

Resolved September 15, 2026 with the user in a live grilling exchange. Terms are defined in [CONTEXT.md](../../../CONTEXT.md).

**One try.** A run is one company-name prompt through to one delivered deck with no user message in between. The workflow may run its own checks and bounded repairs inside the run; the user never sees those passes. A clarifying question to the user fails the run. An ambiguous name is resolved from evidence and the assumption stated in the chat reply, not on the slides. One-time setup (ZIP upload, enabling code execution) is not part of a run.

**Covered targets.** The reliability promise covers private software businesses, in any vertical, with an official website and a determinable headquarters city. Other companies, including public mega-caps, non-software businesses, and those without a findable site or headquarters, get best-effort runs that do not count against the bar.

**Critical defects** (any one fails the run):

1. Wrong company, or false or invented company facts.
2. A logo belonging to another company, or a competitor that does not exist or does not compete.
3. A missing required element: landmark, either cover logo, any of the 3 thesis headers or 6 bullets, axes and labels, subtitle, callout, or at least ~5 placed competitors.
4. Text that overflows, is clipped, overlaps, or is illegible.
5. Not exactly nine slides, or slides 4–9 missing or out of order.
6. No downloadable PPTX, or one that does not open in PowerPoint.

Everything else is a quality note (a generic bullet, a skyline instead of an iconic landmark, a debatable axis) and does not fail a run.

**Text wordmarks.** Recur's own reference shows "Motive" and "USFleetTracking" as plain text on the market map. A clean text wordmark is therefore acceptable for competitors, capped at roughly a third of them. It is also acceptable for the target's cover logo when no usable logo image can be obtained. A broken image or placeholder is never acceptable.

**Visual bar.** Slides 4–9 are used as supplied (1300 × 731 PNGs, about 97 pixels per inch at 13.3 inches wide); the handoff guide notes their print softness rather than fixing it. Slides 1–3 must look directionally like the reference and print cleanly: native editable text no smaller than about 12pt, sharp logos with aspect ratio preserved, and a cover photo that is clearly tied to the headquarters city, unwatermarked, and at least ~1600px wide.

**Duration.** Typical run of 10 minutes or less; a run over 15 minutes fails. Shorter is better, but never at the expense of output quality.

**Release evidence.** Before shipping: US Fleet Tracking plus five unfamiliar covered targets spanning sectors and sizes, each run once in a fresh chat with the packaged ZIP installed, all with zero critical defects in under 15 minutes. If a run fails, fix the workflow and rerun the whole set. An honest failure message on a covered target counts as a failed run.

**Release judgment.** The developer judges each release run by opening it in real PowerPoint, checking the critical-defect list, and spot-checking facts and competitor choices against the run's sources. That requires each run to record its sources somewhere outside the slides; where they live belongs to [Define the evidence and investment judgment behind each pitch](05-define-investment-judgment.md). The workflow's automated checks inform this judgment but do not replace it.

**Quality notes and the submission example.** Quality notes do not fail release runs. The submission example sent to Recur must be free of both critical defects and quality notes. Recurring quality notes signal a workflow fix, not a release gate.

**Claim to Recur.** The guide states results precisely ("N of N fresh runs on these named companies produced a deck with no critical defects"), states the covered-target scope, and names the known soft spots (slides 4–9 print resolution and text wordmark fallback). It makes no claim of universal reliability.

**Scope split.** This ticket sets the bar and the evidence threshold. [Choose the demonstration and fresh-user validation plan](08-define-submission-validation.md) is narrowed to choosing the specific test companies, the submission example, and the handoff guide contents.
