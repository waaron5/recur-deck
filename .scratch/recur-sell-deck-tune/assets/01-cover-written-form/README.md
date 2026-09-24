# Cover covers, looked at — decision 01

What settled [the cover's written form and its
styling](../../issues/01-cover-name-in-the-brands-own-hand.md). Kept because the
ticket's **Done when** asks for a built cover to have been looked at for each of
five prototype companies, and a claim that someone looked is worth less than the
thing they looked at.

## How these were made

The written forms were **measured, not assumed**: each company's masthead was
fetched with the skill's own `scripts/fetch-logo.js` and the mark looked at.

| Company, as typed | Written form | What differs |
| --- | --- | --- |
| Shopmonkey | `shopmonkey` | set lowercase |
| GPS Insight | `GPSINSIGHT` | closed up, all capitals |
| Teletrac Navman | `Teletrac Navman` | written as given |
| Linxup | `linxup` | set lowercase |
| Azuga | `azuga` | set lowercase |

Two of the five are worth knowing about. Shopmonkey's masthead ranking returned
**Google's logo** — the customer-wall failure SKILL.md warns about — and the
mark it did find is a 31px symbol with no letters in it, so its written form was
read off the company's own social card instead. Azuga's mark carries a `™` and
"a Bridgestone Company" beneath it, neither of which is part of the name.

`five-covers-chosen.jpg` is built through the **shipped bundle**, run exactly as
a run builds a deck. The two rejected strips are single-slide prototypes, which
is enough to judge a treatment.

## What is in each

- **`five-covers-chosen.jpg`** — the chosen treatment on all five, over the
  Oklahoma City skyline. Bold white at the reference's 0.269in cap height.
  `Teletrac Navman` wraps to two lines inside its 0.9in box, which is what that
  box is for.
- **`rejected-tracking-and-typed-name.jpg`** — Shopmonkey and GPS Insight, each
  three ways: chosen, then +1pt tracking, then the typed name. Tracking pulls
  the target toward RECUR's own tracked mark across the divider, so the two read
  as one voice instead of two parties. The typed name reads as a document title.
- **`rejected-two-tone.jpg`** — a two-tone split at an internal capital, on the
  three names that have one. It contradicts the reference directly on
  `USFleetTracking`, and it has no answer at all for `linxup`, `azuga` or
  `shopmonkey`.

## Why the two-tone split lost on a number, not on taste

Measured over the band the marks sit in, at its 90th percentile, treated the way
every cover photo is treated:

| Photograph | White type | Cyan `D0F6FF` |
| --- | --- | --- |
| Oklahoma City skyline | 7.71:1 | 6.73:1 |
| Glendale Casa Adobe (bright) | **5.97:1** | **5.20:1** |

The reference cover holds **5.83:1**. A second colour puts half the company's
name under the floor that decision 13's whole duotone exists to clear.

## What these are not

A **render check**. LibreOffice is not on the build machine, so these were
rendered with macOS Quick Look, the way ticket 13's covers were. The supported
host's own render is still owed, on the next practice run.
