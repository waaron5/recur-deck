# Choose the market-map chart treatment

Parent: [Plan a one-prompt Recur sell-deck workflow](../map.md)
Type: prototype
Labels: wayfinder:prototype
Mode: HITL
Status: resolved
Assignee: aaronwood
Blocked by: 06

## Question

Slide 3's frame is already decided: title and subtitle on the left, and the callout in a full-height navy sidebar on the right. Which chart treatment reads cleanest inside it?

- **Free placement:** L-shaped axes on a tinted band, with the model choosing each logo's coordinates.
- **Packed cells:** four labelled cells, with the model choosing only each company's cell and code packing the logos.

Prototype both at the smaller type sizes and more generous spacing from [Choose the slide layouts and asset strategy through a rough prototype](06-prototype-slide-and-asset-strategy.md), then choose. Also settle:

- the logo box size and minimum legible logo height;
- how the target company is distinguished;
- slide 3's type sizes;
- how collisions are prevented: free coordinates plus the render check, or cell assignment plus deterministic packing.

Constraints from [Define the evidence and investment judgment behind each pitch](05-define-investment-judgment.md): 6–9 competitors plus the target on two categorical axes. The callout is "Our take:", then 2 dynamics bullets, then 1 underlined proposal bullet.

Constraints from [Choose the slide layouts and asset strategy through a rough prototype](06-prototype-slide-and-asset-strategy.md):

- The crossing-axes chart was rejected as cluttered ("looks like someone threw up a bunch of logos").
- The user has a standing preference for negative space, with bold, large type reserved for text that must be read.
- Logos are never enlarged past sharpness. A logo too small for its slot becomes a text wordmark.
- In the prototype, free placement crowded logos until they were spaced by hand, while packed cells had no collisions.
- A very wide logo (about 10:1) shrinks to roughly 0.16 inch tall in a 1.55 × 0.5 inch box.

Constraint from [Define unattended generation and failure behavior](07-define-unattended-run.md): type sizes are fixed design values, and overflow is fixed by shortening text, never by shrinking type. Free placement's collision repair would have to fit inside the 2-round render budget, while packed cells prevent collisions in code.

Start from the prototype on branch `prototype/06-slide-layouts` (`.scratch/recur-sell-deck/assets/06-slide-prototype/build-prototype.js`, map variants A and C).

## Prototype

Throwaway assets in [10-market-map-prototype](../assets/10-market-map-prototype/), captured on branch `prototype/10-market-map`. Open `viewer.html` (←/→ switches treatment, ↑/↓ switches dataset) or `out/all.pptx` in PowerPoint. Generator: `build.js`. Copy, competitors, and placements are illustrative and unverified. This is not the submission deck.

Three treatments were built inside slide 3's decided frame, each on two datasets: the US Fleet Tracking placements from ticket 06, and a stress case with 5 of 9 competitors crowded into the target's quadrant, one empty quadrant, a synthetic 10:1 wide logo, and one text wordmark.

- **free** — L-shaped axes on a tinted band; the model gives 0–1 coordinates; code nudges overlapping logos apart inside their own quadrant.
- **freegrid** — the same, plus faint white midlines between quadrants.
- **packed** — four labelled cells; the model picks only each company's cell and code packs uniform slots.

Quick Look renders the callout's bullet glyphs too far left; PowerPoint renders them correctly, as in ticket 06.

### Reactions recorded September 15, 2026 (live, from the user)

Free placement over packed cells, against the agent's recommendation. No quadrant dividers. Teal outline pill for the target. Type sizes and logo sizing as prototyped. Crowding is to be prevented in the model's brief rather than absorbed by the render budget.

## Answer

Resolved September 15, 2026, through the user's live reaction to the three-treatment prototype.

**Chart treatment: free placement.** The reference look is kept: an L-shaped navy axis pair on a pale tinted band filling the slide below the title, with the model choosing each logo's coordinates. Packed cells were rejected despite preventing collisions in code. **No quadrant dividers**: only the two axis lines, as in the reference deck.

**Collision prevention**, in this order:

1. **Cap crowding in the brief.** At most 4 logos in any one quadrant, and at least three of the four quadrants hold at least one competitor. This is a content rule, checked by the deterministic validation code alongside the other countable rules from [Define the evidence and investment judgment behind each pitch](05-define-investment-judgment.md), so a bad distribution fails the content gate and is repaired with text, not pixels.
2. **Deterministic nudging.** Code treats each logo as a box, pushes overlapping pairs apart along their smaller overlap, and clamps every box inside its own quadrant, so nudging never changes the judgment the placement expresses. A 0.2 inch minimum gap separates boxes. With the cap in place this resolved every collision in both prototype datasets, including the uncapped 5-in-one-quadrant stress case.
3. **Render check last.** Anything surviving both goes to the existing render round in [Define unattended generation and failure behavior](07-define-unattended-run.md). It is the exception, not the routine path, so collision repair is not expected to consume the 2-round render budget.

**Target distinction.** A white pill with a thin teal (009384) outline, 1.25 pt, drawn behind the target's logo. Nothing else changes: no cell tint, no separate label.

**Slide 3 type sizes** (fixed design values, smaller than ticket 06's prototype): title 24 pt navy, subtitle 13 pt grey, axis category labels 10.5 pt bold navy, axis names 8 pt grey uppercase with 1 pt tracking, callout 11.5 pt white. The frame from [Choose the slide layouts and asset strategy through a rough prototype](06-prototype-slide-and-asset-strategy.md) is unchanged: title and subtitle left, full-height navy callout sidebar from x = 9.45 in.

**Logo sizing on the map.** Each logo is sized to an equal optical **area** (0.25 sq in) rather than to a uniform box, so a wide wordmark and a square mark carry the same visual weight. The result is capped at a 1.45 × 0.42 inch box, then capped again at 150 px per placed inch by the sharpness rule from ticket 06. **Minimum legible logo height is 0.14 inch**; below it the company becomes a text wordmark in 11 pt Arial bold navy. A 10:1 logo lands at 1.45 × 0.145 inch and stays a logo; US Fleet Tracking's 265 px logo is sharp enough for the map at this size, though ticket 06's rule still makes it a wordmark on the cover.
