# Recur Founder Outreach

Recur approaches software business founders with a tailored introduction to its investment perspective and partnership proposition.

## Language

**Target company**:
A software business being considered for acquisition or partnership by Recur, whose founder is the intended recipient of a sell deck.
_Avoid_: Customer, prospect account

**Sell deck**:
A presentation from Recur to a target company's founder that explains Recur's interest, the market opportunity, and Recur's credentials. It supports a first-touch physical mailing campaign.
_Avoid_: Fundraising deck, product sales deck

**Thesis page**:
The company-specific argument expressed through “why we're here,” “why we're excited,” and “how we can help,” each with a header and two bullets.

**Market map**:
A view of a target company's competitive landscape whose axes, competitor selection, placements, subtitle, and commentary express an investment judgment.

**Company fact**:
A statement about the target company's product, customers, or business that a cited source supports. Only company facts may describe what the target company is or does.
_Avoid_: Insight, observation

**Recur proposal**:
A statement of how Recur would help the target company, phrased as an offer drawn from Recur's go-to-market, product, payments, and AI strengths. It never asserts an unsupported weakness of the target company.
_Avoid_: Recommendation, gap

**Source record**:
The evidence behind one run's sell deck: the sources for each company fact, the reasoning for each competitor and placement on the market map, and any assumption made to identify the target company. It is kept off the visible slides.
_Avoid_: Bibliography, citations

**Covered target**:
A target company within the workflow's reliability promise: a private software business, in any vertical, with an official website and a determinable headquarters city. Other target companies receive best-effort runs.
_Avoid_: Supported company, any company

**Run**:
One company-name prompt through to one delivered sell deck, with no user message in between. The workflow's own checks and bounded repairs happen inside a run; a clarifying question to the user ends it as a failure.
_Avoid_: Attempt, try, iteration

**Critical defect**:
A flaw that makes a sell deck unusable and fails its run: wrong or invented company facts, a logo belonging to another company, a nonexistent or non-competing competitor, a missing required element, overflowing or illegible text, a wrong slide count or order, or a missing or unopenable file. Other shortcomings are quality notes.
_Avoid_: Bug, error

**Quality note**:
A shortcoming in a sell deck that does not make it unusable, such as a generic bullet, a weak landmark, or a debatable axis. Quality notes do not fail a run.

**Submission example**:
The single sell deck sent to Recur alongside the workflow package; it must be free of critical defects and quality notes.
_Avoid_: Sample output, demo deck

**Text wordmark**:
A company's name set deliberately in clean text where its logo image would appear, used when no usable logo image is obtainable.
_Avoid_: Placeholder, broken logo

**Recur introduction**:
The reusable section of the sell deck presenting Recur's identity, team, experience, backing, and values; represented by slides 4–9 of the reference presentation.

**Supported host**:
Claude's chat product with a Recur sell-deck custom skill installed from a ZIP. This is the single environment the packaged workflow promises to support for the case-study submission.
_Avoid_: Claude API, generic AI tool, multi-host workflow

**Workflow package**:
The browser-uploadable Recur sell-deck custom-skill ZIP, containing its instructions, deterministic deck-generation code, validation code, reference rules, and fixed Recur assets. The handoff also includes a short installation guide and an example sell deck.
_Avoid_: Source repository, hosted application, API integration
