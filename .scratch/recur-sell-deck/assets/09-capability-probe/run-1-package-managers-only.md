# Run 1: default egress ("Package managers only")

- Date: September 15, 2026, sent 17:01:28 EDT; about 3 minutes to final answer; probe script itself 3.4 s.
- Account: developer's personal claude.ai, Pro plan. Surface: claude.ai browser chat, model Opus 5 High, web search on, Research off, memory on.
- Settings observed: Cloud code execution and file creation on; Allow network egress on; Domain allowlist "Package managers only", no additional domains.
- Skill: `recur-capability-probe` uploaded via Customize > Skills > Add > Upload skill; id `skill_01FUE9dLH5hy1ferCtxzLjeR`; mounted at `/mnt/skills/plugins/recur-capability-probe` (writable).
- Chat: `https://claude.ai/chat/b800514b-bcf2-47f1-a997-6403e6c3f93e`. Prompt: "Run the Recur capability probe". No user turns after the prompt.

## Upload constraint

First ZIP (vendored `node_modules`, 280 files, 1.4 MB) rejected on save: "Zip contains too many files (maximum 200)". Single-file esbuild bundle (3 files, 190 KB) accepted; security scan passed.

## Sandbox

| Item | Observed |
| --- | --- |
| Runtime | linux/x64, root, Node v22.22.2, cwd `/home/claude`, no proxy env vars |
| Output dir | `/mnt/user-data/outputs` (files there offered as downloads via present_files) |
| Rendering tools | `/usr/bin/soffice`, `/usr/bin/libreoffice`, `/usr/bin/pdftoppm`, `/usr/bin/convert` (ImageMagick 6); no `magick`, no `rsvg-convert` |
| Python | python3 with `pptx` and `PIL`; no `fitz`, no `cairosvg` |
| Fonts | Liberation Sans/Serif/Mono, Carlito, DejaVu |
| PptxGenJS | bundled copy loaded; a global copy also preinstalled at `/home/claude/.npm-global/lib/node_modules` |

## Network from the sandbox (Node fetch and curl agreed)

| Host | Result |
| --- | --- |
| www.usfleettracking.com logo SVG, usfleettracking.com | 403 "Host not in allowlist" |
| upload.wikimedia.org landmark thumb, commons.wikimedia.org API | 403 |
| www.google.com favicon service | 403 |
| example.com | 403 |
| registry.npmjs.org | 200 |
| raw.githubusercontent.com | 200 |
| pypi.org | reachable (404 was the probe's wrong package path) |

## Deck and verification

- PPTX written: 100,564 bytes; re-opened with 4 slides, 4 notes slides, 2 media (fallbacks: no downloaded images).
- LibreOffice PPTX → PDF → pdftoppm PNG: 1.5 s, 4 PNGs.
- Model viewed all 4 PNGs and described them; it caught the rotated vertical-axis label overlapping the horizontal axis line on the map slide.

## Chat-side research

- Web search: pass (3 queries). HQ resolved as Edmond, OK (Wikipedia, ZoomInfo street address) despite LinkedIn saying Oklahoma City.
- Web fetch: partial. Worked for the company site and Wikipedia; "cache-only" errors on Wikimedia file pages; PERMISSIONS_ERROR for a URL not previously surfaced in results; the header logo `<img>` was absent from the fetched page text, so no logo URL was found. The model substituted a sub-brand (ServApp) SVG and flagged it; it built the Commons thumbnail URL from the filename MD5 but could not confirm it.
