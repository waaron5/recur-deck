# Define the evidence and investment judgment behind each pitch

Parent: [Plan a one-prompt Recur sell-deck workflow](../map.md)
Type: grilling
Labels: wayfinder:grilling
Mode: HITL
Status: resolved
Assignee: aaronwood
Blocked by: 04

## Question

What makes the thesis and market map credible to a founder? Decide evidence requirements, how to distinguish verified company facts from Recur's proposed opportunities, how to select useful axes and competitors without manufacturing a favorable quadrant, and how much source detail belongs in the deck versus a supporting record. Set rules for sparse or contradictory evidence and the tone and specificity of the six thesis bullets and market commentary.

Constraint from [Define first-try success and the release bar](04-define-first-try-success.md): release review spot-checks facts and competitor choices against each run's sources, so every run must leave a source record outside the slides. Invented facts and non-competing competitors are critical defects.

## Answer

Resolved September 15, 2026 with the user in a live grilling exchange. Terms (company fact, Recur proposal, source record) are defined in [CONTEXT.md](../../../CONTEXT.md).

**Evidence standard.** Every factual statement on slides 1–3 traces to at least one source, ranked: (1) the official website; (2) the company's own channels (press releases, help docs, pricing pages, job posts, founder LinkedIn); (3) independent coverage (trade press, G2, Capterra). Primary sources outrank third-party ones. Aggregator estimates (Crunchbase, ZoomInfo revenue, headcount, funding) are never used as facts.

**Section roles on the thesis page.**

- **Why we're here:** a market or category observation, stated as Recur's view and sourced at the category level.
- **Why we're excited:** company facts only (what the product does, who it serves, how it is sold), every bullet sourced.
- **How we can help:** Recur proposals, phrased as offers ("build…", "strengthen…"). Never an unverified claim about the target's internals; "USFT lacks an outbound motion" is an invented fact and a critical defect.

**What Recur offers.** Both help bullets draw from {go-to-market, product, payments, AI}, the strengths claimed on slides 5–6, each applied to something concrete about the target. No promises the Recur introduction doesn't back up.

**Source record location.** The speaker notes of slides 1–3; no companion file, and the PPTX is the only download. Notes are hidden in slideshow and normal print, so the mailed deck stays clean. Slide 1 notes: company identification, HQ, landmark and logo sources. Slide 2 notes: each bullet paired with its sources. Slide 3 notes: each competitor's evidence and placement reasoning, plus the reasoning for the axes. The chat reply stays short: download, company and HQ identified, any ambiguity assumption in one line.

**Competitor eligibility.** Each placed competitor: (1) currently sells, under the brand shown, a product solving the same core problem for an overlapping buyer, evidenced from its own site (acquired but operating brands are fine); (2) is not merely adjacent; a horizontal platform with a minor module counts only if buyers visibly compare them; (3) is not defunct or absorbed out of existence; (4) uses its own current logo. **Mix:** 6–9 competitors plus the target, combining recognized category leaders with peers of similar size.

**Axes and placement.** Each axis is a two-sided categorical dimension buyers actually choose on (segment, commitment or delivery model, vertical depth, deployment, pricing model), never a subjective quality or "leader" score. Every placement, target included, is defensible from that company's public material. At least one axis reflects the target's real differentiator, and competitors are not picked afterwards to fill in a flattering picture. The target may sit alone in its quadrant only if the callout explains the white space and at least one competitor shares one of its axis positions.

**Subtitle and callout.** The subtitle is one neutral sentence on how the market divides. The callout is "**Our take:**" plus one line on where the target wins, then 2 bullets on market dynamics that criticize categories rather than named competitors, then 1 underlined bullet tying to a How-we-can-help proposal.

**Writing rules (controlled language).**

