# Define unattended generation and failure behavior

Parent: [Plan a one-prompt Recur sell-deck workflow](../map.md)
Type: grilling
Labels: wayfinder:grilling
Mode: HITL
Status: resolved
Assignee: aaronwood
Blocked by: 03, 04, 05, 06

## Question

How should one company-name prompt proceed from company identification through research, asset collection, slide generation, and validation to file delivery without human intervention? Resolve ambiguous company names, unavailable sources or logos, insufficient evidence, overflow, bounded automatic repair, and terminal failure behavior. Preserve the required output standard rather than silently substituting invented facts or missing required elements. Decide which parts the model judges and which parts deterministic code enforces.

Constraints from [Define the evidence and investment judgment behind each pitch](05-define-investment-judgment.md): deterministic validation code is required and already owns the countable writing rules (word counts, banned terms, punctuation, unsourced digits, name spelling) and speaker-notes completeness, with the model judging tone, the swap test, and claim-to-source fidelity. This ticket still decides the repair limit, the order of checks, and what happens when evidence cannot establish what the company sells and to whom.

Constraints from [Choose the slide layouts and asset strategy through a rough prototype](06-prototype-slide-and-asset-strategy.md):

- Logo acquisition is fixed: ordered site candidates, then normalisation, a model identity check, a background-fit check, and the resolution rule. The terminal fallback for any logo is a text wordmark, never a missing element.
- WebP conversion in the sandbox is still unverified. If it fails, the logo becomes a text wordmark.
- The landmark comes from a Commons search, downloaded as a 1920 or 1280 px thumbnail, then cropped and given a navy duotone. This ticket still decides what happens when no usable landmark photo is found.
- Every run renders slides 1–3 with LibreOffice and inspects them, so repairing overlap and overflow belongs to the bounded repair loop.
- The market-map chart treatment is pending in [Choose the market-map chart treatment](10-prototype-market-map-chart.md). Free placement would need collision repair; packed cells would not. _Since resolved: free placement, with crowding capped in the content rules and overlaps nudged apart deterministically._

## Answer

Resolved September 15, 2026 with the user in a live grilling exchange. Terms (run, critical defect, quality note, covered target, text wordmark, evidence failure, flagged deck) are defined in [CONTEXT.md](../../../CONTEXT.md).

**Stages and ownership.** Each stage passes a deterministic code gate before the model spends effort on the next.

0. **Preflight** (code): one test download from a non-package host, a check that the skill files are present, and a recorded start time.
1. **Identify** (model): the company, its headquarters, and any ambiguity assumption. The evidence floor below is a hard gate.
2. **Research and choose** (model): company facts with sources, competitors, axes, and placements, written as structured JSON with a source entry for every claim.
3. **Assets**: code fetches and normalises logos and the landmark, the model checks each logo's identity, and code enforces the resolution rule. Competitor swaps happen here, before any copy is written about them.
4. **Content gate** (code): the countable writing rules and notes completeness from [Define the evidence and investment judgment behind each pitch](05-define-investment-judgment.md), plus a pre-render fit estimate that predicts line wraps from bundled Liberation Sans metrics (metric-compatible with Arial).
5. **Judgment review** (model): one pass over tone, the swap test, and claim-to-source fidelity. It rewrites only the fields that fail.
6. **Build** (code): the PPTX, then structural checks: exactly nine slides, slides 4–9 in order, notes on slides 1–3, and the file reopens in python-pptx.
7. **Render and inspect**: slides 1–3 are rendered with LibreOffice, and the model checks them for overlap, clipping, and illegibility.
8. **Deliver.**

**Ambiguous names.** A website URL in the prompt settles the company's identity. Other hints in the prompt, such as a city or sector, rank candidates. Otherwise the run prefers a private software business with its own website, then the one whose site and search presence is most prominent. The rejected candidates and why each lost go in slide 1's notes. If no candidate is software, the run is best-effort on the most prominent one.

**Evidence floor.** The product and the buyer must be established by the official site or the company's own channels. If the site is unreachable or empty (a JavaScript shell or a "coming soon" page), two independent sources that agree suffice, and the reply says the facts came from third parties. Failing both is an **evidence failure**: no deck is built.

**Network preflight.** If the test download is blocked (the default "Package managers only" allowlist), the run stops as an evidence failure within seconds. Its fix line reads: "Set Settings > Capabilities > Domain allowlist to All domains, then resend."

**Landmark ladder.** A recognisable landmark in the HQ city, then that city's skyline or streetscape. Next is a landmark in the nearest major metro within about 60 km, with the link stated in slide 1's notes. Last is a state or regional landmark. The last two rungs are quality notes. A photo that is watermarked, narrower than about 1,600 px, or too somber for a sales cover moves the search down a rung. A navy cover with no photo is reached only when downloads themselves fail; it is a critical defect and produces a flagged deck.

