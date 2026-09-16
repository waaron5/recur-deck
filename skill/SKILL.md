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

Slides 4-9 are Recur's fixed introduction and ship with this skill. Slides 1-3
are laid out but deliberately empty of content in this version.

**Do not research the company, and do not add copy, logos, photos, or speaker
notes of your own.** The generator owns every slide. Run it, return the file,
and reply with the template below.

## Run

1. Read the company name from the prompt, exactly as the user wrote it.
2. Run the bundled generator from this skill's directory:

   ```
   node <skill-dir>/scripts/build-deck.js --company "<company name>"
   ```

   Use it as-is. Do not install packages; everything it needs is bundled. It
   writes `Recur x <Company>.pptx` to the downloadable outputs directory and
   prints `{"ok": true, "file": "...", "slides": 9}`.

3. Present that file to the user as a download.

## Reply

Keep it to these two lines. Do not narrate the steps you took.

```
[download card]
Company: <name as given>
```

If the generator fails, give one line saying the deck could not be built and
one line with the error it printed. Do not offer to retry or ask what to do.

## Reference

- `reference/visual-rules.md` — page geometry, palette, type, and the rule that
  overflow is fixed by shortening copy, never by shrinking type.