- *Sentence shape:* one idea and one main clause per bullet; subject–verb–object; active voice; present tense. Headers ≤ 12 words; bullets ≤ 14 words. No semicolons, em or en dashes, parentheses, rhetorical questions, or exclamation marks.
- *Simplification and low cognitive load:* common words over formal ones; at most two modifiers before a noun; acronyms only if universal (AI, SMB) or the company's own; the company's full name first, its own short form allowed afterwards; numbers only when a primary source states them.
- *Controlled vocabulary:* product and category terms in the company's own words. A banned list of AI-sounding words and patterns, including *leverage, seamless, robust, empower, unlock, delve, cutting-edge, best-in-class, game-changer, revolutionize, synergy, holistic, innovative, world-class*, "not just X but Y", triads of adjectives, "in today's … landscape", and hedges or intensifiers (*truly, incredibly, potentially*). "Unlock" is banned everywhere despite its use on Recur's slide 5.
- *Tone:* no hype, flattery, or second-guessing the founder; plain investor English. The **swap test** (would the bullet still read true with another company's name?) flags a generic bullet as a quality note.

**Enforcement.** Deterministic validation code is required; leaving all judgment to the model drifts. Code checks everything countable: word counts, banned words and patterns, forbidden punctuation, digits lacking a matching source entry, company-name spelling, and notes completeness (every thesis bullet, competitor, and both axes have a source entry). A failure triggers the bounded repair allowed by [Define first-try success and the release bar](04-define-first-try-success.md). The model judges what code cannot: human tone, the swap test, and whether each claim matches its source.

**Sparse evidence.** Say less rather than invent more. "Why we're excited" may stay product-level, "Why we're here" leans on category sources, "How we can help" stays anchored to the product type; all six bullets remain required. If sources cannot establish what the company sells and to whom, the run's evidence has failed; its terminal behavior belongs to [Define unattended generation and failure behavior](07-define-unattended-run.md).

**Contradictory evidence.** Current primary material beats third-party; newer beats older; an unresolved conflict keeps the claim off the slide and is noted in the source record. HQ, which the landmark requires, comes from the official site's own headquarters designation (about, contact, or legal footer), is recorded in slide 1 notes, and is stated in the chat reply.

## Amendment — September 18, 2026

Amended after the ticket 09 practice runs, in a live grilling exchange with the
user. The runs produced decks whose slide 2 and slide 3 copy read, in the user's
words, "rote and AI generated": the word "now" opening three consecutive
sub-bullets, the three headers alike in length and shape, and all six bullets
built the same way.

**What the measurements showed.** The rules above were not being strained by the
model. They were producing the defect.

- The reference deck's own human copy already fits the limits it was assumed to
  be fighting: headers of 8, 8 and 11 words, bullets of 11 to 14. The generated
  copy was *shorter* than the cap, not pressed against it.
- The reference's six bullets vary *less* in length than the generated ones
  (character spread sd 3.0 against sd 7.3). Length variance is not what makes
  the reference read as human, so requiring it would not have helped.
- What differs is structure. The reference carries a subordinate or participial
  clause in 3 of its 6 bullets and a comma in 2; the generated copy carried
  neither in any bullet. "One idea and one main clause per bullet;
  subject–verb–object; active voice; present tense" produces precisely that
  flatness, and the present-tense mandate applied to a market observation is
  what produced "now".
- Recur's own introduction slides fail the gate that polices copy written to
  imitate them. Of 23 transcribed lines from slides 4–9, 10 are refused: on the
  banned list ("unlock" on slide 5, which this decision already acknowledged
  overriding), on punctuation (an en dash on slide 7, parentheses on 8, a
  semicolon on 9), and on the word counts.

**What changes.**

- **Sentence shape.** The subject–verb–object, one-main-clause and present-tense
  mandates are withdrawn. In their place: across the six thesis bullets, at
  least two must carry a subordinate or participial clause — a fronted
  condition, a trailing consequence, or a qualifier. Enforced in code, because
  it is the one property of the set that no per-field rule could ever see.
- **The banned word list is deleted**, in full, with the suffix matching behind
  it. The user's reasoning, which this decision adopts: forbidding a word only
  moves the model to the next one, "until there are no words left to take away".
- **The punctuation rules are deleted**, except the question mark, which still
  stands in for the ban on rhetorical questions. Semicolons, dashes, parentheses
  and exclamation marks are permitted, as they are on slides 4–9.
- **The banned phrase patterns are deleted** ("not just X but Y", "in today's …
  landscape"), for the same reason as the word list.
- **Word limits.** Bullets move from 14 to 16 words, which is what the box
  holds. Headers stay at 12, now understood as slack rather than a limit: after
  the bold section label the header line fits about 9 to 10 words, so the fit
  estimate binds first and the number never does.
- **A voice exemplar is introduced.** `reference/voice.md` carries the prose of
  slides 4–9 with the writing annotated, and the model's copy review measures
  against it instead of against a list of prohibitions.

**The bet, stated plainly.** This decision originally held that "leaving all
judgment to the model drifts", and deleting two lists moves the other way. That
is deliberate and provisional. The user's instruction: "start with few
regulations, and just enforce sounding like 4-9, and we'll add regulations if the
writing turns out to be bad." The next practice runs decide whether rules come
back, and which ones.

After this amendment the content gate still enforces word counts, the fit
estimate, unsourced numbers, the company's name, source-record completeness, the
market map's distribution, and the new sentence-structure check. Every judgment
about vocabulary and tone now belongs to the model, against the exemplar.

## Amendment — September 24, 2026

Amended by [Make the single-line fit check exact, so a header cannot
wrap](../../recur-sell-deck-tune/issues/02-a-header-that-cannot-wrap.md).

**The word limits stand at 12 and 16. What changes is the reason given for the
header's 12**, which the September 18 amendment recorded as "slack rather than a
limit: after the bold section label the header line fits about 9 to 10 words, so
the fit estimate binds first and the number never does."

The fit estimate did not bind first: it carried a 10% allowance that let every
one of these headers through, and three of them wrapped onto their bullets in
the September 2026 runs. That allowance is gone and a line now has to fit its
box.

"The number never does" is also true only of long words. Twelve ordinary words
overrun the line at 8.34in of 5.55in, but "The way these fleets buy has not yet
caught up" is ten words in 4.35in of it, and fifteen short words sit in 4.49in
of a 7.01in bullet column. So the two rules do not cover each other: the width
rule is about what fits, the word count is about what a founder should have to
read, and either can fire first depending on the words.
