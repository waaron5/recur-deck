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
- PowerPoint and the packaged workflow are required deliverables. A mandatory human review step during generation would contradict the brief. The acceptance bar is set in [Define first-try success and the release bar](issues/04-define-first-try-success.md).
- Consult wayfinder for every session; grilling and domain-modeling for human decisions; research for research tickets; prototype for visual exploration tickets.
- Local Markdown tracker: this file is the map; child issues live in `issues/`. Each child links its parent. `Blocked by` lists prerequisite child IDs. `Status: open` with `Assignee: unassigned` is unclaimed. Before work set `Status: claimed` and assign the driving developer. A ticket is unblocked when all prerequisites are resolved. Scan open, unassigned, unblocked tickets in numeric order for the frontier.
- Record resolutions as appended `## Answer` comments in the ticket, mark resolved, then add only its linked gist below. Do not resolve human decision tickets without a live exchange.
- The workspace is a Git repository. Research runs on throwaway `research/<name>` branches; each research ticket records its context pointer and links the durable findings copied into this effort's `research/` directory.
- Build constraint: every sandbox fetch sends a full Chrome user-agent string, because Cloudflare returns a 403 to the bare `Mozilla/5.0` on ordinary sites. Verified in [Choose the demonstration and fresh-user validation plan](issues/08-define-submission-validation.md).

## Decisions so far

- [Establish which familiar AI tools can run the complete workflow](issues/01-research-ai-environments.md): Documented handoff candidates exist; actual account permissions, asset downloads, and unattended rendering need a feasibility check.
- [Establish practical PowerPoint generation and validation options](issues/02-research-powerpoint-pipeline.md): Python and JavaScript generation paths can express the deck; rendered verification is a separate capability and PNG print quality depends on physical size.
- [Choose the supported AI tool and package handoff](issues/03-choose-host-and-package.md): Support one Claude browser custom-skill ZIP with bundled JavaScript and assets, plus a short guide and example PPTX; verify account capabilities before relying on target-specific asset downloads or rendering.
- [Define first-try success and the release bar](issues/04-define-first-try-success.md): A run is one prompt with no user turns (internal repair allowed); six critical defects fail it; ship after US Fleet Tracking plus five unfamiliar covered targets all pass in fresh chats under 15 minutes, judged in real PowerPoint.
- [Define the evidence and investment judgment behind each pitch](issues/05-define-investment-judgment.md): Sources are ranked and every fact is traced in the speaker notes of slides 1–3; thesis sections have fixed roles (market view, company fact, Recur offer); competitors and axes must be defensible facts; controlled-language writing rules with a banned list are enforced by deterministic validation code.
- [Verify the selected account's execution and file capabilities](issues/09-verify-account-capabilities.md): In a Pro account the skill ran unattended, then rendered and inspected its own PPTX. Real logo and landmark downloads need the domain allowlist set to All domains, and the skill must be a single-bundle ZIP of at most 200 files.
- [Choose the slide layouts and asset strategy through a rough prototype](issues/06-prototype-slide-and-asset-strategy.md): The cover and thesis use the reference layout, and the cover photo gets a navy duotone. Slide 3 gets a navy callout sidebar. Type is smaller, with more negative space. PptxGenJS builds native slides 1–3 and places fixed PNGs for 4–9. Logos come from the company's own site, the model checks each is the right company's, and none is enlarged past sharpness; otherwise a text wordmark is used. Photo credits stay in the speaker notes.
- [Choose the market-map chart treatment](issues/10-prototype-market-map-chart.md): Free placement on the reference L-axes, with no quadrant dividers. The model gives 0–1 coordinates under a cap of 4 logos per quadrant with at least three quadrants used; code nudges overlaps apart inside each quadrant, and the render check is the rare last resort. The target gets a white pill with a thin teal outline. Type is 24/13/10.5/8/11.5 pt, and logos are sized to equal optical area, becoming a text wordmark below 0.14 inch tall.
- [Define unattended generation and failure behavior](issues/07-define-unattended-run.md): Code gates each of nine stages. Ambiguous names resolve to the software company, or to the company whose URL is in the prompt. Missing evidence or a blocked network gives no deck. Leftover critical defects give a "NOT READY" flagged deck. Landmarks and competitors have fallback ladders. Repair allows 3 content rounds and 2 render rounds, none started after 12 minutes. Type sizes stay fixed. Each outcome has a fixed short reply.
- [Choose the demonstration and fresh-user validation plan](issues/08-define-submission-validation.md): The release set is US Fleet Tracking plus Lattice, Shopmonkey, Pool Office Manager, Dockwa, and Luma Health, one hard case each, fixed now and rerun whole after any fix. Two behavior checks don't count. The untouched US Fleet Tracking deck is the submission example. One install is done from the guide alone. The guide is one page with a tested-on table.

## Not yet specified

_Nothing. Every decision this map set out to make is made; the route to implementation is clear._

## Out of scope

- Building the final package or generating the submission deck during this planning map; execution follows the resolved plan.
- Recreating or rewriting the six Recur introduction slides.
- Building a general presentation product for arbitrary industries or purposes beyond software founder outreach.
- Sending outreach, operating a mailing campaign, or submitting the case study on the user's behalf.
- Planning a live demo for the follow-up meeting with Recur; the map ends at handover. Ruled out in [Choose the demonstration and fresh-user validation plan](issues/08-define-submission-validation.md).
