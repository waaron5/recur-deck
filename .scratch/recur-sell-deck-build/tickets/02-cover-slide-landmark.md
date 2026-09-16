# 02: Cover slide with a real headquarters landmark

**What to build:** The cover stops being a placeholder. A run establishes the target company's headquarters city from the company's own site, finds a photo of a recognisable landmark in that city, and builds the cover from it: the photo fills the slide, largely desaturated and tinted with a premium navy duotone, with the white Recur wordmark, a thin white divider, and the target company's name centred over it. The target's name is set as a text wordmark for now; the logo pipeline arrives in ticket 03.

Slide 1's speaker notes start carrying their part of the source record: how the company was identified, the headquarters city and the source that states it, and the landmark photo's file name, author, and licence. None of that appears on the slide.

The photo comes from Wikimedia Commons through its API, downloaded at 1920 px wide and falling back to 1280 px, then cropped to 16:9. Every sandbox fetch sends a full Chrome user-agent string; without it ordinary sites answer 403. The landmark fallback ladder and the no-photo outcome belong to ticket 08 — this ticket needs only the happy path plus an honest failure when no photo is found.

Decisions this implements: the cover layout and landmark treatment in [Choose the slide layouts and asset strategy](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md), the headquarters evidence rule in [Define the evidence and investment judgment behind each pitch](../../recur-sell-deck/issues/05-define-investment-judgment.md), and the user-agent constraint recorded in [Choose the demonstration and fresh-user validation plan](../../recur-sell-deck/issues/08-define-submission-validation.md).

**Blocked by:** 01 (Skill package skeleton that delivers a nine-slide deck).

**Status:** ready-for-agent

- [ ] For a covered target, the cover shows a photo clearly tied to that company's headquarters city, at least ~1600 px wide and unwatermarked.
- [ ] The photo is desaturated and navy-tinted so the city reads cleanly and the white wordmarks stand out.
- [ ] The Recur wordmark is placed from the bundled prerendered PNG and never depends on a font being installed.
- [ ] The target's name renders as a clean text wordmark sized to its slot, never a broken image or placeholder.
- [ ] Slide 1's speaker notes name the headquarters city with its source, and the photo's file name, author, and licence.
- [ ] Nothing about the photo's credit or source appears on the visible slide.
