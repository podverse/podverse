# 05 - Verification and Invariants

## Objective

Prove behavior parity and preserve core MetaBoost/bLIP invariants after refactor.

## Required Behavior Matrix

1. MB1 available/supported:
   - MB1 POST (single-send after largest recipient success) runs when enabled
   - bLIP fallback is not used for that submission path
2. MB1 unavailable/unsupported:
   - non-MB1 fallback path works as before
3. Metadata request failure:
   - modal path still works
   - explicit fallback behavior remains as currently defined
4. Mixed recipient success/failure:
   - statuses update correctly
   - success callback behavior unchanged

## Verification Commands

Run from repo root:

```bash
./scripts/nix/with-env npm run lint -w @podverse/v4v-metaboost
./scripts/nix/with-env npm run lint -w @podverse/web
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w @podverse/web
```

## Required Evidence Artifacts

Capture artifacts proving behavior, not only lint/build:

1. MB1 available/supported submission evidence:
   - proof of MB1 ingest POST after successful recipient payment
   - proof that bLIP fallback path was not used for the same submission
2. MB1 unavailable/unsupported submission evidence:
   - proof non-MB1 fallback path executed successfully
3. Metadata request failure evidence:
   - proof modal/fallback behavior matches current contract
4. Mixed-recipient outcome evidence:
   - proof status updates and success callback behavior are unchanged

Recommended artifact format:

- one markdown run log under `.llm/plans/active/boost-flow-readability-refactor/verification-artifacts/`
- include command run, scenario, observed network/events, pass/fail result
- include links or references to screenshots/log snippets where applicable

## Acceptance Criteria

- Verification commands pass.
- Behavior matrix validated with recorded evidence artifacts for each required scenario.
- Refactor is readability-first with no unintended flow changes.
