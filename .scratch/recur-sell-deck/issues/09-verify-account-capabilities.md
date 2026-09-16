# Verify the selected account's execution and file capabilities

Parent: [Plan a one-prompt Recur sell-deck workflow](../map.md)
Type: task
Labels: wayfinder:task
Mode: AFK where access exists; HITL for account setup only
Status: resolved
Assignee: aaronwood
Blocked by: 03

## Question

Before settling the slide and asset strategy, establish what the intended AI account actually permits. In a small throwaway capability check, verify package installation or upload, web research, downloading a real logo and landmark image, executing the candidate generation library, producing a downloadable PPTX, and the availability of PPTX rendering and image inspection. A tiny sample deck is sufficient; do not build the complete sell-deck workflow for this ticket.

Record the exact host/surface, plan or workspace restrictions where observable, setup steps and effort, interruptions, working capabilities, and unavailable or untested capabilities. If recipient account access is unavailable, distinguish results from the developer's account and provide a precise account-owner checklist. Missing automatic rendering informs the visual/validation decision; do not silently make it a new brief requirement. If capability findings contradict the proposed handoff, reopen the host decision rather than assuming support.

This prerequisite was exposed by [AI environment research](01-research-ai-environments.md) and [PowerPoint pipeline research](02-research-powerpoint-pipeline.md). Its purpose is to unblock the design decision, not deliver the final package.

## Answer

Resolved September 15, 2026, AFK in the developer's account. The recipient's (Recur's) account was not available.

**Verdict:** the chosen handoff holds, with two additions. First, the recipient must set the code sandbox's domain allowlist to **All domains**, because the default blocks every target-asset download. Second, the skill must ship as a single bundled script, because uploads are capped at 200 files. Rendering and image inspection are both available inside a run. The host decision is not reopened; its setup steps are amended in [Choose the supported AI tool and package handoff](03-choose-host-and-package.md).

**Where it was tested.** The claude.ai browser chat on the developer's personal Pro plan, with model Opus 5 High and web search on. Settings as found: code execution and file creation on, network egress on, domain allowlist "Package managers only". A throwaway probe skill was uploaded, and two fresh chats each sent the one-line prompt `Run the Recur capability probe` with no follow-up turns. Run 1 used the default allowlist. Run 2 used the allowlist temporarily set to All domains. Evidence: [probe source and rebuild](../assets/09-capability-probe/README.md), [run 1](../assets/09-capability-probe/run-1-package-managers-only.md), [run 2](../assets/09-capability-probe/run-2-all-domains.md).

**Setup effort.** Customize > Skills > Add > Upload skill > Save. A security scan runs, and the skill is enabled on upload. It takes under a minute once the ZIP is valid. The first ZIP, with a vendored `node_modules` (280 files), was rejected with "Zip contains too many files (maximum 200)". An esbuild single-file bundle (3 files, 190 KB) was accepted.

| Capability | Default allowlist | All domains |
| --- | --- | --- |
| Web search in the chat | works | works |
| Web fetch of pages | partial: logo `<img>` absent from extracted text; cache-only and permission errors on Wikimedia file pages | company site works; logo still absent from extracted text |
| Sandbox download: company site, logo, Wikimedia landmark, Google favicon | blocked, 403 "Host not in allowlist" | works, 200 |
| Sandbox access to npm registry, GitHub raw | works | works |
| PptxGenJS | bundled copy works; a global copy is also preinstalled | same |
| PPTX with speaker notes, offered as a download | works | works |
| LibreOffice PPTX → PDF → PNG | works, 1.5 s | works, 2.0 s |
| Model views rendered slide images | works, and it flagged real layout flaws | works |
| Approval prompts or interruptions | none | none |
| Prompt to final answer | about 3 min | about 2 min |

**Facts later tickets depend on**

- Sandbox: linux/x64, running as root, Node 22.22, no proxy environment variables. Skills mount at `/mnt/skills/plugins/<skill>`. Downloadable files go in `/mnt/user-data/outputs`.
- Installed tools: `soffice`, `pdftoppm`, ImageMagick 6 `convert`, and Python with python-pptx and PIL. Missing: `magick`, `rsvg-convert`, PyMuPDF, and cairosvg. Fonts: Liberation, Carlito, and DejaVu only; there is no Arial or Calibri, so rendered checks use metric-compatible substitutes.
- The target's own logo came as a 225 px WebP, which PptxGenJS cannot place. The Google favicon fallback returned 32 px even though 256 px was requested. The logo URL was found only by fetching the site HTML inside the sandbox, not through web fetch.
- Wikimedia thumbnails: 1280 px and 1920 px widths worked. The model reported that 1600 px returned HTTP 400.
- Headquarters sources conflicted: Wikipedia and the company FAQ say Edmond, while LinkedIn says Oklahoma City. The two runs chose different Oklahoma City landmarks. Run 2 rejected the National Memorial as too somber for a sales cover.

**Untested:** Recur's own account, plan, and admin controls; opening the downloaded PPTX in real PowerPoint; WebP and SVG → PNG conversion in the sandbox; the time and usage of a full nine-slide run.

**Account-owner checklist** (for Recur's account):

1. Check the plan in the account menu. On Team or Enterprise, an owner must allow Skills, code execution and file creation, network egress, and personal skill uploads for the member.
2. In Settings > Capabilities, turn on "Cloud code execution and file creation" and "Allow network egress", and set "Domain allowlist" to **All domains**; the status line then reads "Claude can access all domains on the internet." A fixed domain list cannot cover arbitrary company sites. Anthropic flags broader egress as a security risk, so this is Recur's call.
3. In Customize > Skills > Add > Upload skill, choose the ZIP, click Save, and confirm the skill shows as enabled.
4. Start a new chat with web search on (in the + menu) and send the one-line prompt. Expect a PPTX download card, with no questions asked.

If the organization will not allow All domains, the sandbox cannot download target logos or landmarks. Behavior in that case belongs to [Define unattended generation and failure behavior](07-define-unattended-run.md).

**Cleanup:** the probe skill is disabled, not deleted, in the developer's account. The domain allowlist was left on All domains, pending a manual revert to Package managers only, because automated selection in that settings dropdown failed.
