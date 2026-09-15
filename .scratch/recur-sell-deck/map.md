# Plan a one-prompt Recur sell-deck workflow

Labels: wayfinder:map

## Destination

An implementation-ready plan for a package that Recur can use in a familiar AI tool: one company-name prompt produces a usable nine-slide PowerPoint with no human intervention during generation. Resolve the decisions needed to build, validate, and hand over the workflow and an example PPT within the user's four-day maximum.

## Notes

- Canonical brief: [task.md](../../task.md). Read it before working a ticket. Domain language: [CONTEXT.md](../../CONTEXT.md).
- Planning only under wayfinder. This map ends when the route to implementation is clear; it does not authorize treating a proposed design as a proven working deliverable.
- User preferences confirmed September 15, 2026: use an AI tool Recur already uses; setup must be quick and easy; cover software acquisition targets across sectors; send as soon as the workflow is proven, with four days maximum.
- Recur's specific tools, account plans, and available capabilities remain unknown. Compatibility research can establish options but cannot establish what Recur has access to.
- Required cover: headquarters-related landmark, Recur logo, and target-company logo. Required thesis: three named sections with a header and two bullets each. Required market map: AI-chosen axes, labels, subtitle, landscape callout, competitor logos, and placements.
- Slides 4–9 may be reused directly. The available reference is nine PNG files in `Recur x US Fleet Tracking_vS/`; no editable source presentation is present. Directionally similar, usable results are sufficient; exact replication is not required.
- PowerPoint and the packaged workflow are required deliverables. A mandatory human review step during generation would contradict the brief. The meaning and bounds of first-try success still need an acceptance decision.
- Consult wayfinder for every session; grilling and domain-modeling for human decisions; research for research tickets; prototype for visual exploration tickets.
- Local Markdown tracker: this file is the map; child issues live in `issues/`. Each child links its parent. `Blocked by` lists prerequisite child IDs. `Status: open` with `Assignee: unassigned` is unclaimed. Before work set `Status: claimed` and assign the driving developer. A ticket is unblocked when all prerequisites are resolved. Scan open, unassigned, unblocked tickets in numeric order for the frontier.
- Record resolutions as appended `## Answer` comments in the ticket, mark resolved, then add only its linked gist below. Do not resolve human decision tickets without a live exchange.
- This workspace has no Git repository. Research uses isolated temporary Git repositories on `research/<name>` branches; each research ticket records its context pointer and links the durable findings copied into this effort's `research/` directory.

## Decisions so far

- [Establish which familiar AI tools can run the complete workflow](issues/01-research-ai-environments.md): Documented handoff candidates exist; actual account permissions, asset downloads, and unattended rendering need a feasibility check.
- [Establish practical PowerPoint generation and validation options](issues/02-research-powerpoint-pipeline.md): Python and JavaScript generation paths can express the deck; rendered verification is a separate capability and PNG print quality depends on physical size.

## Not yet specified

- Follow-up investigations exposed by the chosen host's actual constraints and by visual reactions to the prototype.
- Refinements to the evaluation examples and quality rubric as we learn where the proposed workflow's investment reasoning or rendering fails.

## Out of scope

- Building the final package or generating the submission deck during this planning map; execution follows the resolved plan.
- Recreating or rewriting the six Recur introduction slides.
- Building a general presentation product for arbitrary industries or purposes beyond software founder outreach.
- Sending outreach, operating a mailing campaign, or submitting the case study on the user's behalf.
