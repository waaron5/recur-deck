---
name: recur-sell-deck
description: Builds a Recur sell deck for a target software company as a downloadable nine-slide PowerPoint. Use when the user asks to create, make, or generate a Recur sell deck for a named company. Runs unattended and returns the file in the same turn.
---

# Recur sell deck

A run is one company-name prompt through to one delivered deck, with no user
message in between. **Never ask the user a question.** A clarifying question
fails the run. Every case below has a decided answer: an ambiguous name is
settled from evidence, a missing photo steps down a ladder, and evidence you
cannot establish ends the run with an explanation instead of a question.

**Do not narrate progress.** No running commentary, no stage announcements. The
run is silent until it delivers, and then it uses one of the three replies at the
bottom of this file.

## Scope of this build

Slides 4-9 are Recur's fixed introduction and ship with this skill. Slide 1, the
cover, is built from the target company's real headquarters city. Slide 2 is the
thesis page and slide 3 the market map, both written from what you establish
about the company.

**Establish what this build needs: the company, its headquarters, its logo, the
thesis, and the market map.** Do not add photos of your own, and do not write
speaker notes - the generator writes those from the sources you record.

The judgments are yours: whether a logo really belongs to the company whose name
is on it, what the thesis says, and which competitors and axes the market map
argues from. Everything else - converting and sizing every logo, placing them so
that none overlaps, laying out the slides, placing the type - is the
generator's.

## Run

### 0. Start the run

```
node <skill-dir>/scripts/start-run.js --work work
```

It checks the sandbox can reach a non-package host and that this skill unpacked
whole, and writes down the moment the run began.

```json
{"ok": true, "startedAt": 1758067200000, "state": "work/run-state.json"}
```

**If it prints `"ok": false`, stop.** Do not research, do not build. Reply with
the evidence failure template, using the `fix` line exactly as it comes back. The
usual cause is the sandbox's default "Package managers only" allowlist, and the
fix is one setting. Finding that out here costs seconds; finding it out at the
cover photo costs most of the run.

### 1. Identify the company and its headquarters

Read the company name from the prompt, exactly as the user wrote it. Then find,
from the company's **own website** (an about, contact, or legal footer page),
the city it is headquartered in. Keep the URL of the page that states it.

Prefer the company's own material over aggregators. Crunchbase, ZoomInfo and
LinkedIn are not sources for a headquarters.

If you fetch the company's site from the sandbox, send a full Chrome
user-agent string. Ordinary sites answer the bare default with a 403, which
makes a reachable company look like it has no website.

**When the name is ambiguous, settle it in this order and never by asking:**

1. A website URL in the prompt decides it outright.
2. Other hints in the prompt - a city, a sector, a size - rank the candidates.
3. Otherwise prefer a private software business with its own website, and then
   the one whose site and search presence is most prominent.

Record the losing candidates and why each lost in `rejected`. State the
assumption in the reply as one line. If no candidate is a software business, run
the most prominent one as a best-effort target and add the best-effort line to
the reply.

**The evidence floor.** What the company sells and who buys it must come from
the company's own site or its own channels. If that site is unreachable, or is a
JavaScript shell or a "coming soon" page, **two independent sources that agree**
will do, and the reply says the facts came from third parties.

If you can establish neither, that is an **evidence failure**: build nothing and
reply with the evidence failure template. A deck whose facts were invented is
worse than no deck, because a founder reads it.

### 2. Find the company's logo, and check it yourself

```
node <skill-dir>/scripts/fetch-logo.js --site <company site> --out work
```

It fetches the company's home page, ranks the logo candidates on it, and writes
the best one to `work/logo.png` as a trimmed transparent PNG, converting from
SVG or WebP as needed. It prints where the image came from.

**Now look at `work/logo.png`.** Candidates are ranked by pattern, and patterns
pick the wrong company: on a ten-site trial the ranking alone chose a customer's
logo three times and a product sub-brand once. Confirm the image is the target
company's own current logo - not a customer's, not a partner's, not a sub-brand
of its product.

