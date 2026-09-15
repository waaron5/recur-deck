# Familiar AI environments for the Recur workflow

Researched September 15, 2026. This is documentation research, not an end-to-end validation or a host selection.

## Finding

Two plausible handoff surfaces are **Claude with a custom skill ZIP** and **ChatGPT Work with a skill/plugin**. Both document reusable workflows and presentation creation. Neither documentation set establishes that Recur's particular account can complete research, acquire arbitrary company logos, render the resulting PPTX, inspect it, and return it without interruption. The next decision needs actual account access, followed by a small complete run.

## Claude: custom skill ZIP

- **Packaging:** A skill can contain instructions, reference assets, and executable Python or JavaScript/Node code. Package the containing skill folder in a ZIP and upload/enable it under Customize > Skills. This directly fits a bundle containing Recur's fixed slides and a renderer. [Custom skill authoring](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills).
- **Plans/setup:** The current help page lists skills on Free, Pro, Max, Team, and Enterprise; code execution must be enabled. Team/Enterprise organizational controls can prevent personal skill uploads or disable capabilities. A recipient therefore needs permission to enable the skill, not merely a Claude login. [Use skills](https://support.claude.com/en/articles/12512180-use-skills-in-claude).
- **Research:** Web search and page fetching are documented; Team/Enterprise owners must enable web search before members can switch it on in a chat. [Web search](https://support.claude.com/en/articles/10684626-enable-and-use-web-search).
- **Execution/output:** Claude documents Python/JavaScript execution and downloadable PPTX creation. The documented file limit is 30 MB per upload/download. This is a chat capability, with usage charged against the account's plan limits. [File creation](https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude).
- **Asset acquisition caveat:** Network egress can be disabled, package-manager-only, domain-allowlisted, or broader. Web search working does not prove the code runtime can download a logo image. The same help page contradicts itself about the Team default (disabled in Availability; enabled for package managers in Getting started), so inspect actual settings. It does not establish arbitrary image-domain access for every individual plan. [Network settings](https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude).
- **Rendering unknown:** Downloadable PPTX support is not proof that LibreOffice, another PPTX renderer, or an image-review tool is usable by the agent in the recipient's session. Demonstrate this explicitly.

## ChatGPT Work: skill or plugin

This is the official product name in the current documentation; it is not a claim that an ordinary custom GPT has identical capabilities.

- **Packaging:** Skills package instructions, resources, and optional scripts. Standalone skills are documented for the ChatGPT desktop app, Codex CLI, and IDE extension. Skills bundled as plugins are documented across Chat and Work on web, desktop, and mobile. For broad recipient installation, OpenAI directs authors to package skills as a plugin. Thus a Claude skill ZIP is not, by itself, a documented equivalent web installation method. [Build skills](https://learn.chatgpt.com/docs/build-skills).
- **Account access:** Pricing currently lists Work and Codex as included in Free, Go, Plus, Pro, Business, Edu, and Enterprise plans, sharing usage. This does not establish sufficient quota or effective feature access in Recur's workspace. [Pricing](https://learn.chatgpt.com/docs/pricing).
- **Work/output:** Work can use files and approved tools to research and produce finished files. Its getting-started page demonstrates PPTX output; the file guide documents downloading generated presentations from Work on the web. Desktop has presentation previews. [Get started](https://learn.chatgpt.com/docs/get-started-with-work), [Work with files](https://learn.chatgpt.com/docs/artifacts-viewer).
- **Execution/assets:** Work Cloud uses hosted execution; browser, web search, connected apps, and code/shell networking have separate controls. Shell public-internet access may be restricted. Plugin installation does not itself grant underlying tools, account connections, or permissions. Some actions can still trigger confirmation. [Work Cloud controls](https://learn.chatgpt.com/docs/enterprise/chatgpt-work-cloud-security).
- **Remaining setup unknowns:** Verify private plugin installation/distribution in the recipient's actual surface, the available Python/Node packages, image-domain downloads, and effective permissions. This research did not establish a universal upload-only installation route for Work on the web.
- **Rendering unknown:** OpenAI documents a presentation preview and shows an example reporting local render checks, but does not specify a universally available unattended PPTX-to-images interface. Verify the agent's ability to render and inspect all slides rather than equating a human preview pane with an automated check. [Work with files](https://learn.chatgpt.com/docs/artifacts-viewer).

## Developer surfaces and portability

Codex CLI is a fallback for a team already comfortable with local tools: it loads skills from filesystem directories and creates local files, but has no built-in visual preview UI. The recipient would need the package, runtime dependencies, permissions, and a suitable renderer installed. This is more setup to prove than using an existing enabled chat surface. [Skill locations](https://learn.chatgpt.com/docs/build-skills), [CLI file handling](https://learn.chatgpt.com/docs/artifacts-viewer).

Do not treat the Claude API as interchangeable with Claude chat: its skill runtime explicitly lacks network access and runtime package installation. An API implementation would need separate orchestration for external asset acquisition. [API skill constraints](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview). That developer integration is additional work; it is not necessary to establish the initial chat-host choice.

**Recommendation, not a settled decision:** Prefer whichever documented chat surface Recur already has enabled. Claude offers the clearest documented direct ZIP handoff; ChatGPT Work merits an equal feasibility check if that is their existing tool. Keep core instructions, assets, and generation code portable, but validate only the selected host before promising support for others.

## Minimal proof before committing to a host

In the actual intended account, install the proposed package once, then issue one company-name prompt. It must research the company, download a real logo and headquarters landmark image, run the packaged generator, render the PPTX to inspect slides, repair a deliberately detectable layout issue if needed, and return a usable download without a user follow-up. Record setup time, interruptions, output size, runtime, and tool availability. This is a proposed feasibility experiment, not a new requirement imposed on the user.

Neither option establishes first-try investment judgment or professional visual quality by documentation alone.

