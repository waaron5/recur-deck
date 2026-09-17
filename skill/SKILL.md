---
name: recur-sell-deck
description: Builds a Recur sell deck for a target software company as a downloadable nine-slide PowerPoint. Use when the user asks to create, make, or generate a Recur sell deck for a named company. Runs unattended and returns the file in the same turn.
---

# Recur sell deck

A run is one company-name prompt through to one delivered deck, with no user
message in between. **Never ask the user a question.** A clarifying question
fails the run. If something cannot be established, say so in the reply instead
of asking.

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

### 1. Identify the company and its headquarters

Read the company name from the prompt, exactly as the user wrote it. Then find,
from the company's **own website** (an about, contact, or legal footer page),
the city it is headquartered in. Keep the URL of the page that states it.

Prefer the company's own material over aggregators. Crunchbase, ZoomInfo and
LinkedIn are not sources for a headquarters.

If you fetch the company's site from the sandbox, send a full Chrome
user-agent string. Ordinary sites answer the bare default with a 403, which
makes a reachable company look like it has no website.

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
defect.

**The callout** is three parts, in this order: `take`, one line on where the
target wins; `dynamics`, exactly two bullets on how the market behaves; and
`proposal`, one bullet tying back to a How-we-can-help offer. The dynamics
bullets criticise **categories, never named companies**. If the target ends up
alone in its quadrant, the callout has to explain that white space.

The subtitle is one neutral sentence on how the market divides. The writing
rules from step 3 apply to every line on this slide.

### 5. Write the run file

Write `run.json` to a working directory, with what you established:

```json
{
  "company": "US Fleet Tracking",
  "headquarters": {
    "city": "Oklahoma City, Oklahoma",
    "source": "https://www.usfleettracking.com/contact-us"
  },
  "identification": "Matched the prompt to usfleettracking.com, a private fleet tracking company.",
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

`identification` is one line on how you settled which company was meant. It goes
into slide 1's speaker notes, never onto a slide. So does the logo's source.

`verified` must be `true` only because you looked at the image. A logo without
it is never placed.

### 6. Build the deck

```
node <skill-dir>/scripts/build-deck.js --input run.json
```

Use it as-is. Do not install packages; everything it needs is bundled. It
searches Wikimedia Commons for a photo of the headquarters city, gives it the
deck's navy duotone, builds the cover from it, and writes
`Recur x <Company>.pptx` to the downloadable outputs directory. On success it
prints `{"ok": true, "file": "...", "slides": 9, "landmark": "..."}`.

### 7. Present that file to the user as a download.

## Reply

Keep it to these two lines. Do not narrate the steps you took.

```
[download card]
Company: <name as given>, <headquarters city>
```

If the generator fails, give one line saying the deck could not be built and one
line with the error it printed. Do not offer to retry or ask what to do.

A failure that mentions the photo download usually means the sandbox cannot
reach Wikimedia. The fix is Settings > Capabilities > Domain allowlist set to
**All domains**. Say that in the second line.

## Reference

- `reference/visual-rules.md` - page geometry, palette, type, the cover's
  treatment, and the rule that overflow is fixed by shortening copy, never by
  shrinking type.
