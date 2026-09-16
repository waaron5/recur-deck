---
name: recur-capability-probe
description: Throwaway capability check for the Recur sell-deck workflow. Use only when the user asks to "run the Recur capability probe". Tests web research, image downloads from the code sandbox, bundled PptxGenJS execution, PPTX output, rendering, and image inspection.
---

# Recur capability probe

This is an unattended test. Do not ask the user any questions; if a step fails, record the failure and continue to the next step. Keep each step's evidence exact (tool names, HTTP statuses, error text).

## Steps

1. **Web research.** Use web search (and web fetch if available) to find, for the company **US Fleet Tracking**:
   - headquarters city;
   - official website domain;
   - a direct image URL (ending in .png/.jpg/.svg or similar) for the company logo, taken from the official website if possible;
   - a direct `upload.wikimedia.org` image URL (JPEG preferred, at most about 2000 px wide, e.g. a `/thumb/` URL) for a well-known landmark in or near the headquarters city.
   Record which research tools you had and whether each lookup succeeded.

2. **Run the probe script** from this skill's directory (the one containing this SKILL.md):

   ```
   node <skill-dir>/scripts/probe.js --logo "<logo url>" --landmark "<landmark url>" --domain "<domain>"
   ```

   Use the bundled script as-is; do not install packages. It writes `recur-capability-probe.pptx`, `probe-report.json`, and (if rendering works) `probe-render/slide-*.png` to the downloadable outputs directory and prints a JSON report.

3. **Inspect the rendered images.** If the report lists render PNGs, open and view each one with your image-viewing capability. Say briefly what you actually see on each slide (background image, logo, text, overflow or clipping). If you cannot view images, say so exactly.

4. **Return the file.** Present `recur-capability-probe.pptx` to the user as a downloadable file.

5. **Final report.** End with a table: capability | result (pass / fail / not available) | evidence. Rows:
   - skill loaded and bundled files readable
   - web search
   - web fetch of pages
   - sandbox download: logo (Node fetch and curl)
   - sandbox download: landmark (Node fetch and curl)
   - sandbox access to other hosts (company site, Google favicon, Wikimedia API, npm, PyPI, GitHub raw, example.com)
   - PptxGenJS source (preinstalled global or bundled copy)
   - PPTX written, slide count, speaker notes present
   - download link offered to the user
   - PPTX → PDF → PNG rendering (tools found, seconds)
   - image inspection by you
   - proxy environment variables, fonts, Python modules noted
   - any permission prompts, interruptions, or approvals that appeared during this run

   Then paste the full JSON report in a code block.
