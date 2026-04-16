# 05 - Tests and Docs

## Objective

Close out rollout with reliable automated coverage and clear operational docs.

## Test Workstreams

1. Parser-mapping tests
   - Channel-level `metaBoost` mapping success case.
   - Missing/invalid tag fallback case.
   - Legacy non-MetaBoost behavior unchanged.
2. Web boost flow tests
   - MB1 branch exercised when supported metadata present.
   - fallback branch for absent/unsupported metadata.
   - BTC-only guard behavior verified.
3. Donation flow tests
   - env config absent/present/invalid cases.
   - no regressions to current donation boosts.

## Suggested Test Locations

- `packages/parser-mapping/src/**/__tests__/`
- `apps/web/src/components/Boost/hooks/**/__tests__/`
- `apps/web/src/components/Boost/**/__tests__/`

## Verification Commands

Run from monorepo root:

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/web
```

Add targeted test commands in implementation PR based on touched suites.

## Documentation Updates

1. Update web env docs:
   - `apps/web/ENV.md`
2. Update MetaBoost/V4V flow docs:
   - `docs/v4v/bitcoin/lnd/V4V-METABOOST-FLOW.md`
   - `docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md`
3. Note BTC-only execution guard and future-standard extension strategy.

## Acceptance Criteria

- New behavior covered by tests at parser-mapping + web integration boundaries.
- Env/runtime docs explain donation special-case setup.
- Rollout notes clearly explain fallback behavior when MetaBoost absent/unsupported.
