# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.
This repo has a GitHub remote, but work is not tracked in GitHub Issues.

## Conventions

- One effort per directory: `.scratch/<slug>/`
- The spec, where one exists, is `.scratch/<slug>/spec.md`
- **Wayfinder decision tickets**: `.scratch/<effort>/issues/<NN>-<slug>.md`
- **Implementation tickets** (from `/to-tickets`): `.scratch/<feature>/tickets/<NN>-<slug>.md`
- The two are kept in separate directories on purpose: a wayfinder ticket holds
  an open question and its resolved answer, an implementation ticket holds work
  to be done. Mixing them in one `issues/` directory confuses both.
- Both are numbered from `01` in dependency order, one file per ticket, never a
  single combined file
- Triage state is a `Status:` line near the top of each file (see `triage-labels.md`)
- Comments and conversation history append at the bottom under `## Comments`

## Live examples

- `.scratch/recur-sell-deck/` — the planning effort: `map.md` plus ten resolved
  wayfinder tickets in `issues/`, with research and prototype assets alongside
- `.scratch/recur-sell-deck-build/tickets/` — eleven implementation tickets
  derived from that map

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<slug>/`, creating the directory if needed.
Implementation tickets go in `tickets/`, wayfinder children in `issues/`.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or
the ticket number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`,
  with the question in the body. A `Type:` line records the ticket type
  (`research`/`prototype`/`grilling`/`task`); a `Status:` line records
  `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked
  when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open,
  unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set
  `Status: resolved`, then append a context pointer (gist + link) to the map's
  Decisions-so-far in `map.md`.
