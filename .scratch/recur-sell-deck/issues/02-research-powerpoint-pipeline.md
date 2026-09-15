# Establish practical PowerPoint generation and validation options

Parent: [Plan a one-prompt Recur sell-deck workflow](../map.md)
Type: research
Labels: wayfinder:research
Mode: AFK
Status: resolved
Assignee: aaronwood (research agent: powerpoint-pipeline)
Blocked by: none

## Question

Which lightweight, documented approaches can reliably construct the three company-specific slides and append six supplied PNGs as full-slide images in a nine-slide PPTX? Investigate a small set of established Python/JavaScript libraries, image support, font/layout handling, editable text and shapes, and render/inspection options in constrained AI environments. Distinguish structural checks from actual rendered-slide verification, and identify dependencies that threaten easy setup or a four-day delivery. Use primary sources; report feasible choices without settling the visual or host decision.

## Answer

Resolved September 15, 2026. [PowerPoint generation and verification options](../research/powerpoint-pipeline.md) records the primary-source findings. Both python-pptx and PptxGenJS support the necessary native objects and reference PNG reuse; the chosen host should determine the runtime. Structural checks cannot establish rendered layout quality. LibreOffice and actual PowerPoint provide separate rendering paths with environment dependencies; none was exercised during this research. All nine local PNGs are 1300 × 731 pixels; their usable print size remains an acceptance decision.

Research context: isolated repository `/tmp/recur-pptx-research.9D1KfK`, branch `research/powerpoint-pipeline`, commit `cb07ca87e4d3222a98aef38668dd2ae220bdca38`, file `powerpoint-pipeline.md`. The linked workspace findings are the durable copy; the main workspace was not initialized as Git. No host or visual decision was settled, and no implementation was built.
