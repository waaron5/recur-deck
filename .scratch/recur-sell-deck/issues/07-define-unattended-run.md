# Define unattended generation and failure behavior

Parent: [Plan a one-prompt Recur sell-deck workflow](../map.md)
Type: grilling
Labels: wayfinder:grilling
Mode: HITL
Status: open
Assignee: unassigned
Blocked by: 03, 04, 05, 06

## Question

How should one company-name prompt proceed from company identification through research, asset collection, slide generation, and validation to file delivery without human intervention? Resolve ambiguous company names, unavailable sources or logos, insufficient evidence, overflow, bounded automatic repair, and terminal failure behavior. Preserve the required output standard rather than silently substituting invented facts or missing required elements. Decide which parts the model judges and which parts deterministic code enforces.

Constraints from [Define the evidence and investment judgment behind each pitch](05-define-investment-judgment.md): deterministic validation code is required and already owns the countable writing rules (word counts, banned terms, punctuation, unsourced digits, name spelling) and speaker-notes completeness, with the model judging tone, the swap test, and claim-to-source fidelity. This ticket still decides the repair limit, the order of checks, and what happens when evidence cannot establish what the company sells and to whom.