Only if you are sure, record it as `verified` in the run file. If you are not
sure, or the command fails, leave the logo out entirely; the cover then sets the
company's name as type, which is a designed outcome and not a defect.

### 3. Write the thesis

Slide 2 carries three sections. Their roles are fixed and must not drift into
each other.

| Key | What it says | Drawn from |
| --- | --- | --- |
| `here` | A market or category observation, stated as Recur's view | Category sources |
| `excited` | Company facts only: what the product does, who it serves, how it is sold | The company's own material |
| `help` | Recur proposals, phrased as offers | Recur's introduction, slides 5-6 |

Each section gets a header and **exactly two** bullets. Every bullet carries at
least one source, which the generator pairs with it in slide 2's speaker notes.

**Never assert a weakness of the target.** "They have no outbound motion" is an
invented fact and a critical defect, and so is "strengthen their organic growth
with an outbound team", which asserts the same absence in softer words. Write
the help bullets as offers - "build ...", "apply ..." - drawn from Recur's
go-to-market, product, payments and AI strengths, and promise only what slides
5-6 actually back up.

**Sources rank:** the official website first, then the company's own channels
(press releases, help docs, pricing pages, job posts), then independent
coverage. Crunchbase and ZoomInfo estimates are never facts. Use a number only
when a primary source states it.

**Writing rules.** Headers stay within 12 words and bullets within 14. One idea
per bullet, active voice, present tense, plain investor English a human would
write. No semicolons, dashes, parentheses or exclamation marks. Avoid *leverage,
seamless, robust, empower, unlock, delve, cutting-edge, best-in-class,
game-changer, revolutionize, synergy, holistic, innovative, world-class*, "not
just X but Y", and hedges like *truly* or *potentially*. If a bullet would read
just as true with another company's name in it, it is too generic.

**Sparse evidence means saying less, not inventing more.** All six bullets stay
required; they may stay product-level and category-level.

### 4. Build the market map

Slide 3 argues where the target sits in its landscape. Choose two axes, pick the
competitors, place everyone, and write the callout.

**Competitors: six to nine, plus the target.** Each one must currently sell,
under the brand shown, a product solving the same core problem for an
overlapping buyer, and you must have seen that on the company's **own site**.
Acquired brands still trading are fine. Rule out the merely adjacent, the
defunct, and brands absorbed out of existence. A horizontal platform with a
minor module counts only if buyers visibly compare the two. Mix recognised
category leaders with peers of the target's own size.

**A thin field gets one more search, not a padded list.** With fewer than six
eligible competitors, search once more and more broadly, including the
horizontal platforms buyers visibly compare with the target. Five placed is
accepted and is a quality note. Fewer than five after that second search is a
critical defect: build the deck, flag it, and say so. Never pad the list with
adjacent or defunct companies to reach a number.

**Axes: two two-sided categorical dimensions buyers actually choose on** -
segment, commitment or delivery model, vertical depth, deployment, pricing
model. Never a subjective quality and never a "leader" score. At least one axis
must reflect the target's real differentiator. Choose the axes first and the
competitors second: picking companies afterwards to fill in a flattering
quadrant is exactly what this slide must not do.

**Placement.** Give every company an `x` and a `y` between 0 and 1, where 0 is
the axis's `low` side and 1 its `high` side. Every placement, the target's
included, must be defensible from that company's public material. Two rules the
generator enforces, so plan for them rather than discovering them:

- at most **four** companies in any one quadrant;
- at least **three** of the four quadrants hold a competitor.

Spread the coordinates. The generator nudges overlapping logos apart inside
their own quadrant, but it will never move a company across an axis to make room,
because that would change what you said about it.

**Each company carries its own `evidence` and `placement`**, which go into slide
3's speaker notes: a URL on its own site showing it competes, and one line on
why it sits where you put it. Each axis carries its own `reasoning`.

**Competitor logos are optional and are fetched the same way the target's was**,
one company at a time:

```
node <skill-dir>/scripts/fetch-logo.js --site <competitor site> --out work/<name>
```

