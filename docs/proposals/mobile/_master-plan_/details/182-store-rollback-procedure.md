# 182-store-rollback-procedure

**Master step:** 22.8
**Model (author + implement):** Auto
**Status:** done

## Scope

Document the **rollback procedure**: mobile stores **cannot un-ship** a release; recovery is to submit
a previous-known-good build as a new version.

## Procedure

1. **Halt rollout** first (pause Play staged rollout / App Store phased release) to stop further
   exposure.
2. Prepare a **new build** from the last-known-good commit (version bumped) — you cannot re-publish an
   old version number.
3. Fast-track submit; account for review latency (177).
4. Communicate to testers if on internal/beta.
5. Post-mortem: capture the regression and add coverage.

## Acceptance criteria

- Procedure states halt-rollout + forward-fix (no true un-ship) and references review buffer (177).

## Verification

- Doc-only.
