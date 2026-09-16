# 01: Skill package skeleton that delivers a nine-slide deck

**What to build:** Someone installs the workflow package in Claude's browser chat, starts a fresh chat, and sends `Create a Recur sell deck for US Fleet Tracking`. With no further turns they get a download card for a nine-slide PPTX that opens in real PowerPoint. Slides 4–9 are the six supplied reference PNGs, full-bleed and in order. Slides 1–3 are placeholders with the right page geometry and empty speaker notes; their real content arrives in later tickets.

This ticket sets the shape of the package everything else is built inside: the skill folder with its instructions, one bundled generation script, the reference documents, and the fixed Recur assets. The build step that produces the uploadable ZIP lives in this repo and the ZIP it produces depends on nothing outside itself — no repository checkout, no local runtime, no external server, no recipient credentials. The 200-file upload cap is the reason generation ships as a single bundled script rather than a vendored dependency tree.

Decisions this implements: [Choose the supported AI tool and package handoff](../../recur-sell-deck/issues/03-choose-host-and-package.md), [Verify the selected account's execution and file capabilities](../../recur-sell-deck/issues/09-verify-account-capabilities.md), and the rendering approach in [Choose the slide layouts and asset strategy](../../recur-sell-deck/issues/06-prototype-slide-and-asset-strategy.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A repeatable build step in this repo produces the uploadable ZIP with one top-level skill folder, and the ZIP holds at most 200 files.
- [ ] The ZIP uploads through Customize > Skills, passes the security scan, and shows as enabled.
- [ ] One prompt in a fresh chat, with no user turns after it, ends in a download card for a PPTX.
- [ ] The file has exactly nine slides, opens in real PowerPoint, and slides 4–9 are the supplied reference PNGs in order.
- [ ] Generation runs entirely from the bundled script inside the sandbox, with no package installs at run time.
- [ ] Placeholder slides 1–3 carry speaker notes fields, so later tickets have somewhere to write the source record.
