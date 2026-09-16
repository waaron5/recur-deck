# 08: Unattended orchestration and failure behavior

**What to build:** One company name goes in and one outcome comes out, with no question ever asked of the user. The pieces built so far become a gated pipeline: preflight, identify, research and choose, assets, content gate, judgment review, build, render and inspect, deliver. Each stage passes a deterministic code gate before the model spends effort on the next.

The run handles the awkward cases on its own. **Preflight** does one test download from a non-package host and stops within seconds if the sandbox's domain allowlist blocks it, telling the user exactly which setting to change. **Ambiguous names** are settled by a URL in the prompt, then by other hints in it, then by preferring a private software business with its own site, with the rejected candidates and why each lost recorded in slide 1's notes. **The evidence floor** requires the product and the buyer to come from the company's own material, or from two independent agreeing sources when its site is unreachable or an empty shell. **The landmark ladder** steps from a landmark in the headquarters city, to that city's skyline, to the nearest major metro, to a regional landmark, moving down a rung for a watermarked, too small, or too somber photo. **Competitors** get one broader second search when the field is thin, five placed is accepted, and fewer fails.

Repairs are bounded: up to three content rounds and two render rounds, each touching only the failing fields, and no round starts after about twelve minutes of elapsed time, which keeps runs inside the fifteen-minute limit.

Three outcomes, each with a short fixed reply of about six lines and no progress narration in between. A **clean deck** downloads with the company and headquarters named, the ambiguity assumption if there was one, and a fallbacks line if any ladder was used. A **flagged deck** downloads with "NOT READY" in its file name and the remaining defects listed by slide, with nothing added to the slides themselves. An **evidence failure** delivers no deck at all, only what could not be established, what was tried, and the fix to try next. A target outside the covered scope runs the same pipeline and adds one line saying so.

Decisions this implements: [Define unattended generation and failure behavior](../../recur-sell-deck/issues/07-define-unattended-run.md), with the run definition and critical-defect list from [Define first-try success and the release bar](../../recur-sell-deck/issues/04-define-first-try-success.md).

**Blocked by:** 06 (Content gate), 07 (Render and inspect loop).

**Status:** ready-for-agent

- [ ] A run never asks the user a question; a clarifying question is treated as a failure of the run.
- [ ] With the domain allowlist at its default, the run stops within seconds as an evidence failure and names the exact setting to change.
- [ ] An ambiguous company name resolves without asking, states the assumption in the chat reply, and records the rejected candidates in slide 1's notes.
- [ ] A company whose site is unreachable or an empty shell either passes on two independent agreeing sources, with the reply saying so, or fails as an evidence failure with no deck.
- [ ] Each ladder is exercised and produces its decided outcome, with fallbacks named in the reply and quality-note rungs recorded.
- [ ] Repairs stop at three content rounds and two render rounds, and no round starts after about twelve minutes.
- [ ] A surviving critical defect produces a flagged deck named accordingly, with the defects listed by slide and nothing added to the slides.
- [ ] Each outcome's reply matches its fixed template and stays short; the run does not narrate progress.
