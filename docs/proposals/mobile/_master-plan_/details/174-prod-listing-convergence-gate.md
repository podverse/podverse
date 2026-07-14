# 174-prod-listing-convergence-gate

**Master step:** 4.25
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Record decision gate: when/how to migrate from `com.podverse.app.next` to production Podverse
  listing (or replace).
- **Do not execute migration in PG-3** — document criteria only (feature parity, store review plan,
  dual-app coexistence period).

## Architecture notes

- Convergence is Track 22 / PG-12 adjacent; this step only writes the gate criteria.
- Until gate fires, all CI must stay on `.next`.

## Acceptance criteria

- Gate criteria documented in runbook
- Explicit "not now" — no id change in app.config

## Verification

```bash
rg -n 'convergence|\\.next|production listing' docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md
```
