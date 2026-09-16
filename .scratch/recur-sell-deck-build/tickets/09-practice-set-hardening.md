# 09: Practice-set hardening pass

**What to build:** The workflow is tuned against real companies until it holds up, using only the practice set — US Fleet Tracking plus the ten logo-trial companies. The release set is never run here; it exists to test a workflow that was not shaped around it.

Each practice run is judged the way a release run will be: opened in real PowerPoint, checked against the critical-defect list, with facts and competitor choices spot-checked against the sources in the speaker notes. Recurring quality notes are treated as workflow fixes, not as acceptable noise — a generic bullet that keeps appearing means the writing rules or the research brief need work.

The thresholds left open by earlier tickets are settled here against real output: the sharpness threshold that decides when a logo becomes a text wordmark, slide 2's type sizes against the render, stage timings within the run budget, and how broadly the second competitor search should reach. Runs are also timed, since typical runs should come in around ten minutes.

Decisions this implements: the practice-set rule in [Choose the demonstration and fresh-user validation plan](../../recur-sell-deck/issues/08-define-submission-validation.md), and the release-judgment method in [Define first-try success and the release bar](../../recur-sell-deck/issues/04-define-first-try-success.md).

**Blocked by:** 08 (Unattended orchestration and failure behavior).

**Status:** ready-for-agent

- [ ] Every practice-set company has been run end to end on the packaged ZIP and judged in real PowerPoint against the critical-defect list.
- [ ] Facts and competitor choices are spot-checked against each run's speaker notes, and any mismatch is fixed in the workflow.
- [ ] Recurring quality notes are fixed in the workflow rather than accepted.
- [ ] The sharpness threshold, slide 2 type sizes, stage timings, and competitor search breadth are set from observed output and recorded.
- [ ] Typical run time sits around ten minutes, and no practice run exceeds fifteen.
- [ ] No release-set company has been run.
