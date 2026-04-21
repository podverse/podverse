# Phase 4: Tests and Verification

## Objective

Add targeted automated coverage for the newly hardened response handling paths and missing mb-v1 capability tests.

## Files

- `packages/v4v-metaboost/src/mbV1FetchCapability.test.ts` (new)
- `packages/v4v-metaboost/src/mbrssV1FetchCapability.test.ts` (update if parser policy changes)
- `apps/web/src/components/Boost/payments/mbrssV1/*` tests (new or updated)
- `apps/web/src/components/Boost/payments/mbV1/*` tests (new or updated)
- Any boost hook/form tests introduced for `useBoostPayments`

## Test Matrix

1. Capability GET:
   - 200 + valid mb-v1 payload.
   - non-OK status.
   - invalid terms URL.
   - optional threshold field invalid (assert policy behavior).
2. Metadata POST:
   - `sender_blocked` response code mapping.
   - `owner_terms_not_accepted_current` mapping.
   - generic 4xx/5xx unknown code behavior.
   - invalid success body (missing `message_guid`).
3. Submit lifecycle:
   - submit loading state always clears.
   - success callback not triggered when metadata ingest fails.

## Verification Commands

Run from repo root with Nix wrapper:

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run test -w packages/v4v-metaboost
```

If web tests are added in this phase, include their exact workspace command in the implementation PR notes.

## Acceptance Criteria

- New/updated tests fail before fixes and pass after fixes.
- mb-v1 capability parser and fetch behavior are explicitly covered.
- Regression protection exists for known Metaboost ingest error codes.
