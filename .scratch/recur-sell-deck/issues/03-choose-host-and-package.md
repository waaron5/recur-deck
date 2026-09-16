# Choose the supported AI tool and package handoff

Parent: [Plan a one-prompt Recur sell-deck workflow](../map.md)
Type: grilling
Labels: wayfinder:grilling
Mode: HITL
Status: resolved
Assignee: aaronwood
Blocked by: 01

## Question

Which single primary AI environment will Recur use, and what exactly will they receive and do to start their first run? Decide acceptable setup effort, account/capability assumptions, installation or upload format, and whether any secondary-host support is necessary for this submission. Use capability research and the user's knowledge of Recur; do not interpret “a tool they already use” as proof of access to a specific product.

## Answer

Resolved September 15, 2026 with the user in a live decision exchange.

The supported host is Claude's browser chat with a custom skill uploaded as a ZIP. The submission promises no secondary-host support. Recur receives:

- `recur-sell-deck.zip`, containing one top-level `recur-sell-deck/` skill folder;
- a short installation and usage guide outside the ZIP; and
- the example nine-slide PowerPoint produced by the packaged workflow.

The skill folder contains `SKILL.md`, deterministic JavaScript generation and validation scripts, compact reference documents for research/content/visual rules, the Recur logo, and the supplied PNGs for fixed slides 4–9. The generator uses PptxGenJS so the workflow has one implementation runtime. Claude supplies researched company facts and investment judgments as bounded structured input; the bundled code constructs and validates the deck. The package must not depend on this repository, a local runtime, an external server, or recipient API credentials.

Recipient setup is a one-time browser operation intended to take under ten minutes: enable Code execution and file creation, open Customize > Skills, upload the ZIP, enable the skill, then start a fresh chat with `Create a Recur sell deck for [company]`. Team or Enterprise administration may need to enable Skills, code execution, personal skill uploads, and the relevant role capability.

This decision assumes the intended Claude account can execute bundled scripts and create a downloadable PPTX. Direct acquisition of a real target-company logo and headquarters landmark also requires suitable web-search and sandbox network access. Those assumptions are not treated as proven: [Verify the selected account's execution and file capabilities](09-verify-account-capabilities.md) must test them before the layout and asset strategy is settled. Package-manager access alone does not establish arbitrary image-host access.

Official basis: [custom skill authoring and ZIP structure](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills), [browser installation and account prerequisites](https://support.claude.com/en/articles/12512180-use-skills-in-claude), [code execution, downloadable PPTX files, and network controls](https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude), and [Anthropic's PowerPoint skill](https://github.com/anthropics/skills/blob/main/skills/pptx/SKILL.md).

Amended September 15, 2026 by [Verify the selected account's execution and file capabilities](09-verify-account-capabilities.md). Recipient setup must also set Settings > Capabilities > Domain allowlist to **All domains**; the default, "Package managers only", blocks every logo and landmark download. The skill ZIP may hold at most 200 files, so the JavaScript ships as one bundled script instead of a vendored `node_modules`.
