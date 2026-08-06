# 177-store-review-buffer

**Master step:** 22.3
**Model (author + implement):** Auto
**Status:** done

## Scope

Document the **store review latency buffer** to plan into release schedules (Apple / Google approval
can take days and may reject).

## Guidance

- Assume **1–3+ business days** for App Store review; Play review is usually faster but variable.
- Submit betas with buffer before any target date; do not schedule marketing to an unapproved build.
- Expedited review is exceptional — do not plan around it.
- Because of the **publish hold**, review submission does not begin until operator manual polish is
  complete; factor review time **after** that milestone.

## Acceptance criteria

- Release scheduling accounts for review latency and possible rejection re-submits.

## Verification

- Doc-only.
