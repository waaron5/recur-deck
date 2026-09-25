# Recur Founder Outreach

Recur approaches software business founders with a tailored introduction to its investment perspective and partnership proposition.

## Language

**Target company**:
A software business being considered for acquisition or partnership by Recur, whose founder is the intended recipient of a sell deck.
_Avoid_: Customer, prospect account

**Sell deck**:
A presentation from Recur to a target company's founder that explains Recur's interest, the market opportunity, and Recur's credentials. It supports a first-touch physical mailing campaign.
_Avoid_: Fundraising deck, product sales deck

**Thesis page**:
The company-specific argument expressed through “why we're here,” “why we're excited,” and “how we can help,” each with a header and two bullets.

**Market map**:
A view of a target company's competitive landscape whose axes, competitor selection, placements, subtitle, and commentary express an investment judgment.

**Company fact**:
A statement about the target company's product, customers, or business that a cited source supports. Only company facts may describe what the target company is or does.
_Avoid_: Insight, observation

**Recur proposal**:
A statement of how Recur would help the target company, phrased as an offer drawn from Recur's go-to-market, product, payments, and AI strengths. It never asserts an unsupported weakness of the target company.
_Avoid_: Recommendation, gap

**Source record**:
The evidence behind one run's sell deck: the sources for each company fact, the reasoning for each competitor and placement on the market map, and any assumption made to identify the target company. It is kept off the visible slides.
_Avoid_: Bibliography, citations

**Covered target**:
A target company within the workflow's reliability promise: a private software business, in any vertical, with an official website and a determinable headquarters city. Other target companies receive best-effort runs.
_Avoid_: Supported company, any company

**Run**:
One company-name prompt through to one delivered sell deck, with no user message in between. The workflow's own checks and bounded repairs happen inside a run; a clarifying question to the user ends it as a failure.
_Avoid_: Attempt, try, iteration

**Preflight**:
What a run establishes before it spends anything on research: that the sandbox can reach a non-package host, and that the skill's own files unpacked whole. It also records the moment the run began, which is what the repair budget's cutoff is measured from.
_Avoid_: Health check, smoke test

**Repair budget**:
What a run may spend rewriting its way out of trouble: three content rounds, two render rounds, and no new round after about twelve minutes of elapsed time. A critical defect that outlives the budget produces a flagged deck rather than another round. A round buys a rewrite, so only a check that found something to rewrite costs one — a blind render does not.
_Avoid_: Retries, attempts, backoff

**Critical defect**:
A flaw that makes a sell deck unusable and fails its run: wrong or invented company facts, a logo belonging to another company, a nonexistent or non-competing competitor, a missing required element, overflowing or illegible text, a wrong slide count or order, or a missing or unopenable file. Other shortcomings are quality notes.
_Avoid_: Bug, error

**Quality note**:
A shortcoming in a sell deck that does not make it unusable, such as a generic bullet, a weak landmark, or a debatable axis. Quality notes do not fail a run.

**Finding**:
One problem the content gate reports, naming the single field that has to change, the rule it breaks, and the slide it sits on. The one exception is a rule about a set of fields rather than any one of them — six thesis bullets all built the same flat way — which names the section instead, and the repair chooses which fields to rewrite. A finding may be a critical defect or a quality note — an overflowing bullet is one, a flat thesis is the other — and the gate reports both the same way, because both are repaired by rewriting what it names.
_Avoid_: Error, violation, warning

**Render check**:
The step that rasterises slides 1–3 of a built deck so the model can look at them before the file is handed over. It catches what only an eye sees: text that overflows, is clipped, overlaps something, or is illegible, and logos that landed wrong. Its repairs are shorter copy, never smaller type. It is a second opinion rather than a guarantee: the content gate is what guarantees fit, so a run denied its render — a converter that hangs or is absent — hands the deck over and names the missing check in the reply, without flagging it for that.
_Avoid_: Screenshot test, visual regression

**Blind render**:
A render check that produced no image — the sandbox's converter hung or is not installed — so there was nothing for the model to look at. It costs no repair round, because a round bounds rewriting and a blind render gives nothing to rewrite from. Two of them is as long as a run waits, and then the deck is handed over with the missing check named in the reply. It never flags a deck: it found nothing to flag. A converter that timed out and one that is absent are both blind renders, and the words for those two causes stay available — what is avoided is naming the outcome after either of them, since a run treats them the same and only one is worth asking twice.
_Avoid_: Failed render, render error, render timeout

**Structural check**:
The deterministic check a built deck passes before it is rendered: exactly nine slides, slides 4–9 in order, speaker notes on slides 1–3, and a file that reopens. What it reports are critical defects rather than findings, because no rewrite of the copy repairs them; they fail the build instead of costing a repair round.

**Evidence failure**:
A run that cannot identify the target company, cannot establish from sources what it sells and to whom, or cannot reach the web at all. It delivers no sell deck, only an explanation and a suggested fix.
_Avoid_: Error, crash

**Flagged deck**:
A sell deck delivered despite critical defects that survived the workflow's repairs, with those defects listed in the reply and "NOT READY" in its file name. Its run still fails.
_Avoid_: Draft, partial deck

**Submission example**:
The single sell deck sent to Recur alongside the workflow package; it must be free of critical defects and quality notes.
_Avoid_: Sample output, demo deck

**Release set**:
The fixed, named companies whose fresh runs on the final workflow package decide whether it ships. It is kept apart from development so the workflow is not tuned to it.
_Avoid_: Test set, eval set

**Practice set**:
Companies used while building and tuning the workflow. Their runs never count toward the release bar.
_Avoid_: Dev set, training set

**Behavior check**:
A run made to confirm one specific outcome, such as an evidence failure or a best-effort reply. It does not count toward the release bar.
_Avoid_: Negative test, smoke test

**Text wordmark**:
A company's name set deliberately in clean text. On the sell deck's cover it is the treatment: the cover carries no logo at all, and sets the target company's name in that company's written form. On the market map it is the fallback, used when no logo image can be verified as the company's own, when the image cannot be converted, or when the image cannot stay sharp at the size its slot needs. Either way it is a designed outcome, never a defect.
_Avoid_: Placeholder, broken logo

**Written form**:
A company's name as that company writes it on its own masthead — "USFleetTracking" for a company called US Fleet Tracking, "shopmonkey" for Shopmonkey. It is the same letters in the same order as the name the run was given, restyled only in case, spacing and punctuation. It is what the cover's text wordmark sets, and a run that cannot read one sets the name it was given.
_Avoid_: Brand name, logotype, styled name

**Recur introduction**:
The reusable section of the sell deck presenting Recur's identity, team, experience, backing, and values; represented by slides 4–9 of the reference presentation.

**Supported host**:
Claude's chat product with a Recur sell-deck custom skill installed from a ZIP. This is the single environment the packaged workflow promises to support for the case-study submission.
_Avoid_: Claude API, generic AI tool, multi-host workflow

**Workflow package**:
The browser-uploadable Recur sell-deck custom-skill ZIP, containing its instructions, deterministic deck-generation code, validation code, reference rules, and fixed Recur assets. The handoff also includes a short installation guide and an example sell deck.
_Avoid_: Source repository, hosted application, API integration

**Voice exemplar**:
The prose of the Recur introduction, slides 4–9, carried inside the workflow package as the writing a run's copy is held against. It replaces the banned word list: a run imitates writing rather than avoiding words.
_Avoid_: Style guide, tone guidelines, house style