Look at each one and confirm it is that company's own current logo before
recording it as `verified`. A company with no logo is set as a text wordmark,
which is a designed outcome; a company wearing someone else's logo is a critical
defect. If more than about a third of the competitors would be text wordmarks,
swap in an equally eligible alternate that has a usable logo - but never drop a
category leader over its logo, and never exceed nine to fix it.

**The callout** is three parts, in this order: `take`, one line on where the
target wins; `dynamics`, exactly two bullets on how the market behaves; and
`proposal`, one bullet tying back to a How-we-can-help offer. The dynamics
bullets criticise **categories, never named companies**. If the target ends up
alone in its quadrant, the callout has to explain that white space.

The subtitle is one neutral sentence on how the market divides. The writing
rules from step 3 apply to every line on this slide.

### 5. Write the run file

Write `run.json` into the same working directory as `run-state.json`, with what
you established:

```json
{
  "company": "US Fleet Tracking",
  "headquarters": {
    "city": "Oklahoma City, Oklahoma",
    "source": "https://www.usfleettracking.com/contact-us",
    "metro": "Oklahoma City, Oklahoma",
    "region": "Oklahoma"
  },
  "identification": "Matched the prompt to usfleettracking.com, a private fleet tracking company.",
  "rejected": [
    "US Fleet Tracking LLC of Tulsa: no website of its own"
  ],
  "thesis": {
    "here": {
      "header": "Commercial fleets are mid-cycle in adopting real-time telematics",
      "bullets": [
        {
          "text": "Small commercial fleets still coordinate dispatch on homegrown tools",
          "sources": ["https://www.fleetowner.com/technology/telematics"]
        },
        {
          "text": "Enterprise telematics platforms price and configure for large fleets",
          "sources": ["https://www.samsara.com/pricing"]
        }
      ]
    },
    "excited": {
      "header": "US Fleet Tracking sells live GPS tracking without long contracts",
      "bullets": [
        {
          "text": "Vehicle locations refresh on a live map every ten seconds",
          "sources": ["https://www.usfleettracking.com/"]
        },
        {
          "text": "Live tracking and in-vehicle video run in one app",
          "sources": ["https://www.usfleettracking.com/products"]
        }
      ]
    },
    "help": {
      "header": "Bring Recur's go-to-market and AI strengths to US Fleet Tracking",
      "bullets": [
        {
          "text": "Apply Recur's go-to-market team to the live tracking product",
          "sources": ["Recur introduction, slide 5"]
        },
        {
          "text": "Build AI features on the tracking and video data the product captures",
          "sources": ["Recur introduction, slide 6"]
        }
      ]
    }
  },
  "marketMap": {
    "subtitle": "Fleet telematics splits between enterprise platforms and simple trackers",
    "axes": {
      "x": {
        "name": "Commitment model",
        "low": "Contract-bundled platform",
        "high": "No-contract live tracking",
        "reasoning": "Buyers choose first on whether tracking comes with a multi-year contract."
      },
      "y": {
        "name": "Fleet segment focus",
        "low": "Enterprise and large fleets",
        "high": "SMB commercial fleets",
        "reasoning": "Pricing and onboarding differ sharply between small and enterprise fleets."
      }
    },
    "companies": [
      {
        "name": "US Fleet Tracking",
        "target": true,
        "x": 0.76,
        "y": 0.84,
        "evidence": "https://www.usfleettracking.com/",
        "placement": "Sells live tracking to small fleets with no contract required.",
        "logo": { "file": "work/logo.png", "source": "https://www.usfleettracking.com/", "verified": true }
      },
      {
        "name": "Samsara",
        "x": 0.1,
        "y": 0.36,
        "evidence": "https://www.samsara.com/",
        "placement": "Prices and configures for large fleets on multi-year contracts."
      }
    ],
    "callout": {
      "take": "US Fleet Tracking wins small fleets that want fast tracking without a contract",
      "dynamics": [
        "Enterprise platforms bundle long contracts and features small fleets rarely use",
        "AI-first entrants chase trucking compliance more than quick live tracking"
      ],
      "proposal": "Recur can add AI scoring to the GPS and video the product already streams"
    }
  },
  "logo": {
    "file": "work/logo.png",
    "source": "https://www.usfleettracking.com/images/usft-logo-white.webp",
    "verified": true
  }
}
```

