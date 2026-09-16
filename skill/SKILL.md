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

**Establish only what this build needs: the company and its headquarters.** Do
not write thesis copy, choose competitors, or add logos, photos or speaker notes
of your own. The generator owns every slide.

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

### 2. Write the run file

Write `run.json` to a working directory, with what you established:

```json
{
  "company": "US Fleet Tracking",
  "headquarters": {
    "city": "Oklahoma City, Oklahoma",
    "source": "https://www.usfleettracking.com/contact-us"
  },
  "identification": "Matched the prompt to usfleettracking.com, a private fleet tracking company."
}
```

`identification` is one line on how you settled which company was meant. It goes
into slide 1's speaker notes, never onto a slide.

### 3. Build the deck

```
node <skill-dir>/scripts/build-deck.js --input run.json
```

Use it as-is. Do not install packages; everything it needs is bundled. It
searches Wikimedia Commons for a photo of the headquarters city, gives it the
deck's navy duotone, builds the cover from it, and writes
`Recur x <Company>.pptx` to the downloadable outputs directory. On success it
prints `{"ok": true, "file": "...", "slides": 9, "landmark": "..."}`.

### 4. Present that file to the user as a download.

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
