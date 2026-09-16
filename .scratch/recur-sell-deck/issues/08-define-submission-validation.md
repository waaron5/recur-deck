# Choose the demonstration and fresh-user validation plan

Parent: [Plan a one-prompt Recur sell-deck workflow](../map.md)
Type: grilling
Labels: wayfinder:grilling
Mode: HITL
Status: resolved
Assignee: aaronwood
Blocked by: 03, 04, 06, 07

## Question

The release bar and evidence threshold are set in [Define first-try success and the release bar](04-define-first-try-success.md): US Fleet Tracking plus five unfamiliar covered targets, each passing in a fresh chat. Which five covered targets (spanning sectors, sizes, and the edge cases exposed by the failure-behavior decision) should the release set use? Which deck becomes the submission example? What goes in the handoff guide beyond installation steps, including the tested-company claim and known soft spots?

Constraint from [Choose the slide layouts and asset strategy through a rough prototype](06-prototype-slide-and-asset-strategy.md): US Fleet Tracking's only name logo is 265 px wide, so under the resolution rule its cover uses a text wordmark. The handoff guide should explain that logos too low in resolution are replaced by text on purpose, so reviewers don't read it as a defect.

Constraints from [Define unattended generation and failure behavior](07-define-unattended-run.md):

- The release set should exercise the ladders that decision defined: an ambiguous name, an HQ in a small town (metro-landmark rung), a thin competitor field, and a site that blocks the sandbox or is a JavaScript shell (the two-independent-sources evidence floor).
- The guide should explain the outcomes a reviewer may see: an evidence failure (no deck, with a suggested fix), a flagged deck (`… - NOT READY.pptx`), and the `Fallbacks:` line. It should also say that adding the company's URL to the prompt settles which company is meant.

## Answer

Resolved September 15, 2026 with the user in a live grilling exchange. Terms (release set, practice set, behavior check, submission example) are defined in [CONTEXT.md](../../../CONTEXT.md). Candidate research, with sources for every claim: [release candidates](../assets/08-release-candidates.md).

**Release set.** Each unfamiliar company carries one hard case, so a failure points at one cause. The set spans two small, two mid-size, and one large company, all in different sectors. It excludes fleet and telematics, Recur-related companies (Skimmer is out because of its Mainsail tie), and the ten logo-trial companies.

| Company | Hard case | Sector, HQ | Staff |
| --- | --- | --- | --- |
| US Fleet Tracking | the reference | fleet tracking, Edmond / Oklahoma City, OK | — |
| Lattice | ambiguous name (Lattice Semiconductor, public) | HR, San Francisco, CA | ~540 |
| Shopmonkey | small-town HQ (~45k; San Jose ~31 km) | auto repair, Morgan Hill, CA (own terms page) | ~200 |
| Pool Office Manager | thin competitor field (~5 pool-specific rivals) | pool service, Columbus, OH (own homepage) | small |
| Dockwa | blocked site (Cloudflare challenge even to a Chrome UA) | marinas, Newport, RI | 11–50 |
| Luma Health | clean control | patient engagement, San Francisco, CA | ~200 |

Known extra stressors: Dockwa's cover will use a text wordmark, because its own site is blocked, and one aggregator misstates its HQ as Newport Beach. Pool Office Manager's homepage carries customer logos, which exercises the logo identity check.

**Prompt.** The brief's phrasing, `Create a Recur sell deck for <Company>`, with names as someone at Recur would type them: "Lattice", "Shopmonkey", "Pool Office Manager", "Dockwa", "Luma Health", "US Fleet Tracking". No URLs. "Luma Health" is always the full name; bare "Luma" collides with Luma AI.

**Running it.** Fresh chats on the developer's Pro account, on the model a fresh chat defaults to, with web search on. The guide names the tested model. If the default model fails, the guide tells users to pick the model that passed.

**Unfamiliar and reruns.** The release set is fixed now and never run during development. Building and tuning use a **practice set**: US Fleet Tracking plus the ten logo-trial companies. After any failed run, fix the workflow and rerun all six on the new ZIP. The claim to Recur reports results on the final ZIP only.

**Reserves.** If a company leaves the covered scope (acquired, renamed, site gone), the next candidate for its slot in the research file replaces it, and the tested-on table discloses the swap. A replacement never stands in for a failed run.

**Behavior checks** (do not count toward the bar):

- One run with the domain allowlist at "Package managers only". Expect an evidence failure within seconds, with the allowlist fix line.
- Procore, a public software company. Expect a deck plus the `Outside the covered scope` line.
- Lattice with its URL in the prompt, only if the bare-name run picks the wrong company.

**Submission example.** The untouched US Fleet Tracking file from a run on the final ZIP. It is apples-to-apples with Recur's own deck, and Recur's cover also shows "USFleetTracking" as white text, so the text wordmark matches their version. If that run has a quality note, up to 2 extra US Fleet Tracking runs are allowed on the same ZIP. Every one counts in the reported tally (e.g. "7 of 7"), and a critical defect in any of them fails the release. After that, fix the workflow and rerun the whole set. The file is never hand-edited.

**Fresh-user check.** One install from the guide alone. Ideally a second person does it on their own account; otherwise the developer does it on a new Free account (custom skills work on Free with code execution on). It times setup against the 10-minute target and notes any step the guide missed. Its deck is informational, since Free usage limits may cut the run short.

**Handoff guide.** Provisional until the user sees real output; it must read as clean, simple, and impressive. One page, as a PDF, with the same text in the email body:

1. What's included: the ZIP, this guide, and the example deck.
2. Setup: four steps, including Domain allowlist → All domains, with a one-line security note.
3. How to run it: the prompt, the tip to add the company's URL, a typical time of about 10 minutes, web search on, and the tested model.
4. What you might see: a clean deck, the `Fallbacks:` line, a `NOT READY` deck, and an evidence failure with its fix.
5. Where the sources are: speaker notes on slides 1–3.
6. Tested on: a table of company, sector, hard case, time, fallbacks, and result, plus the precise "N of N fresh runs…" sentence.
7. Known soft spots: slides 4–9 print softness, text wordmarks used on purpose, landmark fallback rungs, and the covered-target scope.

It leaves out how the workflow was built, which is for the meeting. The other release decks are not attached.

**Out of scope.** Planning a live demo for the follow-up meeting. The map ends at handover.

**Build constraint (verified fact).** Every sandbox fetch must send a full Chrome user-agent string. Cloudflare returns a 403 to the bare `Mozilla/5.0` on ordinary sites (verified on mrisoftware.com: 403 with the bare UA, 200 with Chrome). Without it, clean companies would fall to the two-third-party-sources floor by mistake. The prototype's `discover-logos.js` already sends a Chrome UA.