`identification` is one line on how you settled which company was meant, and
`rejected` lists the candidates you ruled out. Both go into slide 1's speaker
notes, never onto a slide. So does the logo's source.

`metro` and `region` are what the cover photo falls back to when the
headquarters city has no usable photo on Commons. Give the nearest major metro
within about 60km, and the state or region. Leave `metro` out when the city *is*
the major metro.

`verified` must be `true` only because you looked at the image. A logo without
it is never placed.

### 6. Check the copy, then read it yourself

```
node <skill-dir>/scripts/check-content.js --input run.json
```

It reports everything countable: word counts, the banned list, forbidden
punctuation, a number with no source behind it, the company's name spelled some
other way, a missing source entry, a quadrant holding too many companies, and
text too long for the box it has to sit in. Every finding names one field.

```json
{"ok": false, "findings": [
  {"slide": 2, "field": "thesis.here.header", "rule": "word-count",
   "message": "14 words, and a header stays within 12 words: shorten it"}
]}
```

**Rewrite only the fields it names, then run it again**, until it prints
`{"ok": true, "findings": []}`. Text that does not fit gets shorter. Never ask
for smaller type: type sizes are fixed design values and the generator will not
change them.

Each failing check spends one of the run's three content rounds and prints which
one it was. When they are gone it prints `"budgetSpent": true` and an `advice`
line: stop rewriting and deliver a flagged deck. A check that passes costs
nothing.

**Then read the copy once yourself**, for the three things code cannot judge.

- **Tone.** Does this read like someone who knows the market, or like a template
  with the company's name dropped into it?
- **The swap test.** Would a bullet read just as true with another company's
  name in it? Then it says nothing about this one, and it needs rewriting.
- **Claim against source.** Does each bullet say what its sources actually say,
  and does every "why we're excited" bullet stay a company fact rather than an
  inference about one?

Rewrite only the fields that fail, and run the check once more afterwards: a
rewrite can break a word count.

### 7. Build the deck

```
node <skill-dir>/scripts/build-deck.js --input run.json
```

Use it as-is. Do not install packages; everything it needs is bundled. It
searches Wikimedia Commons for a photo of the headquarters city, gives it the
deck's navy duotone, builds the cover from it, and writes
`Recur x <Company>.pptx` to the downloadable outputs directory. On success it
prints `{"ok": true, "file": "...", "slides": 9, "landmark": "...",
"landmarkFile": "work/landmark.jpg"}`.

It runs the same content check first and refuses to build copy that fails it, so
a skipped step 6 costs a round rather than mailing bad copy to a founder. It then
reopens the file it wrote and checks it: nine slides, slides 4-9 in order, notes
on slides 1-3. A deck that fails this is a fault in the package, not in your
copy; report the error rather than rewriting the deck around it.

**The cover photo steps down a ladder** when the headquarters city has nothing
usable: a landmark in the city, then the city's skyline, then the nearest major
metro, then the region. The bottom two rungs are quality notes and must be named
in the reply's `Fallbacks:` line. If every rung fails there is no cover photo,
which is a critical defect: flag the deck.

### 8. Render the slides, and look at them

**No deck is delivered unseen.**

```
node <skill-dir>/scripts/render-deck.js --input "<the file build-deck.js printed>" --out work/render --work work
```

It renders slides 1-3 to PNGs in about two seconds and prints where they landed.

`--work` is the directory holding `run.json`, so this can find the run's state.
Each render spends one of the run's **two** render rounds. When they are gone it
refuses before starting a converter and tells you to deliver a flagged deck
instead.

**Now open those three images and look at them.** You are checking for things
only an eye catches:

- text that overflows its box, is clipped, or runs under another element;
- anything overlapping: a logo on an axis line, two logos touching, copy over
  the callout sidebar;
- text too small or too low-contrast to read;
- a logo that landed wrong, stretched, or in the wrong place.

The rendered image predicts PowerPoint. The deck is set in Arial and the
renderer substitutes Liberation Sans, which has the same metrics, so lines break
in the image where they break for the founder.