**Competitors and logos.** With fewer than 6 eligible competitors, the run searches once more, more broadly, including horizontal platforms buyers visibly compare with the target. Five placed is accepted as a quality note. Fewer than 5 after that is a critical defect and produces a flagged deck. The list is never padded with adjacent or defunct companies. If more than about a third of competitors would be text wordmarks, an equally eligible alternate with a usable logo is swapped in. A category leader is never dropped for logo reasons, and exceeding the cap is a quality note. Unavailable logos follow the acquisition ladder in [Choose the slide layouts and asset strategy through a rough prototype](06-prototype-slide-and-asset-strategy.md), ending in a text wordmark.

**Repair budget.** Up to 3 content-gate rounds (stages 4–5) and up to 2 render rounds (stage 7). Each round touches only the failing fields. No repair round starts after about 12 minutes of elapsed run time, which keeps runs inside the 15-minute limit. Type sizes stay fixed at design values: overflow is always fixed by shortening text, never by shrinking type. Market-map collisions rarely reach this budget: [Choose the market-map chart treatment](10-prototype-market-map-chart.md) caps crowding in the content rules, which the stage 4 gate enforces, and nudges the remaining overlaps apart deterministically at build time.

**Terminal behavior, split by cause.**

- **Evidence failure** (company unidentified, product or buyer unestablished, network blocked): no deck. Anything built would be invented.
- **Build failure** (any critical defect that survives the repair budget: layout, a missing asset, too few competitors): a **flagged deck**, named `Recur x <Company> - NOT READY.pptx`, with nothing added to the slides. The run still fails.

**Chat reply.** A fixed template of about 6 lines at most per outcome. The model does not narrate progress during the run.

- **Clean deck:** the download card, `Company: <name>, <HQ city>`, and `Assumed: <one line>` if the name was ambiguous. `Fallbacks: <e.g. 2 competitor wordmarks, metro landmark>` appears if any fallback was used.
- **Flagged deck:** the first line reads `⚠ Not ready to mail. N issue(s) remain:`, followed by one line per defect with its slide number. Then the download card and the clean-deck lines.
- **Evidence failure:** what couldn't be established, what was tried, and the fix: resend with the company's website, e.g. `Create a Recur sell deck for Acme (acme.com)`, or the allowlist step.
- **Best-effort targets** run the same pipeline under the same gates and add one line: `Outside the covered scope (<reason>); treat as best-effort.`

The clean deck file is `Recur x <Company>.pptx`.

## Note — September 18, 2026

**One clause of this decision was never implemented.** The landmark ladder above
says that "a photo that is watermarked, narrower than about 1,600 px, or too
somber for a sales cover moves the search down a rung". Only the width is
enforced, by the `fileres` filter in the Commons query. Nothing in the package or
in SKILL.md ever puts a candidate photograph in front of the model, and
`ladder.js` steps down only when a search returns nothing usable — never on a
judgment about what came back. A watermarked photograph, or one whose subject is
wrong for a sales cover, is placed without objection.

Found during the ticket 09 practice runs: a ServiceTitan run covered its deck
with a photograph of a residential house, which is a reasonable answer to
"Glendale California landmark" and a poor cover. The user set photo choice aside
for now, so this is recorded rather than fixed.

Whoever picks it up should know the shape of it: the decision was made, and the
code never carried it out. Fixing it means giving the model a look at the
candidates before the build — the run file already accepts a `landmark` the model
supplies, so the mechanism exists; what is missing is the step that chooses.

## Amendment — September 24, 2026

**The render-round budget is amended: a render that produced no image spends no
round, and the "no deck is delivered unseen" promise is narrowed to match what
the render check can actually guarantee.** Settled in
[Stop the render check spending the run on a converter that cannot
answer](../../recur-sell-deck-tune/issues/03-eyes-that-fail-cheap.md); the
reasoning and the measurements are there.

What changed in this decision's terms:

- The two render rounds stand, and still bound repair. They are now charged only
  for a render that came back with images — which is the only kind that can
  produce something to repair.
- A **blind render** — one whose converter hung or is absent — is bounded
  separately at two, and at 30 seconds each rather than this decision's two
  minutes. The September 2026 run spent four minutes and both render rounds on
  two renders that showed it nothing.
- A run whose renders all came back blind delivers a **clean** deck, not a
  flagged one. Flagging says critical defects are standing, and a blind render
  finds none. The reply's `Fallbacks:` line carries `no visual check (the
  renderer did not answer)`, built from what the run recorded.
- The promise becomes **every deck is looked at, and a deck that could not be
  looked at says so**. The fit half of the old promise moved to the content gate
  in [A box that holds one
  line](../../recur-sell-deck-tune/issues/02-a-header-that-cannot-wrap.md), which
  refuses an overflowing line before a deck is built. The render check is the
  second opinion, and a second opinion can be honestly denied.

The reply template is untouched, and so is `reply.js`.
