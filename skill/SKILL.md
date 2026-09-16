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
cover, is built from the target company's real headquarters city. Slides 2 and 3
are laid out but deliberately empty of content in this version.

**Establish only what this build needs: the company, its headquarters, and its
logo.** Do not write thesis copy, choose competitors, or add photos or speaker
notes of your own. The generator owns every slide.

The one judgment this build asks of you is whether a logo really belongs to the
target company. Everything else about the logo - converting it, sizing it,
deciding whether it suits the cover - is the generator's.

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

### 3. Write the run file

Write `run.json` to a working directory, with what you established:

```json
{
  "company": "US Fleet Tracking",
  "headquarters": {
    "city": "Oklahoma City, Oklahoma",
    "source": "https://www.usfleettracking.com/contact-us"
  },
  "identification": "Matched the prompt to usfleettracking.com, a private fleet tracking company.",
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

### 4. Build the deck

```
node <skill-dir>/scripts/build-deck.js --input run.json
```

Use it as-is. Do not install packages; everything it needs is bundled. It
searches Wikimedia Commons for a photo of the headquarters city, gives it the
deck's navy duotone, builds the cover from it, and writes
`Recur x <Company>.pptx` to the downloadable outputs directory. On success it
prints `{"ok": true, "file": "...", "slides": 9, "landmark": "..."}`.

### 5. Present that file to the user as a download.

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