**Every fix is shorter copy.** Rewrite the offending field in `run.json` to say
the same thing in fewer words, then run step 6, step 7 and this step again. Never
ask for smaller type, a wider box, or a moved element: type sizes and geometry
are fixed design values.

On the rebuild, add the photo you already have to `run.json` so the cover keeps
the same picture and the run does not pay for the download twice:

```json
"landmark": { "file": "work/landmark.jpg", "fallback": "metro landmark (Dallas, Texas)" }
```

Carry `fallback` back too, when the cover came from one, so the rebuilt deck's
notes still record which rung it settled for.

### 9. Present that file to the user as a download.

## Repairs are bounded

A run may rewrite its way out of trouble **three times on copy and twice on
renders**, and may start **no new round once it is about twelve minutes old**.
Each round touches only the fields that failed.

When the budget runs out with a critical defect still standing, stop repairing
and deliver a **flagged deck**:

```
node <skill-dir>/scripts/build-deck.js --input run.json --flagged
```

That writes `Recur x <Company> - NOT READY.pptx`. It changes the file's name and
**nothing on the slides**: do not add a warning to a slide, and do not remove the
offending element.

A flagged build is the one build that does not refuse copy the content gate
failed - refusing would leave nothing to hand over. It prints what is still
wrong as `findings`, and those go straight into the reply's `--defects`, one
line each with the slide each sits on.

Critical defects are: wrong or invented company facts, a logo belonging to
another company, a competitor that does not exist or does not compete, a missing
required element, text that overflows or is illegible, fewer than five placed
competitors, no cover photo, a wrong slide count or order, and a file that will
not open. Everything else - a generic bullet, a skyline instead of a landmark, a
debatable axis - is a quality note and does not flag the deck.

## Reply

Use one of these three, and nothing else. Keep it to about six lines. Do not
narrate the steps you took, and do not offer to run it again or ask what to do
next.

**Build it, do not compose it:**

```
node <skill-dir>/scripts/reply.js --work work --outcome clean \
  --company "<name as given>" --headquarters "<headquarters city>"
```

It prints the reply to say. Copy it out as it comes. It fills in the
`Fallbacks:` line from what the run recorded along the way, so that does not
depend on you remembering it.

| Flag | When |
| --- | --- |
| `--assumption "<one line>"` | the company name was ambiguous |
| `--defects "3:<what>\|1:<what>"` | `--outcome flagged`, one entry per surviving defect |
| `--best-effort "<reason>"` | the target is outside the covered scope |
| `--could-not-establish`, `--tried`, `--fix` | `--outcome evidence-failure` |

`--defects` takes what `build-deck.js --flagged` printed, and adds it to
anything the run already recorded.

**A clean deck:**

```
[download card]
Company: <name as given>, <headquarters city>
Assumed: <one line>            (only if the name was ambiguous)
Fallbacks: <what was settled for>   (only if anything fell back)
```

**A flagged deck** leads with what is wrong, then says everything a clean deck
says:

```
⚠ Not ready to mail. 2 issues remain:
- slide 3: only four competitors could be evidenced
- slide 1: no usable cover photo was found
[download card]
Company: <name as given>, <headquarters city>
```

**An evidence failure** delivers no file at all:

```
No deck this time. I could not establish <what>.
Tried: <where you looked>
Fix: <what to send instead>
```

The fix is normally to resend with the website, as in `Create a Recur sell deck
for Acme (acme.com)`. When step 0 reported a blocked sandbox, the fix is its
line: `Set Settings > Capabilities > Domain allowlist to All domains, then
resend.`

**A target outside the covered scope** - not a private software business, or
with no findable site or headquarters - runs exactly the same pipeline under the
same gates, and adds one line. Pass `--best-effort "<reason>"` and the reply
carries it:

```
Outside the covered scope (<reason>); treat as best-effort.
```

## Reference

- `reference/visual-rules.md` - page geometry, palette, type, the cover's
  treatment and its landmark ladder, and the rule that overflow is fixed by
  shortening copy, never by shrinking type.
