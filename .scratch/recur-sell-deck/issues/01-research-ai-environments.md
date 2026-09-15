# Establish which familiar AI tools can run the complete workflow

Parent: [Plan a one-prompt Recur sell-deck workflow](../map.md)
Type: research
Labels: wayfinder:research
Mode: AFK
Status: resolved
Assignee: aaronwood (research agent: ai-environments)
Blocked by: none

## Question

Which current, commonly used AI environments can accept a reusable package and a company-name prompt, research the web, obtain image/logo assets, execute presentation-generation code, and return a downloadable PPTX without mid-run human intervention? Compare a small set of plausible environments using official sources, distinguishing chat subscriptions from API/developer products, setup steps, required plans, file/tool/network restrictions, and portability. Establish capabilities and gaps; do not choose a host for the user or assume Recur owns an account. Prioritize options viable within four days.

## Answer

Resolved September 15, 2026 as documentation research. Claude custom skill ZIPs and ChatGPT Work skills/plugins are plausible existing-tool handoffs. Claude explicitly documents ZIP skill upload, executable scripts, and PPTX download; OpenAI documents Work presentation output and reusable skills, with plugin packaging for web/mobile distribution. [Claude skill packaging](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills), [ChatGPT skill packaging](https://learn.chatgpt.com/docs/build-skills).

Neither host is proven to complete this entire task in Recur's account. Network permissions govern actual logo/image downloads separately from web research, and unattended PPTX rendering/visual inspection remains an explicit feasibility gap. Claude's current help page even contradicts itself about Team's default network setting. The next decision is recipient account/surface access followed by a small complete proof, not a host choice based on documentation alone.

Durable findings and primary citations: [Familiar AI environments for the Recur workflow](../research/ai-environments.md).

Research context pointer: isolated Git repository `/private/tmp/recur-ai-environments.47j2ZA`, branch `research/ai-environments`, commit `e11e937356ec8c180ae1cc775a05a9afb34d638a`, file `ai-environments.md`. The durable findings above are the same text. No Git repository was initialized in the main workspace.
